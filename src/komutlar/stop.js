const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "stop",
    aliases: ["dur", "leave", "dc", "kapat"],
    description: "Müziği durdurur ve kanaldan çıkar.",
    run: async (message, args, client) => {
        const player = client.lavalink.getPlayer(message.guild.id);

        if (!player) {
            return message.reply("❌ Şu an aktif bir bağlantı yok.");
        }

        try {
            await player.destroy();
            const embed = new EmbedBuilder()
                .setDescription('⏹️ **Müzik durduruldu ve kanaldan çıkıldı.**')
                .setColor('#ED4245');
            message.channel.send({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            message.reply("❌ Durdururken bir hata oluştu.");
        }
    }
};
