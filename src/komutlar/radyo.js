const { EmbedBuilder } = require('discord.js');
const { playNext } = require('./p');

const radyolar = [
    { name: "Power Türk", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/POWER_TURK.mp3" },
    { name: "Kral FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/KRAL_FM.mp3" },
    { name: "Süper FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM.mp3" },
    { name: "Metro FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/METRO_FM.mp3" },
    { name: "Joy FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/JOY_FM.mp3" },
    { name: "Fenomen", url: "https://fenomen.listenlive.co/fenomen" },
    { name: "Slow Türk", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SLOW_TURK.mp3" },
    { name: "Best FM", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/BEST_FM.mp3" },
    { name: "Virgin Radio", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO_TR.mp3" },
    { name: "Kral Pop", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/KRAL_POP.mp3" }
];

module.exports = {
    name: "radyo",
    aliases: ["radio"],
    description: "Canlı radyo kanallarını listeler ve çalar.",
    run: async (message, args, client) => {
        const choice = args[0];

        if (!choice) {
            const embed = new EmbedBuilder()
                .setTitle("📻 Canlı Radyo Kanalları")
                .setDescription(radyolar.map((r, i) => `**${i + 1}.** ${r.name}`).join("\n"))
                .setFooter({ text: "Çalmak için: !radyo [numara]" })
                .setColor(0x00AE86);
            return message.reply({ embeds: [embed] });
        }

        const index = parseInt(choice) - 1;
        if (isNaN(index) || !radyolar[index]) {
            return message.reply("❌ Geçersiz bir numara girdin.");
        }

        const radio = radyolar[index];
        const voice = message.member.voice.channel;

        if (!voice) return message.reply("Şarkı çalmak için bir ses kanalına gir.");
        if (!client.lavalink || !client.lavalink.getNode()) return message.reply("❌ Lavalink sunucusu bağlı değil!");

        message.channel.send(`📻 **${radio.name}** canlı yayınına bağlanılıyor...`);

        try {
            const result = await client.lavalink.search(radio.url);
            if (!result || result.loadType === 'error' || result.loadType === 'empty') {
                const errMsg = result?.data?.message || "Yayın şu an aktif değil.";
                return message.reply(`❌ **${radio.name}** yayınına bağlanılamadı: ${errMsg}`);
            }

            const track = result.loadType === 'search' ? result.data[0] : (result.data.tracks ? result.data.tracks[0] : result.data);

            if (!track || !track.encoded) {
                return message.reply(`❌ **${radio.name}** yayını çözülemedi (Encoded data missing).`);
            }

            let guildData = client.müzik.get(message.guild.id);
            if (!guildData) {
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

                // Note: setupPlayerEvents exists in p.js, properly we should move shared logic to a manager
                // but for now we follow the existing pattern if possible. 
                // Since this is a simple script, we'll try to use the playNext logic.
            }

            // Radio is usually infinite, so we clear queue and put radio at top
            guildData.queue = [{
                track: track,
                title: `Canlı Radyo: ${radio.name}`,
                url: radio.url,
                thumbnail: "https://cdn-icons-png.flaticon.com/512/65/65668.png",
                duration: 0,
                requester: message.author.tag
            }];

            if (!guildData.player.track) {
                // If the player events aren't setup, we might have an issue.
                // Normally playNext handles the playing.
                playNext(message.guild.id, client);
            } else {
                // Force play radio immediately
                playNext(message.guild.id, client);
            }

        } catch (err) {
            console.error("[RADIO_ERR]", err);
            message.reply("❌ Radyo başlatılırken bir hata oluştu: " + err.message);
        }
    }
};
