module.exports = {
    name: "kuyruk",
    aliases: ["q", "queue", "sıradaki"],
    description: "Sunucudaki şarkı sırasını gösterir.",
    run: async (message, args, client) => {
        try {
            const guildData = client.müzik.get(message.guild.id);

            if (!guildData || guildData.queue.length === 0) {
                return message.channel.send("❌ Şu anda kuyruk boş.");
            }

            const tracks = guildData.queue;
            const current = tracks[0];
            const nextTracks = tracks.slice(1);

            let embedText = `🎵 **Şu an çalıyor:** [${current.title}](${current.url})\n`;
            embedText += `👤 **İsteyen:** ${current.requester}\n\n`;

            if (nextTracks.length > 0) {
                embedText += `📜 **Sıradaki Şarkılar:**\n`;
                const list = nextTracks.slice(0, 10).map((t, i) => `${i + 1}. **${t.title}** - *${t.requester}*`).join('\n');
                embedText += list;
                if (nextTracks.length > 10) {
                    embedText += `\n...ve **${nextTracks.length - 10}** şarkı daha.`;
                }
            } else {
                embedText += `✨ Kuyrukta başka şarkı yok.`;
            }

            message.channel.send({
                embeds: [{
                    title: `${message.guild.name} - Şarkı Kuyruğu`,
                    description: embedText,
                    color: 0x5865F2,
                    thumbnail: { url: current.thumbnail }
                }]
            });

        } catch (error) {
            console.error(error);
            message.channel.send("❌ Kuyruk gösterilirken bir hata oluştu.");
        }
    }
};
