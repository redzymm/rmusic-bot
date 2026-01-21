module.exports = {
    name: "sıfırla",
    aliases: ["kuyruk-sıfırla", "kuyruk-temizle"],
    description: "Sunucudaki şarkı listesini temizler.",
    run: async (message, args, client) => {
        try {
            const guildData = client.müzik.get(message.guild.id);

            // Şu anda bir şarkı çalınıyorsa veya kuyruk varsa
            if (guildData && guildData.queue.length > 0) {
                // Kullanıcı bir ses kanalına bağlı değilse
                if (!message.member.voice.channel) {
                    return message.reply("❌ **Şarkı listesini temizlemek için ses kanalında olmalısın!**");
                }

                // Şarkı listesini temizle (şu an çalan kalsın, gerisi gitsin)
                const currentSong = guildData.queue[0];
                guildData.queue = [currentSong];

                return message.reply("✅ **Oynatma sırası başarıyla temizlendi!** (Şu an çalan şarkı korunuyor)");
            } else {
                return message.reply("❌ **Şu anda aktif bir oynatma listesi bulunmuyor.**");
            }
        } catch (error) {
            console.error("[SIFIRLA_ERR]", error);
            message.reply(" Bir hata oluştu!");
        }
    }
};
