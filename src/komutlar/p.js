const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const ytdlpPath = process.platform === 'win32'
    ? path.join(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp.exe')
    : path.join(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp');

const ytdl = require('@distube/ytdl-core');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');

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
                                url: v.url || v.link,
                                title: v.title || "Unknown Title",
                                thumbnail: v.thumbnails?.[0]?.url || "",
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
                    videoUrl = info.video_details.url || info.video_details.link;
                    videoTitle = info.video_details.title;
                    thumbnail = info.video_details.thumbnails?.[0]?.url || "";
                }
            } else {
                const searchResult = await play.search(query, { limit: 1 });
                if (!searchResult || searchResult.length === 0) {
                    if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }
                    return message.channel.send("❌ Sonuç bulunamadı.");
                }
                videoUrl = searchResult[0].url || searchResult[0].link;
                videoTitle = searchResult[0].title || "Unknown Title";
                thumbnail = searchResult[0].thumbnails?.[0]?.url || "";

                if (!videoUrl) {
                    if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }
                    return message.channel.send("❌ Geçerli bir video URL'si bulunamadı.");
                }
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
    if (!song) {
        console.log("[PLAYER] Kuyrukta şarkı bulunamadı.");
        return;
    }

    const songUrl = song.url || song.link;
    console.log(`[PLAYER] Çalmaya hazırlanıyor: ${song.title} | URL: ${songUrl}`);

    if (!songUrl || typeof songUrl !== 'string' || !songUrl.startsWith('http')) {
        console.error("[PLAYER_ERR] Geçersiz şarkı URL'si:", songUrl);
        guildData.queue.shift();
        return playNext(guildId, client);
    }

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
                    .setDescription(`**[${song.title}](${songUrl})**`)
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
    const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    client.equalizer.forEach((gain, i) => {
        if (gain !== 0) audioFilters.push(`equalizer=f=${freqs[i]}:width_type=h:w=1:g=${gain}`);
    });

    let inputStream;
    let inputType;

    try {
        console.log(`[PLAYER] Başlatılıyor: ${song.title} | URL: ${songUrl} | Seek: ${seekTime}s`);

        // --- MOTOR 1: play-dl ---
        try {
            const info = await play.video_info(songUrl);
            const stream = await play.stream_from_info(info, {
                seek: seekTime,
                quality: 1,
                discordPlayerCompatibility: true
            });
            inputStream = stream.stream;
            inputType = stream.type;
            console.log(`[PLAYER] Motor: play-dl (Type: ${inputType})`);
        } catch (e1) {
            console.error(`[ERR] play-dl başarısız: ${e1.message}. Motor 2 (ytdl-core) deneniyor...`);

            // --- MOTOR 2: ytdl-core ---
            const ytdlStream = ytdl(songUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                begin: seekTime > 0 ? `${seekTime}s` : undefined
            });
            inputStream = ytdlStream;
            inputType = StreamType.Arbitrary;
            console.log(`[PLAYER] Motor: ytdl-core`);

            // Hata kontrolü
            ytdlStream.on('error', err => {
                console.error(`[ERR] ytdl-core stream hatası: ${err.message}`);
            });
        }

        // Eğer filtre varsa FFmpeg kullan
        if (audioFilters.length > 0) {
            const ffmpegArgs = [
                '-analyzeduration', '0',
                '-probesize', '32k',
                '-i', 'pipe:0',
                '-af', audioFilters.join(','),
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
                'pipe:1'
            ];

            const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
                windowsHide: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            inputStream.pipe(ffmpegProcess.stdin);
            inputStream = ffmpegProcess.stdout;
            inputType = StreamType.Raw;

            ffmpegProcess.stdin.on('error', e => { });
            ffmpegProcess.stdout.on('error', e => { });

            if (guildData.currentProcess) {
                try { guildData.currentProcess.ffmpeg.kill(); } catch (e) { }
            }
            guildData.currentProcess = { ffmpeg: ffmpegProcess };
        }

        const resource = createAudioResource(inputStream, {
            inputType: inputType,
            inlineVolume: true
        });

        const vol = client.globalVolume || 100;
        resource.volume.setVolume(vol / 100);

        guildData.resource = resource;
        guildData.resourceStartTime = Date.now();
        guildData.currentSeekTime = seekTime;

        guildData.player.play(resource);

        if (seekTime > 0) {
            setTimeout(() => {
                guildData.isSeeking = false;
            }, 2000);
        }

    } catch (err) {
        console.error("[STREAM_ERR]", err);

        // --- MOTOR 3: yt-dlp (Son Çare) ---
        try {
            console.log("[PLAYER] Motor 3 (yt-dlp) deneniyor...");
            const ytdlpArgs = [
                '--buffer-size', '16K',
                '-o', '-',
                '-f', 'ba*[vcodec=none]',
                songUrl
            ];
            const ytdlp = spawn(ytdlpPath, ytdlpArgs);
            const resource = createAudioResource(ytdlp.stdout, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
            guildData.player.play(resource);
        } catch (e3) {
            const channel = client.channels.cache.get(guildData.textChannel);
            if (channel) channel.send(`❌ Şarkı başlatılamadı: ${err.message}`);
            playNext(guildId, client);
        }
    }
}
