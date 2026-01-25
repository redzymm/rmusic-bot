/**
 * RMusic Pro - Server Configurations
 * Tek tıkla sunucu değiştirmek için IP adresleri ve ayarlar
 */

module.exports = {
    // Default Şifre: rmusic_lavalink_2024 (Değiştirdiysen burayı güncelle)
    LAVALINK_PASSWORD: process.env.LAVALINK_PASSWORD || 'rmusic_lavalink_2024',

    SERVERS: {
        LOCAL: {
            name: 'Local Server',
            url: '127.0.0.1:2333',
            perfMode: 'HIGH'
        },
        LOW_VM: {
            name: 'Google Cloud (Low)',
            url: '35.187.186.246:2333',
            perfMode: 'LOW'
        },
        HIGH_VM: {
            name: 'High Performance VM',
            url: '35.233.125.241:2333',
            perfMode: 'HIGH'
        }
    }
};
