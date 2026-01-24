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

                // Attach text channel ID for event messages
                player.data.set('textChannelId', message.channel.id);
                setupPlayerEvents(player, client);
            }

            // Add to queue
            if (result.type === 'PLAYLIST') {
                for (const track of result.tracks) {
                    track.setRequester(message.author);
                    player.queue.add(track);
                }
                await message.channel.send(`✅ **${result.tracks.length}** şarkı playlistten eklendi!`);
            } else {
                const track = result.tracks[0];
                track.setRequester(message.author);
                player.queue.add(track);
                if (player.queue.length > 0) {
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

function setupPlayerEvents(player, client) {
    player.on('start', async (track) => {
        const textChannelId = player.data.get('textChannelId');
        const channel = client.channels.cache.get(textChannelId);

        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle("🎵 Şimdi Çalıyor")
                .setDescription(`**[${track.title}](${track.uri})**`)
                .setThumbnail(track.thumbnail)
                .addFields({ name: "👤 İsteyen", value: track.requester?.tag || "Bilinmiyor", inline: true })
                .setColor(0x5865F2)
                .setFooter({ text: "RMusic Ultra • Kazagumo", iconURL: client.user.displayAvatarURL() });

            // Store last NP message to delete later if needed
            if (player.data.get('lastNp')) {
                try { await player.data.get('lastNp').delete(); } catch (e) { }
            }
            const msg = await channel.send({ embeds: [embed] }).catch(() => null);
            player.data.set('lastNp', msg);
        }
    });

    player.on('end', () => {
        console.log(`[KAZAGUMO] Player bitti. Guild: ${player.guildId}`);
    });

    player.on('empty', () => {
        const textChannelId = player.data.get('textChannelId');
        const channel = client.channels.cache.get(textChannelId);
        if (channel) channel.send("ℹ️ Kuyruk bitti, ayrılıyorum...").catch(() => null);
        player.destroy();
    });
}

