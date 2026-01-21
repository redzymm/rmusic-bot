const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: "clear",
    aliases: ["temizle", "sil"],
    description: "Belirtilen sayıda mesajı kanaldan siler.",
    run: async (message, args, client) => {
        // Yetki Kontrolü
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const errorEmbed = new EmbedBuilder()
                .setColor("#ff4c4c")
                .setDescription("❌ **Bu komutu kullanmak için `Mesajları Yönet` yetkisine sahip olmalısın!**");
            return message.reply({ embeds: [errorEmbed] });
        }

        const amount = parseInt(args[0]);

        // Geçersiz Giriş Kontrolü
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const warnEmbed = new EmbedBuilder()
                .setColor("#ff4c4c")
                .setTitle("⚠️ HATALI KULLANIM")
                .setDescription("Lütfen **1-100** arasında silinecek mesaj sayısı belirtin!\n\n**Örnek:** `!clear 50` veya `!temizle 100`")
                .setFooter({ text: "REDZYMM Moderasyon Sistemi" });
            return message.reply({ embeds: [warnEmbed] });
        }

        try {
            // Mesajları Sil (14 günden eskiyse silmez)
            const deleted = await message.channel.bulkDelete(amount, true);

            const clearEmbed = new EmbedBuilder()
                .setColor("#ff4c4c")
                .setTitle("🧹 KANAL TEMİZLENDİ")
                .setDescription(`Kanal başarıyla temizlendi!\n\nSilen Yetkili: <@${message.author.id}>\nSilinen Mesaj: **${deleted.size}**`)
                .setThumbnail("https://cdn-icons-png.flaticon.com/512/3221/3221803.png") // Trash can icon
                .setFooter({
                    text: "Discord kısıtlamaları nedeniyle 14 günden eski mesajlar silinemez.",
                    iconURL: client.user.displayAvatarURL()
                })
                .setTimestamp();

            const reply = await message.channel.send({ embeds: [clearEmbed] });

            // Onay mesajını 5 saniye sonra sil
            setTimeout(() => reply.delete().catch(() => { }), 5000);

        } catch (e) {
            console.error("[CLEAR_CMD_ERR]", e);
            const failEmbed = new EmbedBuilder()
                .setColor("#ff4c4c")
                .setDescription("❌ **Mesajlar silinirken bir hata oluştu!**\nMesajlar 14 günden eski olabilir veya botun yetkisi yetersizdir.");
            message.channel.send({ embeds: [failEmbed] });
        }
    }
};
