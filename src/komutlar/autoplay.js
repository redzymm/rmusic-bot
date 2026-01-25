const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "autoplay",
    aliases: ["otomatik", "ap", "auto"],
    description: "Otomatik oynatma özelliğini açar/kapatır.",
    run: async (message, args, client) => {
        const player = client.lavalink.getPlayer(message.guild.id);

        if (!player) {
            const embed = new EmbedBuilder()
                .setDescription('❌ **Şu anda herhangi bir müzik çalmıyor.**')
                .setColor('#ED4245');
            return message.reply({ embeds: [embed] });
        }

        if (!message.member.voice.channel || message.member.voice.channel.id !== player.voiceId) {
            return message.reply("❌ Bot ile aynı ses kanalında olmalısın!");
        }

        const currentState = player.data.get('autoplay') || false;
        const newState = !currentState;
        player.data.set('autoplay', newState);
        client.globalAutoplay = newState; // Sync with dashboard global state

        const embed = new EmbedBuilder()
            .setTitle(player.data.get('autoplay') ? '✅ Otomatik Oynatma Açıldı' : '❌ Otomatik Oynatma Kapatıldı')
            .setDescription(`Bot artık kuyruk bittiğinde **${player.data.get('autoplay') ? 'benzer şarkılarla devam edecek.' : 'duracak.'}**`)
            .setColor(player.data.get('autoplay') ? '#57F287' : '#ED4245')
            .setFooter({ text: 'RMusic Premium • Autoplay Mode', iconURL: client.user.displayAvatarURL() });

        message.channel.send({ embeds: [embed] });
    }
};
