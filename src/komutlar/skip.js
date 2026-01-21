const { playNext } = require('./p.js');

module.exports = {
    name: "skip",
    aliases: ["s", "atla", "geç"],
    description: "Şarkıyı atlar.",
    run: async (message, args, client) => {
        const data = client.müzik.get(message.guild.id);

        if (!data || !data.player) {
            return message.reply("❌ Şu an çalan bir şarkı yok.");
        }

        try {
            // Remove current song from queue
            if (data.queue.length > 0) {
                data.queue.shift();
            }

            // Stop current track and play next
            await data.player.stopTrack();
            message.channel.send("⏭️ Şarkı atlandı!");

            // Play next song
            playNext(message.guild.id, client);
        } catch (e) {
            console.error(e);
            message.reply("❌ Atlanırken bir hata oluştu.");
        }
    }
};
