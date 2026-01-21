const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "yardım",
    aliases: ["help", "y", "h"],
    description: "Tüm komutları listeler.",
    run: async (message, args, client) => {
        const prefix = client.getPrefix(message.guild.id);

        const helpEmbed = new EmbedBuilder()
            .setColor("#ff4c4c")
            .setTitle("💎 RMusic Ultra Pro Max - Komut Listesi")
            .setDescription(`Merhaba! Ben RMusic Ultra, senin için buradayım.\nŞu anki komut ön ekim: \`${prefix}\``)
            .addFields(
                {
                    name: "🎵 Müzik Komutları",
                    value: `\`${prefix}p [isim/link]\` - İstediğin şarkıyı çalar.\n\`${prefix}skip\` - Çalan şarkıyı atlar.\n\`${prefix}stop\` - Müziği tamamen durdurur.\n\`${prefix}kuyruk\` - Sıradaki şarkıları listeler.\n\`${prefix}sıfırla\` - Mevcut kuyruğu temizler.`
                },
                {
                    name: "⚙️ Yönetim & Ayarlar",
                    value: `\`${prefix}prefix [sembol]\` - Botun ön ekini değiştirir.\n\`${prefix}clear [sayı]\` - Kanaldaki mesajları temizler.`
                },
                {
                    name: "🛠️ Sistem",
                    value: `\`${prefix}yardım\` - Bu menüyü gösterir.\n\`${prefix}ping\` - Bağlantı hızını (ping) gösterir.\n\`${prefix}test\` - Sistem durumunu ve pingi kontrol eder.`
                }
            )
            .setFooter({ text: "Designed by AHG | Müzik Deneyimini Zirveye Taşı", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        message.reply({ embeds: [helpEmbed] });
    }
};
