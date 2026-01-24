module.exports = {
    name: "kuyruk",
    aliases: ["q", "queue", "sıradaki"],
    description: "Sunucudaki şarkı sırasını gösterir.",
    run: async (message, args, client) => {
        try {
            const player = client.lavalink.getPlayer(message.guild.id);

            if (!player || !player.queue || player.queue.length === 0 && !player.queue.current) {
                return message.channel.send("❌ Şu anda kuyruk boş.");
            }

            const current = player.queue.current;
            const tracks = player.queue; // Kazagumo queue is an array-like object

            let embedText = `🎵 **Şu an çalıyor:** [${current.title}](${current.uri})\n`;
            embedText += `👤 **İsteyen:** ${current.requester?.tag || "Bilinmiyor"}\n\n`;

            if (tracks.length > 0) {
                embedText += `📜 **Sıradaki Şarkılar:**\n`;
                const list = tracks.slice(0, 10).map((t, i) => `${i + 1}. **${t.title}** - *${t.requester?.tag || "Bilinmiyor"}*`).join('\n');
                embedText += list;
                if (tracks.length > 10) {
                    embedText += `\n...ve **${tracks.length - 10}** şarkı daha.`;
                }
            } else {
                embedText += `✨ Kuyrukta başka şarkı yok.`;
            }

            message.channel.send({
                embeds: [{
                    title: `${message.guild.name} - Şarkı Kuyruğu`,
                    description: embedText,
                    color: 0x5865F2,
                    thumbnail: { url: current.thumbnail || null }
                }]
            });

        } catch (error) {
            console.error(error);
            message.channel.send("❌ Kuyruk gösterilirken bir hata oluştu.");
        }
    }
};
