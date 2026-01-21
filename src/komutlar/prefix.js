const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "prefix",
    aliases: ["prefix"],
    description: "Sunucu önekini ayarlar.",
    usage: "prefix <yeni önek>",
    ownerOnly: false,
    run: async (message, args, client) => {
        try {
            // Yönetici kontrolü (discord.js v14)
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.channel.send("Bu işlem için gerekli yetkiniz bulunmamaktadır.");
            }

            const yeniPrefix = args[0];

            if (!yeniPrefix) {
                return message.channel.send("Lütfen bir prefix belirtiniz.");
            }

            // Güvenlik kontrolü
            if (yeniPrefix.includes(" ") || yeniPrefix.length > 10) {
                return message.channel.send("Geçersiz prefix formatı. Boşluk içeremez ve en fazla 10 karakter olabilir.");
            }

            // Prefix'i kaydet (client üzerinden)
            client.setPrefix(message.guild.id, yeniPrefix);

            message.channel.send("Başarı ile prefixiniz (ön-ekiniz) " + yeniPrefix + " olarak ayarlandı.");
        } catch (error) {
            console.error(error);
            message.channel.send("Bir hata oluştu!");
        }
    }
};
