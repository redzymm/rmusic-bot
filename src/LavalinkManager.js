const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const { EmbedBuilder } = require('discord.js');
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
        console.log(`[LAVALINK] Başlatılıyor... Bot ID: ${botId || 'BEKLENİYOR'}`);

        if (!botId) {
            console.error("[LAVALINK_FATAL] Bot ID'si henüz hazır değil! 5 saniye sonra tekrar denenecek...");
            setTimeout(() => this.init(readyClient, forceId), 5000);
            return;
        }

        try {
            console.log("[LAVALINK] Shoukaku v4 ve Kazagumo v3 bağlantısı kuruluyor...");

            // Ensure botId is a string and casted correctly
            const finalBotId = String(botId);

            // Give Discord.js a moment to sync its internal state (extra safe for VMs)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Standard Shoukaku v4 Connector
            const connector = new Connectors.DiscordJS(this.client);

            // FORCE FIX: Override connector.getId() to ensure it NEVER returns null
            connector.getId = () => finalBotId;
            console.log(`[LAVALINK_DEBUG] Connector ID zorlandığı: ${connector.getId()}`);

            this.kazagumo = new Kazagumo({
                defaultSearchEngine: 'youtube',
                userId: finalBotId, // Layer 1: Kazagumo Check
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
            }, connector, [], {
                moveOnDisconnect: false,
                resume: true,
                resumeTimeout: 60,
                reconnectTries: 100,
                reconnectInterval: 5, // KESİN DÜZELTME: Logda saniye olduğu ispatlandı. 5000 -> 5 yapıldı.
                restTimeout: 60000,
                id: finalBotId // Layer 2: Shoukaku Manager Check
            });

            // Layer 3: Direct injection to Shoukaku Manager (Post-constructor)
            if (this.kazagumo.shoukaku) {
                this.kazagumo.shoukaku.id = finalBotId;
            }

            // Manually add nodes to ensure they are picked up correctly in v4
            console.log("[LAVALINK] Node listesi ekleniyor...");
            for (const node of Nodes) {
                this.kazagumo.shoukaku.addNode(node);
            }

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
            this.kazagumo.on('playerStart', async (player, track) => {
                console.log(`[LAVALINK] Şarkı başladı: ${track.title} (Guild: ${player.guildId})`);

                const textChannelId = player.data.get('textChannelId');
                if (!textChannelId) return;

                const channel = this.client.channels.cache.get(textChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle("🎵 Şimdi Çalıyor")
                        .setDescription(`**[${track.title}](${track.uri})**`)
                        .setThumbnail(track.thumbnail || null)
                        .addFields({ name: "👤 İsteyen", value: track.requester?.tag || "Bilinmiyor", inline: true })
                        .setColor(0x5865F2)
                        .setFooter({ text: "RMusic Ultra • Kazagumo", iconURL: this.client.user.displayAvatarURL() });

                    // Store last NP message to delete later if needed
                    const lastNp = player.data.get('lastNp');
                    if (lastNp) {
                        try { await lastNp.delete(); } catch (e) { }
                    }
                    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
                    player.data.set('lastNp', msg);
                }
            });

            this.kazagumo.on('playerEmpty', (player) => {
                console.log(`[LAVALINK] Kuyruk bitti (Guild: ${player.guildId})`);
                const textChannelId = player.data.get('textChannelId');
                if (textChannelId) {
                    const channel = this.client.channels.cache.get(textChannelId);
                    if (channel) channel.send("ℹ️ Kuyruk bitti, ayrılıyorum...").catch(() => null);
                }
                player.destroy();
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
