const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "p",
    aliases: ["play", "çal"],
    description: "Lavalink/Kazagumo ile müzik çalar",
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
            if (!client.lavalink || !client.lavalink.kazagumo) {
                return message.reply("❌ Lavalink sunucusu bağlı değil! Lütfen bekleyin.");
            }

            let query = args.join(" ").replace(/^"|"$/g, '').trim();

            if (message.guild.searchMsg) { try { await message.guild.searchMsg.delete(); } catch (e) { } }
            message.guild.searchMsg = await message.channel.send(`🔍 Aranıyor: **${query}**...`);

            // Search for the track using Kazagumo
            const result = await client.lavalink.search(query, message.author);

            if (!result || !result.tracks.length) {
                if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }
                return message.channel.send("❌ Sonuç bulunamadı.");
            }

            // Get or create player
            let player = client.lavalink.getPlayer(message.guild.id);
            if (!player) {
                player = await client.lavalink.createPlayer({
                    guildId: message.guild.id,
                    voiceId: voice.id,
                    textId: message.channel.id,
                    deaf: true
                });
                // Initialize autoplay from global setting (Ensure default value)
                player.data.set('autoplay', client.globalAutoplay || false);

                // Apply initial volume and filters
                const initialFilters = client.lavalink.constructor.buildFilters(client);
                player.shoukaku.setFilters(initialFilters);
            }

            // Attach text channel ID for event messages (Global Manager will use this)
            player.data.set('textChannelId', message.channel.id);

            // Add to queue
            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    track.requester = message.author;
                    player.queue.add(track);
                }
                await message.channel.send(`✅ **${result.tracks.length}** şarkı playlistten eklendi!`);
            } else {
                const track = result.tracks[0];
                track.requester = message.author;
                player.queue.add(track);
                if (player.queue.length > 1) {
                    await message.channel.send(`✅ Kuyruğa eklendi: **${track.title}**`);
                }
            }

            // Start playing if not playing
            if (!player.playing && !player.paused) player.play();

            // Delete search message
            if (message.guild.searchMsg) try { await message.guild.searchMsg.delete(); } catch (e) { }

        } catch (err) {
            console.error("[P_CMD_ERR]", err);
            message.channel.send("❌ Bir hata oluştu: " + err.message);
        }
    }
};
