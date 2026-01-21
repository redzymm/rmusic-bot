module.exports = {
    name: "skip",
    aliases: ["s", "atla", "geç"],
    description: "Şarkıyı atlar.",
    run: async (message, args, client) => {
        const data = client.müzik.get(message.guild.id);

        if (!data) {
            return message.reply("❌ Şu an çalan bir şarkı yok.");
        }

        try {
            data.player.stop();
            message.channel.send("⏭️ Şarkı atlandı!");
        } catch (e) {
            console.error(e);
            message.reply("❌ Atlanırken bir hata oluştu.");
        }
    }
};
