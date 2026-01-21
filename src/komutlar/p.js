const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const { spawn } = require('child_process');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const ytdlpPath = process.platform === 'win32'
    ? path.join(__dirname, '../../node_modules/@distube/yt-dlp/bin/yt-dlp.exe')
    : 'yt-dlp'; // Use system-installed yt-dlp on Linux

const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "p",
    aliases: ["play", "oynat"],
    description: "Şarkı çalar (Opus Passthrough + 3-Engine Fallback).",
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

            let seek = 0;
            const seekArg = args.find(a => a.startsWith('--seek='));
            if (seekArg) {
                seek = parseInt(seekArg.split('=')[1]);
                args = args.filter(a => a !== seekArg);
            }

            let query = args.join(" ").replace(/^"|"$/g, '').trim();
            console.log(`[CMD] P başlatıldı: ${query}`);

            if (message.guild.searchMsg) { try { await message.guild.searchMsg.delete(); } catch (e) { } }
            message.guild.searchMsg = await message.channel.send(`🔍 Aranıyor: **${query}**...`);

            let videoUrl;
            let videoTitle;
            let thumbnail;
            let playlistTracks = [];

            if (query.includes('youtube.com') || query.includes('youtu.be')) {
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
                        }
                    } catch (e) {
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
            }

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

                guildData.player.on(AudioPlayerStatus.Idle, () => {
                    if (guildData.isSeeking) return;
                    // Move to the next song only when current finishes
                    if (guildData.queue.length > 0) guildData.queue.shift();
                    playNext(message.guild.id, client);
                });
            }

            const wasEmpty = guildData.queue.length === 0;
            if (playlistTracks.length > 0) {
                guildData.queue.push(...playlistTracks);
                message.channel.send(`✅ Oynatma listesi eklendi: **${playlistTracks.length}** şarkı sıraya alındı.`);
            } else {
                guildData.queue.push({
                    url: videoUrl, title: videoTitle, thumbnail: thumbnail, requester: message.author.tag
                });
                if (!wasEmpty) {
                    message.channel.send(`✅ Kuyruğa eklendi: **${videoTitle}** (Sıra: ${guildData.queue.length - 1})`);
                }
            }

            if (!guildData.connection) {
                const connection = joinVoiceChannel({
                    channelId: voice.id, guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator, selfDeaf: true
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

            if (wasEmpty && guildData.queue.length > 0) {
                if (message.guild.searchMsg) { try { await message.guild.searchMsg.delete(); message.guild.searchMsg = null; } catch (e) { } }
                playNext(message.guild.id, client, { isRetry: false, seekTime: seek });
            }

        } catch (error) {
            console.error("P HATASI:", error);
            message.channel.send(`❌ Hata: ${error.message}`);
        }
    },
    playNext: playNext
};

