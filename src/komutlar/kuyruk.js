const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: "kuyruk",
    aliases: ["q", "queue", "sıradaki"],
    description: "Sunucudaki şarkı sırasını gösterir.",
    run: async (message, args, client) => {
        try {
            const player = client.lavalink.getPlayer(message.guild.id);

            if (!player || !player.queue || (player.queue.length === 0 && !player.queue.current)) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ **Şu anda kuyruk boş.**')
                    .setColor('#ED4245');
                return message.channel.send({ embeds: [embed] });
            }

            const current = player.queue.current;
            const tracks = player.queue;

            const embed = new EmbedBuilder()
                .setAuthor({ name: `${message.guild.name} - Şarkı Kuyruğu`, iconURL: 'https://cdn.discordapp.com/emojis/980415302634455080.gif' })
                .setColor('#5865F2')
                .setThumbnail(current.thumbnail || null);

            let embedText = `✨ **Şu An Çalıyor:**\n`;
            embedText += `┕ [${current.title}](${current.uri}) - \`${current.author}\`\n\n`;

            if (tracks.length > 0) {
                embedText += `📜 **Sıradaki Şarkılar:**\n`;
                const list = tracks.slice(0, 10).map((t, i) => `\`${i + 1}.\` [${t.title}](${t.uri}) | \`${t.requester?.tag || "Bilinmiyor"}\``).join('\n');
                embedText += list;
                if (tracks.length > 10) {
                    embedText += `\n\n...ve **${tracks.length - 10}** şarkı daha.`;
                }
            } else {
                embedText += `✨ **Kuyrukta başka şarkı yok.**`;
            }

            embed.setDescription(embedText);
            embed.setFooter({ text: `Kuyrukta toplam ${tracks.length} şarkı mevcut.`, iconURL: client.user.displayAvatarURL() });

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            message.channel.send("❌ Kuyruk gösterilirken bir hata oluştu.");
        }
    }
};
