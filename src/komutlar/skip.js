const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "skip",
    aliases: ["s", "atla", "geç"],
    description: "Şarkıyı atlar.",
    run: async (message, args, client) => {
        const player = client.lavalink.getPlayer(message.guild.id);

        if (!player || !player.queue.current) {
            return message.reply("❌ Şu an çalan bir şarkı yok.");
        }

        try {
            await player.skip();
            const embed = new EmbedBuilder()
                .setDescription('⏭️ **Şarkı başarıyla atlandı!**')
                .setColor('#5865F2');
            message.channel.send({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            message.reply("❌ Atlanırken bir hata oluştu.");
        }
    }
};
