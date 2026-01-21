const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "test",
    aliases: ["test", "test1"],
    description: "Bu bir test komutudur.",
    usage: "test",
    ownerOnly: false,
    run: async (message, args, client) => {
        try {
            // Kullanıcı yönetici izinlerine sahip değilse (discord.js v14)
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return message.channel.send("Bu komutu kullanma izniniz yok.");
            }

            message.channel.send(`✅ Sistem aktif! Mevcut ping değeri: **${client.ws.ping}ms**`);
        } catch (error) {
            console.error(error);
            message.channel.send("Bir hata oluştu!");
        }
    }
};
