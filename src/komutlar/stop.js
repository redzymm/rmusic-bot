module.exports = {
    name: "stop",
    aliases: ["dur", "leave", "dc", "kapat"],
    description: "Müziği durdurur ve kanaldan çıkar.",
    run: async (message, args, client) => {
        const data = client.müzik.get(message.guild.id);

        if (!data) {
            return message.reply("❌ Şu an çalan bir şarkı yok.");
        }

        try {
            // Destroy the Lavalink player
            await client.lavalink.destroyPlayer(message.guild.id);
            client.müzik.delete(message.guild.id);
            message.channel.send("⏹️ Müzik durduruldu ve kanaldan çıkıldı.");
        } catch (e) {
            console.error(e);
            message.reply("❌ Durdururken bir hata oluştu.");
        }
    }
};
