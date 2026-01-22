const { Shoukaku, Connectors } = require('shoukaku');

const Nodes = [{
    name: 'main',
    url: '127.0.0.1:2333',
    auth: 'rmusic_lavalink_2024',
    secure: false
}];

class LavalinkManager {
    constructor(client) {
        this.client = client;
        console.log(`[LAVALINK] Shoukaku başlatılıyor... (Node: ${Nodes[0].url})`);

        this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
            moveOnDisconnect: false,
            resumable: true,
            resumableTimeout: 60,
            reconnectTries: 10,
            reconnectInterval: 5000,
            restTimeout: 60000
        });

        this.shoukaku.on('ready', (name) => {
            console.log(`[LAVALINK] Node ${name} bağlandı ✅`);
        });

        this.shoukaku.on('error', (name, error) => {
            console.error(`[LAVALINK] Node ${name} hata ❌:`, error);
        });

        this.shoukaku.on('close', (name, code, reason) => {
            console.warn(`[LAVALINK] Node ${name} bağlantı kesildi: ${code} - ${reason}`);
        });

        this.shoukaku.on('disconnect', (name, players, moved) => {
            console.warn(`[LAVALINK] Node ${name} disconnect - ${players.length} oynatıcı etkilendi`);
        });
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
        return this.shoukaku.players.get(guildId);
    }

    async setVolume(guildId, volume) {
        const player = this.getPlayer(guildId);
        if (!player) return;
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