async function playNext(guildId, client, options = {}) {
    const isRetry = options.isRetry || false;
    const seekTime = options.seekTime || 0;
    const guildData = client.müzik.get(guildId);
    if (!guildData) return;

    if (guildData.currentProcess) {
        try { guildData.currentProcess.ffmpeg.kill(); } catch (e) { }
        guildData.currentProcess = null;
    }

    if (seekTime > 0) guildData.isSeeking = true;
    else guildData.isSeeking = false;

    if (guildData.queue.length === 0) {
        if (guildData.disconnectTimer) return;
        console.log(`[PLAYER] Kuyruk boş, bekleme başlıyor.`);
        guildData.disconnectTimer = setTimeout(() => {
            if (guildData.queue.length === 0 && guildData.connection) {
                guildData.connection.destroy();
                client.müzik.delete(guildId);
            }
        }, 60_000);
        return;
    }

    if (guildData.disconnectTimer) {
        clearTimeout(guildData.disconnectTimer);
        guildData.disconnectTimer = null;
    }

    const song = guildData.queue[0];
    if (!song) return;
    const songUrl = song.url || song.link;

    if (seekTime === 0 && engineIndex === 0 && !isRetry) {
        try {
            const channel = client.channels.cache.get(guildData.textChannel);
            if (channel) {
                if (guildData.lastNp) { try { await guildData.lastNp.delete(); } catch (e) { } }
                const embed = new EmbedBuilder()
                    .setTitle("🎵 Şimdi Çalıyor")
                    .setDescription(`**[${song.title}](${songUrl})**`)
                    .setThumbnail(song.thumbnail)
                    .addFields({ name: "👤 İsteyen", value: song.requester, inline: true })
                    .setColor(0x5865F2)
                    .setFooter({ text: "RMusic Ultra Pro Max", iconURL: client.user.displayAvatarURL() });
                guildData.lastNp = await channel.send({ embeds: [embed] }).catch(e => null);
            }
        } catch (e) { }
    }

    const audioFilters = [];
    if (client.filters["8d"]) audioFilters.push("apulsator=hz=0.125");
    if (client.filters["bassboost"]) audioFilters.push("bass=g=15:f=110:w=0.5");
    if (client.filters["nightcore"]) audioFilters.push("atempo=1.25,asetrate=44100*1.25");
    const freqs = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    client.equalizer.forEach((gain, i) => {
        if (gain !== 0) audioFilters.push(`equalizer=f=${freqs[i]}:width_type=h:w=1:g=${gain}`);
    });

    const isFilterActive = audioFilters.length > 0;
    let inputStream;
    let inputType = StreamType.Arbitrary;

    try {
        console.log(`[PLAYER] yt-dlp Deneniyor: ${song.title} | URL: ${songUrl} | Filtre: ${isFilterActive}`);

        if (!songUrl || !songUrl.startsWith('http')) {
            throw new Error(`Invalid URL: ${songUrl}`);
        }

        // yt-dlp - only engine, most reliable
        const ytdlpArgs = !isFilterActive
            ? ['-f', '251/bestaudio[ext=webm]', '--buffer-size', '8M', '--js-runtime', 'nodejs', '--no-playlist', '-o', '-', songUrl]
            : ['-f', 'ba*[vcodec=none]', '--buffer-size', '8M', '--js-runtime', 'nodejs', '--no-playlist', '-o', '-', songUrl];

        console.log(`[PLAYER] yt-dlp args: ${ytdlpArgs.join(' ')}`);
        const proc = spawn(ytdlpPath, ytdlpArgs);
        inputStream = proc.stdout;
        guildData.currentProcess = { ffmpeg: proc };
        if (!isFilterActive) inputType = StreamType.WebmOpus;

        proc.stderr.on('data', (data) => {
            console.log(`[YT-DLP STDERR] ${data.toString().trim()}`);
        });
        proc.on('error', (e) => {
            console.error(`[YT-DLP ERROR] ${e.message}`);
        });
        proc.on('close', (code) => {
            if (code !== 0) console.log(`[YT-DLP] Exited with code ${code}`);
        });

        if (isFilterActive) {
            const ffmpegArgs = [
                '-analyzeduration', '0', '-probesize', '32k',
                '-i', 'pipe:0',
                '-af', audioFilters.join(','),
                '-f', 's16le', '-ar', '48000', '-ac', '2',
                'pipe:1'
            ];
            const ff = spawn(ffmpegPath, ffmpegArgs);
            inputStream.pipe(ff.stdin);
            inputStream = ff.stdout;
            inputType = StreamType.Raw;
            guildData.currentProcess = { ffmpeg: ff };
            ff.stdin.on('error', e => { });
            ff.stdout.on('error', e => { });
        }

        const resource = createAudioResource(inputStream, {
            inputType: inputType, inlineVolume: true
        });
        resource.volume.setVolume((client.globalVolume || 100) / 100);

        guildData.resource = resource;
        guildData.resourceStartTime = Date.now();

        guildData.player.removeAllListeners('error');
        guildData.player.on('error', error => {
            console.error(`[PLAYER_ERR] yt-dlp:`, error.message);
            // Move to next song on error
            playNext(guildId, client);
        });

        guildData.player.play(resource);

    } catch (err) {
        console.error(`[STREAM_ERR] yt-dlp:`, err.message);
        // Move to next song on stream error
        playNext(guildId, client);
    }
}
