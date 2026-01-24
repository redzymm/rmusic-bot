const { Shoukaku, Connectors } = require('shoukaku');

const Nodes = [{
    name: 'main',
    url: process.env.LAVALINK_HOST || '127.0.0.1:2333',
    auth: process.env.LAVALINK_PASSWORD || 'rmusic_lavalink_2024',
    secure: false
}];

class LavalinkManager {
    constructor(client) {
        this.client = client;
        this.shoukaku = null;
        console.log('[LAVALINK] LavalinkManager yüklendi, Discord bağlantısı bekleniyor...');
    }

    /**
     * Initialize Shoukaku connection. 
     * This should be called AFTER the client is ready to ensure we have a valid UserId.
     */
    async init() {
        if (this.shoukaku) return;

        console.log(`[LAVALINK] Shoukaku başlatılıyor... (Node: ${Nodes[0].url})`);

        try {
            this.shoukaku = new Shoukaku(new Connectors.DiscordJS(this.client), Nodes, {
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: 60,
                reconnectTries: 30,
                reconnectInterval: 5000,
                restTimeout: 60000
            });

            this.shoukaku.on('ready', (name) => {
                console.log(`[LAVALINK] Node ${name} bağlandı ✅`);
            });

            this.shoukaku.on('error', (name, error) => {
                console.error(`[LAVALINK] Node ${name} hatası ❌:`, error.message || error);
            });

            this.shoukaku.on('close', (name, code, reason) => {
                console.warn(`[LAVALINK] Node ${name} bağlantı kapandı: ${code} - ${reason}`);
            });

            this.shoukaku.on('disconnect', (name) => {
                console.warn(`[LAVALINK] Node ${name} kesildi.`);
            });

            console.log('[LAVALINK] Shoukaku hazır.');
        } catch (err) {
            console.error('[LAVALINK_FATAL] Shoukaku başlatılamadı:', err.message);
        }
    }

    getNode() {
        if (!this.shoukaku) return null;
        return this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
    }

    async search(query, source = 'youtube') {
        const node = this.getNode();
        if (!node) throw new Error('Lavalink bağlantısı hazır değil');

        let searchQuery = query;
        if (!query.startsWith('http')) {
            searchQuery = source === 'youtube' ? `ytsearch:${query}` : `scsearch:${query}`;
        }

        return await node.rest.resolve(searchQuery);
    }

    async createPlayer(guildId, channelId, textChannelId) {
        if (!this.shoukaku) throw new Error('Lavalink bağlantısı hazır değil');

        const player = await this.shoukaku.joinVoiceChannel({
            guildId: guildId,
            channelId: channelId,
            shardId: this.client.shard?.id || 0,
            deaf: true
        });

        player.textChannelId = textChannelId;
        return player;
    }

    getPlayer(guildId) {
        return this.shoukaku?.players.get(guildId);
    }

    async setVolume(guildId, volume) {
        const player = this.getPlayer(guildId);
        if (player) await player.setFilters({ volume: volume / 100 });
    }

    async setFilters(guildId, filters) {
        const player = this.getPlayer(guildId);
        if (player) await player.setFilters(filters);
    }

    async destroyPlayer(guildId) {
        if (this.shoukaku) await this.shoukaku.leaveVoiceChannel(guildId);
    }
}

module.exports = LavalinkManager;
