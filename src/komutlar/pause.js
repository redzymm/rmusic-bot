const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "pause",
    aliases: ["duraklat", "resume", "devam"],
    description: "Müziği duraklatır veya devam ettirir.",
    run: async (message, args, client) => {
        const player = client.lavalink.getPlayer(message.guild.id);

        if (!player) {
            return message.reply("❌ Şu an aktif bir şarkı yok.");
        }

        try {
            const isPaused = player.paused;
            await player.pause(!isPaused);

            const embed = new EmbedBuilder()
                .setDescription(isPaused ? '▶️ **Müzik devam ettiriliyor.**' : '⏸️ **Müzik duraklatıldı.**')
                .setColor(isPaused ? '#00ff88' : '#ffcc00');

            message.channel.send({ embeds: [embed] });
        } catch (e) {
            console.error(e);
            message.reply("❌ İşlem sırasında bir hata oluştu.");
        }
    }
};
