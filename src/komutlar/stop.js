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
            message.channel.send("⏹️ Müzik durduruldu ve kanaldan çıkıldı.");
        } catch (e) {
            console.error(e);
            message.reply("❌ Durdururken bir hata oluştu.");
        }
    }
};
