const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "ping",
    aliases: ["gecikme", "ms"],
    description: "Botun gecikme süresini gösterir.",
    run: async (message, args, client) => {
        const pingEmbed = new EmbedBuilder()
            .setColor("#ff4c4c")
            .setTitle("📶 Bağlantı Durumu")
            .setDescription(`Botun anlık gecikme süresi: **${client.ws.ping}ms**`)
            .setFooter({ text: "RMusic Ultra | Gecikme ne kadar azsa müzik o kadar pürüzsüz!", iconURL: client.user.displayAvatarURL() });

        message.reply({ embeds: [pingEmbed] });
    }
};
