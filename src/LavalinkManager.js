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
    async init(readyClient, forceId) {
        if (this.kazagumo) return;
        if (readyClient) this.client = readyClient;

        const botId = forceId || this.client.user?.id;
        console.log(`[LAVALINK] Başlatılıyor... Hedef ID: ${botId}`);

        if (!botId) {
            console.error("[LAVALINK_FATAL] Bot ID'si bulunamadı!");
            return;
        }

        try {
            console.log("[LAVALINK] Kazagumo ve Shoukaku (v3) kuruluyor...");

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
            }, connector, [], { // Start with empty nodes to avoid constructor race condition
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: 60,
                reconnectTries: 30,
                reconnectInterval: 5000,
                restTimeout: 60000
            });

            // KRİTİK FİX: Shoukaku v3'te ID capture bazen başarısız oluyor. 
            // Burada manuel olarak ID'yi ENJEKTE ediyoruz.
            this.kazagumo.shoukaku.id = botId;

            console.log("[LAVALINK] Düğümler manuel olarak ekleniyor...");
            for (const node of Nodes) {
                try {
                    // Shoukaku'nun içindeki ID'yi bir kez daha kontrol edip force ediyoruz
                    if (!this.kazagumo.shoukaku.id) this.kazagumo.shoukaku.id = botId;

                    this.kazagumo.shoukaku.addNode(node);
                    console.log(`[LAVALINK] Düğüm kaydedildi: ${node.name}`);
                } catch (e) {
                    console.error(`[LAVALINK_ERROR] Düğüm eklenemedi (${node.name}):`, e.message);
                }
            }

            // Node Events
            this.kazagumo.shoukaku.on('ready', (name) => {
                console.log(`[LAVALINK] Node ${name} HAZIR ✅`);
            });

            this.kazagumo.shoukaku.on('error', (name, error) => {
                console.error(`[LAVALINK] Node ${name} hatası ❌:`, error);
            });

            this.kazagumo.shoukaku.on('debug', (name, info) => {
                if (info.includes('Socket') || info.includes('Sever') || info.includes('Authenticating'))
                    console.log(`[SHOUKAKU_DEBUG] ${name}: ${info}`);
            });

            // Kazagumo Events
            this.kazagumo.on('playerStart', (player, track) => {
                console.log(`[LAVALINK] Şarkı başladı: ${track.title} (Guild: ${player.guildId})`);
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
