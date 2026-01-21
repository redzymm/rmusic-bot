module.exports = (client) => {
    var oynuyorkısımları = [
        "RMusic|!", // İstediğiniz oynuyor kısmını ekleyin veya çıkarın
        "Created BY AHG"
    ];

    setInterval(() => {
        var random = Math.floor(Math.random() * oynuyorkısımları.length);
        client.user.setActivity(oynuyorkısımları[random], { type: 'LISTENING' });
    }, 2 * 9999); // 2 * 9999 milisaniye (yaklaşık 20 saniye) aralıklarla durumu günceller

    console.log("BOT AKTİF");
};
