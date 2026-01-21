const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const ffmpegPath = path.join(__dirname, '../../node_modules/ffmpeg-static/ffmpeg.exe');

// yt-dlp binary yolu
const ytdlpPath = path.join(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp.exe');

module.exports = {
    name: "p",
    aliases: ["play", "oynat"],
    description: "Şarkı çalar (yt-dlp + Kuyruk).",
    run: async (message, args, client) => {
        try {
            if (!args.length)
                return message.reply("Bir şarkı adı veya bağlantısı yaz.");

            const voice = message.member.voice.channel;
            if (!voice)
                return message.reply("Şarkı çalmak için bir ses kanalına gir.");

            const permissions = voice.permissionsFor(message.client.user);
            if (!permissions.has("Connect") || !permissions.has("Speak")) {
                return message.reply("❌ Kanala katılmak veya konuşmak için yetkim yok!");
            }

            // Seek parametresini ayıkla
            let seek = 0;
            const seekArg = args.find(a => a.startsWith('--seek='));
            if (seekArg) {
                seek = parseInt(seekArg.split('=')[1]);
                args = args.filter(a => a !== seekArg);
            }

            // Query oluştur ve tırnak işaretlerini temizle (Beam için gerekli)
            let query = args.join(" ").replace(/^"|"$/g, '').trim();
            console.log(`[CMD] P başlatıldı: ${query}`);

            if (message.guild.searchMsg) { try { message.guild.searchMsg.delete(); } catch (e) { } }
            message.guild.searchMsg = await message.channel.send(`🔍 Aranıyor: **${query}**...`);

            let videoUrl;
            let videoTitle;
            let thumbnail;
            let playlistTracks = [];

            // YouTube linki mi kontrol et
            if (query.includes('youtube.com') || query.includes('youtu.be')) {
                // Playlist mi kontrol et
                if (query.includes('list=')) {
                    try {
                        const playlist = await play.playlist_info(query, { incomplete: true });
                        const videos = await playlist.all_videos();

                        if (videos && videos.length > 0) {
                            playlistTracks = videos.map(v => ({
                                url: v.url,
                                title: v.title,
                                thumbnail: v.thumbnails[0]?.url || "",
                                requester: message.author.tag
                            }));

                            videoUrl = playlistTracks[0].url;
                            videoTitle = playlistTracks[0].title;
                            thumbnail = playlistTracks[0].thumbnail;

                            console.log(`[PLAYLIST] Detected! Songs: ${playlistTracks.length}`);
                        } else {
                            console.log("[PLAYLIST] list= found but all_videos() returned empty.");
                        }
                    } catch (e) {
                        console.error("[PLAYLIST_ERR]", e);
                        message.channel.send("⚠️ Oynatma listesi yüklenemedi, tekli şarkı olarak devam ediliyor.");
                    }
                }

                if (!playlistTracks.length) {
                    const info = await play.video_basic_info(query);
                    videoUrl = info.video_details.url;
                    videoTitle = info.video_details.title;
                    thumbnail = info.video_details.thumbnails[0].url;
                }
            } else {
                const searchResult = await play.search(query, { limit: 1 });
                if (!searchResult || searchResult.length === 0) {
                    return message.channel.send("❌ Sonuç bulunamadı.");
                }
                videoUrl = searchResult[0].url;
                videoTitle = searchResult[0].title;
                thumbnail = searchResult[0].thumbnails[0].url;
            }

            // Guild verilerini al veya oluştur
            let guildData = client.müzik.get(message.guild.id);
            if (!guildData) {
                guildData = {
                    queue: [],
                    player: createAudioPlayer(),
                    connection: null,
                    textChannel: message.channel.id,
                    disconnectTimer: null
                };
                client.müzik.set(message.guild.id, guildData);

                // Player hata yakalayıcı
                guildData.player.on('error', error => {
                    console.error('[PLAYER_ERROR]', error.message);
                    // Seek sırasında hata olursa şarkıyı geçme, sadece logla (veya tekrar dene)
                    if (guildData.isSeeking) {
                        console.log("[PLAYER] Seek sırasında hata oluştu, şarkı atlanmıyor.");
                        return;
                    }
                    message.channel.send(`❌ Çalma hatası: ${error.message}`);
                    playNext(message.guild.id, client);
                });

                // Şarkı bitince sonrakine geç (OPTIMIZED)
                guildData.player.on(AudioPlayerStatus.Idle, () => {
                    if (guildData.isSeeking) return;
                    playNext(message.guild.id, client);
                });
            }

            const wasEmpty = guildData.queue.length === 0;

            // Kuyruğa ekle
            if (playlistTracks.length > 0) {
                // playlistTracks'in tamamını ekleyelim
                guildData.queue.push(...playlistTracks);
                message.channel.send(`✅ Oynatma listesi eklendi: **${playlistTracks.length}** şarkı sıraya alındı.`);
            } else {
                guildData.queue.push({
                    url: videoUrl,
                    title: videoTitle,
                    thumbnail: thumbnail,
                    requester: message.author.tag
                });
                if (!wasEmpty) {
                    message.channel.send(`✅ Kuyruğa eklendi: **${videoTitle}** (Sıra: ${guildData.queue.length - 1})`);
                }
            }

            // Ses kanalına bağlan (eğer bağlı değilse)
            if (!guildData.connection) {
                const connection = joinVoiceChannel({
                    channelId: voice.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: true
                });

                guildData.connection = connection;

                try {
                    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                } catch (e) {
                    connection.destroy();
                    client.müzik.delete(message.guild.id);
                    return message.channel.send("❌ Ses kanalına bağlanılamadı.");
                }

                connection.subscribe(guildData.player);
            }

            // Eğer kuyruk daha önce boş idiyse hemen oynat
            if (wasEmpty && guildData.queue.length > 0) {
                if (message.guild.searchMsg) { try { message.guild.searchMsg.delete(); message.guild.searchMsg = null; } catch (e) { } }
                playNext(message.guild.id, client, true, seek);
            }

        } catch (error) {
            console.error("P HATASI:", error);
            message.channel.send(`❌ Hata: ${error.message}`);
        }
    },
    playNext: playNext
};

// Sıradaki şarkıyı çalma fonksiyonu
async function playNext(guildId, client, isNew = false, seekTime = 0) {
    const guildData = client.müzik.get(guildId);
    if (!guildData) return;

    // SEEK BAŞLANGICI: Idle eventini bloke et
    if (seekTime > 0) {
        guildData.isSeeking = true;
    } else {
        guildData.isSeeking = false;
    }

    // Eğer yeni bir şarkı eklenmediyse (yani şarkı bittiyse), eski şarkıyı kuyruktan sil
    // (Ancak seek yapıyorsak silme!)
    if (!isNew && seekTime === 0 && guildData.queue.length > 0) {
        guildData.queue.shift();
    }

    if (guildData.queue.length === 0) {
        // Eğer zaten bekliyorsak işlem yapma
        if (guildData.disconnectTimer) return;

        // 60 Saniye Bekleme Süresi Başlat
        console.log(`[PLAYER] Kuyruk boş, 60sn bekleme süresi başladı.`);
        guildData.disconnectTimer = setTimeout(() => {
            if (guildData.queue.length === 0 && guildData.connection) {
                console.log(`[PLAYER] 60sn doldu, çıkış yapılıyor.`);
                guildData.connection.destroy();
                client.müzik.delete(guildId);
            } else {
                guildData.disconnectTimer = null;
            }
        }, 60_000);

        return;
    }

    // Şarkı varsa timeout'u temizle
    if (guildData.disconnectTimer) {
        clearTimeout(guildData.disconnectTimer);
        guildData.disconnectTimer = null;
    }

    const song = guildData.queue[0];

    // DASHBOARD DATA
    console.log("DASHBOARD_DATA:" + JSON.stringify({
        type: "song",
        name: song.title,
        uploader: song.requester,
        thumbnail: song.thumbnail
    }));

    // DISCORD NOTIFICATION (Modern Card)
    // Sadece şarkı en baştan başlıyorsa (seekTime == 0) bildirim at.
    if (seekTime === 0) {
        try {
            const channel = client.channels.cache.get(guildData.textChannel);
            if (channel) {
                if (guildData.lastNp) { try { guildData.lastNp.delete(); } catch (e) { } }

                const embed = new EmbedBuilder()
                    .setTitle("🎵 Şimdi Çalıyor")
                    .setDescription(`**[${song.title}](${song.url})**`)
                    .setThumbnail(song.thumbnail)
                    .addFields({ name: "👤 İsteyen", value: song.requester, inline: true })
                    .setColor(0x5865F2)
                    .setFooter({ text: "RMusic Ultra Pro Max", iconURL: client.user.displayAvatarURL() });

                guildData.lastNp = await channel.send({ embeds: [embed] });
            }
        } catch (e) { }
    }

    // FFmpeg Filtreleri
    let audioFilters = [];
    if (client.filters["8d"]) audioFilters.push("apulsator=hz=0.125");
    if (client.filters["bassboost"]) audioFilters.push("bass=g=15:f=110:w=0.5");
    if (client.filters["nightcore"]) audioFilters.push("atempo=1.25,asetrate=44100*1.25");

    // Equalizer (10-Band)
    // ffmpeg equalizer=f=freq:width_type=h:w=width:g=gain
    const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    client.equalizer.forEach((gain, i) => {
        if (gain !== 0) audioFilters.push(`equalizer=f=${freqs[i]}:width_type=h:w=1:g=${gain}`);
    });

    const ytdlpArgs = [
        song.url,
        '-f', 'ba*[vcodec=none]/bestaudio/best',
        '-o', '-',
        '--quiet',
        '--no-warnings',
        '--buffer-size', '2M',
        '--no-part',
        '--no-cache-dir',
        '--socket-timeout', '10'
    ];

    const ytdlp = spawn(ytdlpPath, ytdlpArgs, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

    ytdlp.stderr.on('data', (data) => {
        console.error(`[YTDLP-ERR] ${data.toString()}`);
    });

    let ffmpegArgs = [];

    // Seeking: Eğer saniye belirtilmişse girişten önce ekle (HIZLI SEEK)
    if (seekTime > 0) {
        ffmpegArgs.push('-ss', seekTime.toString());
    }

    ffmpegArgs.push(
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', 'pipe:0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2'
    );
    if (audioFilters.length > 0) {
        ffmpegArgs.push('-af', audioFilters.join(','));
    }
    ffmpegArgs.push('pipe:1');

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    ffmpeg.stderr.on('data', (data) => {
        const str = data.toString();
        if (!str.includes('frame=') && !str.includes('size=')) { // Gürültüyü azalt
            console.error(`[FFMPEG-ERR] ${str}`);
        }
    });

    // ROBUST PIPE HANDLING
    // Prevent "write EOF" if ffmpeg dies early
    ytdlp.stdout.on('error', (err) => {
        if (err.code !== 'EPIPE') console.error(`[YTDLP] Stream Error: ${err.message}`);
    });

    ffmpeg.stdin.on('error', (err) => {
        if (err.code !== 'EPIPE') console.error(`[FFMPEG] Stdin Error: ${err.message}`);
    });

    ffmpeg.stdout.on('error', (err) => {
        console.error(`[FFMPEG] Stdout Error: ${err.message}`);
    });

    // Pipe yt-dlp to ffmpeg with error handling
    ytdlp.stdout.pipe(ffmpeg.stdin).on('error', (e) => {
        // Suppress pipe errors
    });

    // Process Lifecycle Management
    if (guildData.currentProcess) {
        try { guildData.currentProcess.ytdlp.kill(); } catch (e) { }
        try { guildData.currentProcess.ffmpeg.kill(); } catch (e) { }
    }
    guildData.currentProcess = { ytdlp, ffmpeg };

    const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true
    });

    const vol = client.globalVolume || 100;
    resource.volume.setVolume(vol / 100);

    guildData.resource = resource;
    guildData.resourceStartTime = Date.now(); // Başlangıç zamanını kaydet
    guildData.currentSeekTime = seekTime; // Bu stream kaçıncı saniyeden başladı

    guildData.player.play(resource);

    // SEEK BİTİŞİ: Güvenli süre sonra bayrağı kaldır
    if (seekTime > 0) {
        setTimeout(() => {
            if (guildData.isSeeking) {
                guildData.isSeeking = false;
                console.log("[PLAYER] Seek modu kapatıldı.");
            }
        }, 2000);
    }
}
