const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "p",
    aliases: ["play", "oynat"],
    description: "Şarkı çalar (Lavalink).",
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

            // Check if Lavalink is connected
            if (!client.lavalink || !client.lavalink.getNode()) {
                return message.reply("❌ Lavalink sunucusu bağlı değil! Lütfen Lavalink'i başlatın.");
            }

            let query = args.join(" ").replace(/^"|"$/g, '').trim();
            console.log(`[CMD] P başlatıldı: ${query}`);

            if (message.guild.searchMsg) { try { await message.guild.searchMsg.delete(); } catch (e) { } }
            message.guild.searchMsg = await message.channel.send(`🔍 Aranıyor: **${query}**...`);

            // Search for the track
            let result = await client.lavalink.search(query);

            // Fallback to soundcloud if youtube fails or returns nothing
            if (!result || ['empty', 'error', 'no_matches'].includes(result.loadType?.toLowerCase())) {
                result = await client.lavalink.search(query, 'soundcloud');
            }

            if (!result || ['empty', 'error', 'no_matches'].includes(result.loadType?.toLowerCase())) {
                if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }
                return message.channel.send("❌ Sonuç bulunamadı.");
            }

            let tracks = [];
            let isPlaylist = false;
            const loadType = result.loadType?.toLowerCase();

            if (loadType === 'playlist') {
                tracks = result.data.tracks;
                isPlaylist = true;
            } else if (loadType === 'search' || loadType === 'track') {
                tracks = loadType === 'track' ? [result.data] : [result.data[0]];
            }

            if (tracks.length === 0) {
                if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }
                return message.channel.send("❌ Sonuç bulunamadı.");
            }

            // Get or create guild data
            let guildData = client.müzik.get(message.guild.id);

            if (!guildData) {
                // Create player
                const player = await client.lavalink.createPlayer(
                    message.guild.id,
                    voice.id,
                    message.channel.id
                );

                guildData = {
                    queue: [],
                    player: player,
                    textChannel: message.channel.id,
                    disconnectTimer: null,
                    lastNp: null
                };
                client.müzik.set(message.guild.id, guildData);

                // Set up player events
                setupPlayerEvents(message.guild.id, client);
            }

            // Add tracks to queue
            const queueTracks = tracks.map(track => ({
                track: track,
                title: track.info.title,
                url: track.info.uri,
                thumbnail: `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`,
                duration: track.info.length,
                requester: message.author.tag
            }));

            guildData.queue.push(...queueTracks);

            // Delete search message
            if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }

            // Send confirmation
            if (isPlaylist) {
                await message.channel.send(`✅ **${tracks.length}** şarkı kuyruğa eklendi!`);
            } else if (guildData.queue.length > 1) {
                await message.channel.send(`✅ Kuyruğa eklendi: **${tracks[0].info.title}**`);
            }

            // If not already playing, start playback
            if (!guildData.player.track) {
                playNext(message.guild.id, client);
            }

        } catch (err) {
            console.error("[P_CMD_ERR]", err);
            message.channel.send("❌ Bir hata oluştu: " + err.message);
        }
    }
};

function setupPlayerEvents(guildId, client) {
    const guildData = client.müzik.get(guildId);
    if (!guildData || !guildData.player) return;

    const player = guildData.player;

    player.on('start', (data) => {
        console.log(`[LAVALINK] Şarkı başladı: ${data.track.info.title}`);
    });

    player.on('end', (data) => {
        console.log(`[LAVALINK] Şarkı bitti, reason: ${data.reason}`);

        if (data.reason === 'replaced') return; // Skip event for replaced tracks
        if (data.reason === 'stopped') return; // Manual stop

        // Remove finished song from queue
        if (guildData.queue.length > 0) {
            guildData.queue.shift();
        }

        // Play next song
        playNext(guildId, client);
    });

    player.on('stuck', (data) => {
        console.error(`[LAVALINK] Şarkı takıldı:`, data);
        if (guildData.queue.length > 0) {
            guildData.queue.shift();
        }
        playNext(guildId, client);
    });

    player.on('exception', (data) => {
        console.error(`[LAVALINK] Şarkı hatası:`, data);
        if (guildData.queue.length > 0) {
            guildData.queue.shift();
        }
        playNext(guildId, client);
    });

    player.on('closed', (data) => {
        console.log(`[LAVALINK] Bağlantı kapandı:`, data);
    });
}

