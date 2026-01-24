module.exports = {
    name: "skip",
    aliases: ["s", "atla", "geç"],
    description: "Şarkıyı atlar.",
    run: async (message, args, client) => {
        const player = client.lavalink.getPlayer(message.guild.id);

        if (!player || !player.queue.current) {
            return message.reply("❌ Şu an çalan bir şarkı yok.");
        }

        try {
            await player.skip();
            message.channel.send("⏭️ Şarkı atlandı!");
        } catch (e) {
            console.error(e);
            message.reply("❌ Atlanırken bir hata oluştu.");
        }
    }
};
