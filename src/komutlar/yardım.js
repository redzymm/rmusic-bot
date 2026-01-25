const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "yardım",
    aliases: ["help", "y", "h"],
    description: "Tüm komutları listeler. / Lists all commands.",
    run: async (message, args, client) => {
        const prefix = client.getPrefix(message.guild.id);

        // Kullanılan komutu al (help mi yardım mı?)
        // Slash komutları için _interaction kontrolü yap
        let isEnglish = false;

        if (message._interaction) {
            // Slash command - /help kullanıldıysa İngilizce
            isEnglish = message._interaction.commandName === 'help';
        } else if (message.content) {
            // Normal prefix command
            const usedCommand = message.content.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
            isEnglish = usedCommand === "help" || usedCommand === "h";
        }

        let helpEmbed;

        if (isEnglish) {
            // English Help
            helpEmbed = new EmbedBuilder()
                .setColor("#a855f7")
                .setTitle("💎 RMusic - Command List")
                .setDescription(`Hey there! I'm RMusic, your premium music companion.\nCurrent prefix: \`${prefix}\``)
                .addFields(
                    {
                        name: "🎵 Music Commands",
                        value: `\`${prefix}p [name/link]\` - Play a song or playlist.\n\`${prefix}skip\` - Skip the current song.\n\`${prefix}stop\` - Stop playback and clear queue.\n\`${prefix}autoplay\` - Toggle continuous play mod.\n\`${prefix}queue\` - Show the current queue.\n\`${prefix}reset\` - Clear the current queue.`
                    },
                    {
                        name: "⚙️ Settings & Management",
                        value: `\`${prefix}prefix [symbol]\` - Change the bot prefix.\n\`${prefix}clear [number]\` - Delete messages in channel.`
                    },
                    {
                        name: "🛠️ System",
                        value: `\`${prefix}help\` - Show this menu.\n\`${prefix}ping\` - Check bot latency.\n\`${prefix}test\` - System status check.`
                    }
                )
                .setFooter({ text: "Designed by AHG | Elevate Your Music Experience", iconURL: client.user.displayAvatarURL() })
                .setTimestamp();
        } else {
            // Turkish Help (Türkçe Yardım)
            helpEmbed = new EmbedBuilder()
                .setColor("#ff4c4c")
                .setTitle("💎 RMusic - Komut Listesi")
                .setDescription(`Merhaba! Ben RMusic, senin için buradayım.\nŞu anki komut ön ekim: \`${prefix}\``)
                .addFields(
                    {
                        name: "🎵 Müzik Komutları",
                        value: `\`${prefix}p [isim/link]\` - İstediğin şarkıyı çalar.\n\`${prefix}skip\` - Çalan şarkıyı atlar.\n\`${prefix}stop\` - Müziği tamamen durdurur.\n\`${prefix}autoplay\` - Otomatik oynatmayı açar/kapatır.\n\`${prefix}kuyruk\` - Sıradaki şarkıları listeler.\n\`${prefix}sıfırla\` - Mevcut kuyruğu temizler.`
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
        }

        message.reply({ embeds: [helpEmbed] });
    }
};
