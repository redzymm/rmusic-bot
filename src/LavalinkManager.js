const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const Spotify = require('kazagumo-spotify');

const Nodes = [{
    name: 'main',
    url: process.env.LAVALINK_HOST || '127.0.0.1:2333',
    auth: process.env.LAVALINK_PASSWORD || 'rmusic_lavalink_2024',
    secure: false
}];

class LavalinkManager {
    constructor(client) {
        this.client = client;
        this.kazagumo = null;
        console.log('[LAVALINK] KazagumoManager yüklendi, Discord bağlantısı bekleniyor...');
    }

    /**
     * Initialize Kazagumo and Shoukaku.
     */
    async init(readyClient) {
        if (this.kazagumo) return;
        if (readyClient) this.client = readyClient;

        console.log(`[LAVALINK] Kazagumo/Shoukaku başlatılıyor... (Node: ${Nodes[0].url})`);

        if (!this.client.user) {
            console.error("[LAVALINK_FATAL] Bot ID'si bulunamadı (client.user null)! Connector başlatılamaz.");
            return;
        }

        try {
            console.log("[LAVALINK] Kazagumo ve Shoukaku (v3) başlatılıyor...");

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
            }, new Connectors.DiscordJS(this.client), Nodes, {
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: 60,
                reconnectTries: 30,
                reconnectInterval: 5000,
                restTimeout: 60000
            });

            // Shoukaku (via Kazagumo) Node Events
            this.kazagumo.shoukaku.on('ready', (name) => {
                console.log(`[LAVALINK] Node ${name} HAZIR ✅`);
            });

            this.kazagumo.shoukaku.on('error', (name, error) => {
                console.error(`[LAVALINK] Node ${name} hatası ❌:`, error);
            });

            this.kazagumo.shoukaku.on('close', (name, code, reason) => {
                console.warn(`[LAVALINK] Node ${name} kapandı (Kod: ${code}, Sebep: ${reason})`);
            });

            this.kazagumo.shoukaku.on('debug', (name, info) => {
                if (info.includes('Socket') || info.includes('Sever') || info.includes('Authenticating'))
                    console.log(`[SHOUKAKU_DEBUG] ${name}: ${info}`);
            });

            // Kazagumo Events
            this.kazagumo.on('playerStart', (player, track) => {
                console.log(`[LAVALINK] Şarkı başladı: ${track.title} (Guild: ${player.guildId})`);
            });

            this.kazagumo.on('playerEmpty', (player) => {
                console.log(`[LAVALINK] Kuyruk bitti (Guild: ${player.guildId})`);
            });

            this.kazagumo.on('playerError', (player, error) => {
                console.error(`[LAVALINK] Oyuncu hatası:`, error);
            });

            console.log('[LAVALINK] Kazagumo hazır.');
        } catch (err) {
            console.error('[LAVALINK_FATAL] Kazagumo başlatılamadı:', err.message);
        }
    }

    /**
     * Search for tracks.
     */
    async search(query, requester) {
        if (!this.kazagumo) throw new Error('Kazagumo hazır değil');
        return await this.kazagumo.search(query, { requester: requester });
    }

    /**
     * Get or Create a player.
     */
    async createPlayer(options) {
        if (!this.kazagumo) throw new Error('Kazagumo hazır değil');
        return await this.kazagumo.createPlayer(options);
    }

    /**
     * Destroy a player.
     */
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