async function playNext(guildId, client) {
    const guildData = client.müzik.get(guildId);
    if (!guildData) return;

    if (guildData.queue.length === 0) {
        // Queue empty - start disconnect timer
        if (guildData.disconnectTimer) return;
        console.log(`[PLAYER] Kuyruk boş, bekleme başlıyor.`);

        guildData.disconnectTimer = setTimeout(async () => {
            if (guildData.queue.length === 0) {
                await client.lavalink.destroyPlayer(guildId);
                client.müzik.delete(guildId);
                console.log(`[PLAYER] Bağlantı kesildi (kuyruk boş).`);
            }
        }, 60_000);
        return;
    }

    // Clear disconnect timer
    if (guildData.disconnectTimer) {
        clearTimeout(guildData.disconnectTimer);
        guildData.disconnectTimer = null;
    }

    const song = guildData.queue[0];
    if (!song) return;

    try {
        // Apply volume
        const volume = (client.globalVolume || 100) / 100;

        // Apply filters if active
        const filters = buildFilters(client);
        if (Object.keys(filters).length > 0) {
            await guildData.player.setFilters(filters);
        }

        // Set volume
        await guildData.player.setGlobalVolume(Math.round(volume * 100));

        // Play the track
        await guildData.player.playTrack({
            track: {
                encoded: song.track.encoded
            }
        });

        console.log(`[PLAYER] Şimdi çalıyor: ${song.title}`);

        // Send now playing message
        const channel = client.channels.cache.get(guildData.textChannel);
        if (channel) {
            if (guildData.lastNp) { try { await guildData.lastNp.delete(); } catch (e) { } }

            const embed = new EmbedBuilder()
                .setTitle("🎵 Şimdi Çalıyor")
                .setDescription(`**[${song.title}](${song.url})**`)
                .setThumbnail(song.thumbnail)
                .addFields({ name: "👤 İsteyen", value: song.requester, inline: true })
                .setColor(0x5865F2)
                .setFooter({ text: "RMusic Ultra • Lavalink", iconURL: client.user.displayAvatarURL() });

            guildData.lastNp = await channel.send({ embeds: [embed] }).catch(e => null);
        }

    } catch (err) {
        console.error(`[PLAYER_ERR]`, err.message);
        // Skip to next song on error
        if (guildData.queue.length > 0) {
            guildData.queue.shift();
        }
        playNext(guildId, client);
    }
}

function buildFilters(client) {
    const filters = {};

    // Equalizer
    if (client.equalizer && client.equalizer.some(g => g !== 0)) {
        const bands = client.equalizer.map((gain, i) => ({
            band: i,
            gain: gain / 100 // Lavalink expects -0.25 to 1.0
        }));
        filters.equalizer = bands;
    }

    // Timescale for nightcore
    if (client.filters?.nightcore) {
        filters.timescale = {
            speed: 1.25,
            pitch: 1.25,
            rate: 1.0
        };
    }

    // Rotation for 8D
    if (client.filters?.["8d"]) {
        filters.rotation = {
            rotationHz: 0.125
        };
    }

    // Bass boost via equalizer
    if (client.filters?.bassboost) {
        const bassEq = [
            { band: 0, gain: 0.6 },
            { band: 1, gain: 0.5 },
            { band: 2, gain: 0.3 },
            { band: 3, gain: 0.1 }
        ];
        filters.equalizer = [...(filters.equalizer || []), ...bassEq];
    }

    return filters;
}

// Export playNext for other commands
module.exports.playNext = playNext;
