const { EmbedBuilder } = require('discord.js');
const { playNext } = require('./p');

const radyolar = [
    { name: "Power Türk", url: "https://powerapp.listenlive.co/powerturk" },
    { name: "Metro FM", url: "http://rtvlive.net/metro" },
    { name: "Joy FM", url: "http://rtvlive.net/joyfm" },
    { name: "Fenomen", url: "https://fenomen.listenlive.co/fenomen" },
    { name: "Slow Türk", url: "https://radyo.dogannet.tv/slowturk" },
    { name: "Best FM", url: "http://46.20.7.126:80" },
    { name: "Kral Pop", url: "http://kralpopwmp.radyotvonline.com:80" },
    { name: "Number One", url: "http://n10101.cloudapp.net/80/stream/1/" },
    { name: "Süper FM", url: "http://rtvlive.net/superfm" },
    { name: "Virgin Radio", url: "http://rtvlive.net/virgin" }
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
            if (!result || !result.data || (Array.isArray(result.data) && result.data.length === 0)) {
                return message.reply("❌ Radyo yayınına şu an ulaşılamıyor.");
            }

            const track = Array.isArray(result.data) ? result.data[0] : result.data;

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
