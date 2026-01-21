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

        // Immediate check
        setTimeout(() => {
            console.log(`[LAVALINK_STAT] Kayıtlı Node sayısı: ${this.shoukaku.nodes.size}`);
            for (const [name, node] of this.shoukaku.nodes) {
                console.log(`[LAVALINK_STAT] Node: ${name} | Durum: ${node.state}`);
            }
        }, 5000);

        this.shoukaku.on('ready', (name) => {
            console.log(`[LAVALINK] Node ${name} bağlandı ✅ (Ready Event)`);
        });

        this.shoukaku.on('error', (name, error) => {
            console.error(`[LAVALINK] Node ${name} hata ❌:`, error);
        });

        this.shoukaku.on('debug', (name, info) => {
            if (info.includes('Wait')) return; // Ignore spammy wait logs
            console.log(`[LAVALINK_DEBUG] ${name}: ${info}`);
        });

        this.shoukaku.on('close', (name, code, reason) => {
            console.warn(`[LAVALINK] Node ${name} bağlantı kesildi: ${code} - ${reason}`);
        });

        this.shoukaku.on('disconnect', (name, players, moved) => {
            console.warn(`[LAVALINK] Node ${name} disconnect - ${players.length} oynatıcı etkilendi`);
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
        return result;
    }

    async createPlayer(guildId, channelId, textChannelId) {
        const node = this.getNode();
        if (!node) throw new Error('Lavalink node bulunamadı');

        const player = await node.joinChannel({
            guildId: guildId,
            channelId: channelId,
            shardId: 0,
            deaf: true
        });

        // Store text channel for messages
        player.textChannelId = textChannelId;

        return player;
    }

    getPlayer(guildId) {
        const node = this.getNode();
        if (!node) return null;
        return node.players.get(guildId);
    }

    async destroyPlayer(guildId) {
        const node = this.getNode();
        if (!node) return;

        const player = node.players.get(guildId);
        if (player) {
            await player.connection.disconnect();
            node.players.delete(guildId);
        }
    }
}

module.exports = LavalinkManager;
