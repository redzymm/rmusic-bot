const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const Spotify = require('kazagumo-spotify');

const Nodes = [{
    name: 'main',
    url: process.env.LAVALINK_HOST || '127.0.0.1:2333',
    auth: process.env.LAVALINK_PASSWORD || 'rmusic_lavalink_2024',
    secure: false,
    followRedirects: true
}];

class LavalinkManager {
    constructor(client) {
        this.client = client;
        this.kazagumo = null;
        console.log('[LAVALINK] KazagumoManager (v3) yüklendi.');
    }

    /**
     * Initialize Kazagumo and Shoukaku (v4).
     */
    async init(readyClient, forceId) {
        if (this.kazagumo) return;
        if (readyClient) this.client = readyClient;

        const botId = forceId || this.client.user?.id;
        console.log(`[LAVALINK] Başlatılıyor... Bot ID: ${botId}`);

        if (!botId) {
            console.error("[LAVALINK_FATAL] Bot ID'si bulunamadı!");
            return;
        }

        try {
            console.log("[LAVALINK] Shoukaku v4 ve Kazagumo v3 bağlantısı kuruluyor...");

            // Standard Shoukaku v4 Connector
            const connector = new Connectors.DiscordJS(this.client);

            this.kazagumo = new Kazagumo({
                defaultSearchEngine: 'youtube',
                plugins: [
                    new Spotify({
                        clientId: process.env.SPOTIFY_CLIENT_ID || '',
                        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ''
                    })
                ],
                send: (guildId, payload) => {
                    const guild = this.client.guilds.cache.get(guildId);
                    if (guild) guild.shard.send(payload);
                }
            }, connector, Nodes, {
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: 60,
                reconnectTries: 30,
                reconnectInterval: 5, // Set to 5 (if seconds: 5s, if ms: 5ms). Prevents 83min delay if interpreted as seconds.
                restTimeout: 30000
            });

            // Shoukaku (v4) Events
            this.kazagumo.shoukaku.on('ready', (name) => {
                console.log(`[LAVALINK] Node ${name} HAZIR ✅`);
            });

            this.kazagumo.shoukaku.on('error', (name, error) => {
                console.error(`[LAVALINK] Node ${name} hatası ❌:`, error);
            });

            this.kazagumo.shoukaku.on('debug', (name, info) => {
                // Show ALL logs to prove reconnection attempts are happening
                console.log(`[LAVALINK_DEBUG] ${name}: ${info}`);
            });

            // Kazagumo Events
            this.kazagumo.on('playerStart', (player, track) => {
                console.log(`[LAVALINK] Şarkı başladı: ${track.title} (Guild: ${player.guildId})`);
            });

            this.kazagumo.on('playerEmpty', (player) => {
                console.log(`[LAVALINK] Kuyruk bitti (Guild: ${player.guildId})`);
            });

            console.log('[LAVALINK] Kazagumo hazır.');
        } catch (err) {
            console.error('[LAVALINK_FATAL] Kazagumo başlatılamadı:', err.message);
        }
    }

    async search(query, requester) {
        if (!this.kazagumo) throw new Error('Kazagumo hazır değil');
        return await this.kazagumo.search(query, { requester: requester });
    }

    async createPlayer(options) {
        if (!this.kazagumo) throw new Error('Kazagumo hazır değil');
        return await this.kazagumo.createPlayer(options);
    }

    async destroyPlayer(guildId) {
        const player = this.kazagumo?.players.get(guildId);
        if (player) await player.destroy();
    }

    getPlayer(guildId) {
        return this.kazagumo?.players.get(guildId);
    }

    static buildFilters(client) {
        const filters = {};
        const vol = (client.globalVolume || 100) / 100;
        filters.volume = vol;

        if (client.equalizer && client.equalizer.some(g => g !== 0)) {
            const bands = client.equalizer.map((gain, i) => ({
                band: i,
                gain: gain / 100
            }));
            filters.equalizer = bands;
        }

        if (client.filters?.nightcore) {
            filters.timescale = { speed: 1.2, pitch: 1.2, rate: 1.0 };
        } else if (client.filters?.vaporwave) {
            filters.timescale = { speed: 0.85, pitch: 1.2, rate: 1.0 };
        }

        if (client.filters?.["8d"]) {
            filters.rotation = { rotationHz: 0.2 };
        }

        if (client.filters?.bassboost) {
            const bassEq = [{ band: 0, gain: 0.6 }, { band: 1, gain: 0.5 }, { band: 2, gain: 0.3 }];
            filters.equalizer = [...(filters.equalizer || []), ...bassEq];
        }

        return filters;
    }
}

module.exports = LavalinkManager;
