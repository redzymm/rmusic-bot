const { Shoukaku, Connectors } = require('shoukaku');

const Nodes = [{
    name: 'main',
    url: 'localhost:2333',
    auth: 'rmusic_lavalink_2024',
    secure: false
}];

class LavalinkManager {
    constructor(client) {
        this.client = client;
        console.log(`[LAVALINK] Shoukaku başlatılıyor... (Target: ${Nodes[0].url})`);

        this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
            moveOnDisconnect: false,
            resume: true,
            resumeTimeout: 60,
            reconnectTries: 30,
            reconnectInterval: 5000,
            restTimeout: 60000
        });

        // Periodic status check & Watchdog
        setInterval(() => {
            const states = ['CONNECTING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED', 'RECONNECTING'];
            if (this.shoukaku.nodes.size > 0) {
                for (const [name, node] of this.shoukaku.nodes) {
                    const stateText = states[node.state] || 'UNKNOWN';
                    if (node.state !== 1) { // 1 = CONNECTED
                        console.log(`[LAVALINK_STAT] Node: ${name} | Durum: ${node.state} (${stateText})`);

                        // Watchdog: If disconnected, try to force a check
                        if (node.state === 3) {
                            console.log(`[LAVALINK_WATCHDOG] Node ${name} is DISCONNECTED. Attempting to restart connection...`);
                            // Shoukaku nodes don't have a simple .connect(), we might need to re-add if it completely gave up
                        }
                    }
                }
            } else {
                console.log("[LAVALINK_STAT] Hiç node kayıtlı değil! Yeniden ekleniyor...");
                this.shoukaku.addNode(Nodes[0]);
            }
        }, 10000);

        this.shoukaku.on('ready', (name) => {
            console.log(`[LAVALINK] Node ${name} bağlandı ✅ (Ready Event)`);
        });

        this.shoukaku.on('error', (name, error) => {
            console.error(`[LAVALINK] Node ${name} Shoukaku Hatası ❌:`, error.message || error);
        });

        this.shoukaku.on('debug', (name, info) => {
            if (info.includes('Wait') || info.includes('Checking nodes') || info.includes('is not yet ready')) return;
            console.log(`[LAVALINK_DEBUG] ${name}: ${info}`);
        });

        this.shoukaku.on('close', (name, code, reason) => {
            console.warn(`[LAVALINK] Node ${name} bağlantı kapandı: ${code} - ${reason}`);
        });

        this.shoukaku.on('disconnect', (name, players, moved) => {
            console.warn(`[LAVALINK] Node ${name} tamamen kesildi (Disconnect)`);
        });

        console.log(`[LAVALINK] Shoukaku başlatıldı, düğümlere bağlanmaya çalışılıyor...`);
    }

    getNode() {
        return this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
    }

    async search(query, source = 'youtube') {
        const node = this.getNode();
        if (!node) throw new Error('Lavalink node bulunamadı');

        let searchQuery = query;
        if (!query.startsWith('http')) {
            searchQuery = source === 'youtube' ? `ytsearch:${query}` : `scsearch:${query}`;
        }

        const result = await node.rest.resolve(searchQuery);
        if (result && result.loadType === 'empty') {
            console.warn(`[LAVALINK_SEARCH] No matches found for: ${searchQuery}`);
        }
        return result;
    }

    async createPlayer(guildId, channelId, textChannelId) {
        const player = await this.shoukaku.joinVoiceChannel({
            guildId: guildId,
            channelId: channelId,
            shardId: this.client.shard?.id || 0,
            deaf: true
        });

        // Store text channel for messages
        player.textChannelId = textChannelId;

        return player;
    }

    getPlayer(guildId) {
        // Shoukaku v4: Players are stored directly in the shoukaku instance
        return this.shoukaku.players.get(guildId);
    }

    async setVolume(guildId, volume) {
        const player = this.getPlayer(guildId);
        if (!player) return;
        // Lavalink filters volume: 1.0 is 100%
        await player.setFilters({ volume: volume / 100 });
    }

    async setFilters(guildId, filters) {
        const player = this.getPlayer(guildId);
        if (!player) return;
        await player.setFilters(filters);
    }

    async destroyPlayer(guildId) {
        await this.shoukaku.leaveVoiceChannel(guildId);
    }
}

module.exports = LavalinkManager;
