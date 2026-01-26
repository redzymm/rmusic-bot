const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, Plugins } = require('kazagumo');
const { EmbedBuilder } = require('discord.js');
const Spotify = require('kazagumo-spotify');

const { SERVERS, LAVALINK_PASSWORD } = require('./configs/servers');

// Premium UX: YouTube Search Cache
const ytCache = new Map();
const CACHE_TTL = 1000 * 60 * 15; // 15 dakika önbellekte tut

// Pro Algoritma: Kara liste ve Geçmiş takibi
const BANNED_KEYWORDS = ['live', 'remix', 'sped up', 'slowed', 'nightcore', 'lyrics', 'karaoke', 'cover', 'edit', 'remix', 'official video', 'clip official'];
const playedTracksHistory = new Set();
const MAX_DURATION = 1000 * 60 * 7; // 7 dakika sınırı

function getNodes() {
    return [{
        name: 'main',
        url: process.env.LAVALINK_HOST || SERVERS.LOCAL.url,
        auth: LAVALINK_PASSWORD,
        secure: false,
        followRedirects: true
    }];
}

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
                resumeTimeout: 120, // Oturum kurtarma süresini artır
                reconnectTries: 100,
                reconnectInterval: 5, // KESİN DÜZELTME: Logda saniye olduğu ispatlandı. 5000 -> 5 yapıldı.
                restTimeout: 90000, // API yanıt süresini ağ gecikmelerine karşı esnet
                id: finalBotId // Layer 2: Shoukaku Manager Check
            });

            // Layer 3: Direct injection to Shoukaku Manager (Post-constructor)
            if (this.kazagumo.shoukaku) {
                this.kazagumo.shoukaku.id = finalBotId;
            }

            // Manually add nodes to ensure they are picked up correctly in v4
            console.log("[LAVALINK] Node listesi ekleniyor...");
            for (const node of getNodes()) {
                this.kazagumo.shoukaku.addNode(node);
            }

            // İlk modu belirle (Eğer ayarlardan yüklenmediyse)
            if (!this.client.activeServerMode) {
                this.client.activeServerMode = process.env.LAVALINK_HOST ? 'REMOTE_ENV' : 'LOCAL';
            }

            // Shoukaku (v4) Events
            this.kazagumo.shoukaku.on('ready', (name) => {
                console.log(`[LAVALINK] Node ${name} HAZIR ✅`);
            });

            this.kazagumo.shoukaku.on('error', (name, error) => {
                console.error(`[LAVALINK] Node ${name} hatası ❌:`, error);
            });

            this.kazagumo.shoukaku.on('debug', (name, info) => {
                // Highly verbose, only enable if troubleshooting connection
                // console.log(`[LAVALINK_DEBUG] ${name}: ${info}`);
            });

            // Kazagumo Events
            this.kazagumo.on('playerStart', async (player, track) => {
                console.log(`[LAVALINK] Şarkı başladı: ${track.title} (Guild: ${player.guildId})`);

                const textChannelId = player.data.get('textChannelId');
                if (!textChannelId) return;

                const channel = this.client.channels.cache.get(textChannelId);
                if (channel) {
                    // Pre-calculate duration string
                    const duration = track.isStream ? '🔴 Canlı Yayın' : this.formatMS(track.length);

                    const embed = new EmbedBuilder()
                        .setAuthor({ name: 'Şu Anda Oynatılıyor', iconURL: 'https://cdn.discordapp.com/emojis/980415302634455080.gif' })
                        .setTitle(`${track.title}`)
                        .setURL(track.uri)
                        .setThumbnail(track.thumbnail || null)
                        .addFields(
                            { name: '👤 Sanatçı', value: `\`${track.author}\``, inline: true },
                            { name: '⏳ Süre', value: `\`${duration}\``, inline: true },
                            { name: '👤 İsteyen', value: `${track.requester}`, inline: true }
                        )
                        .setColor('#5865F2')
                        .setImage('https://media.discordapp.net/attachments/970363065606451241/992455502621003826/music-bar.gif') // Şık görsel bar
                        .setFooter({ text: `RMusic Premium • Kazagumo v3 • Shoukaku v4`, iconURL: this.client.user.displayAvatarURL() })
                        .setTimestamp();

                    // Store last NP message to delete later if needed
                    const lastNp = player.data.get('lastNp');
                    if (lastNp) {
                        try { await lastNp.delete(); } catch (e) { }
                    }
                    const msg = await channel.send({ embeds: [embed] }).catch(() => null);
                    player.data.set('lastNp', msg);
                    player.data.set('drop_killer_fired', false); // Yeni şarkıda sıfırla
                }
                player.data.set('autoplay_last', track); // Autoplay için son şarkıyı kaydet

                // Algoritma: Şarkıyı geçmişe ekle (Döngü önlemek için)
                if (track.identifier) {
                    playedTracksHistory.add(track.identifier);
                    // Hafızayı taze tut (son 100 şarkı)
                    if (playedTracksHistory.size > 100) {
                        const first = playedTracksHistory.values().next().value;
                        playedTracksHistory.delete(first);
                    }
                }

                // Spotify Preload: Sıradaki şarkı Spotify ise önceden hazırla
                if (player.queue.length > 0) {
                    const next = player.queue[0];
                    if (next.uri?.includes('spotify')) {
                        console.log(`[LAVALINK_PRELOAD] Spotify ön yüklemesi başlatıldı: ${next.title}`);
                        this.search(`${next.author} ${next.title}`, 'Preload').catch(() => null);
                    }
                }
            });

            // "Drop-Killer" Logic: Şarkı %80'deyken hazırlık yap
            this.kazagumo.on('playerUpdate', async (player, data) => {
                if (!player.queue.current || !data.state?.position) return;

                const position = data.state.position;
                const duration = player.queue.current.length;
                if (!duration || duration < 30000) return; // 30 sn'den kısa şarkılarda yapma

                // %80 kontrolü ve sadece 1 kez tetiklenmesi için bayrak
                if (position > (duration * 0.8) && !player.data.get('drop_killer_fired')) {
                    player.data.set('drop_killer_fired', true);

                    if (player.queue.length === 0 && player.data.get('autoplay')) {
                        console.log(`[LAVALINK_DROP_KILLER] Autoplay için ön arama yapılıyor...`);
                        const lastTrack = player.queue.current;

                        // Query normalizasyonu: Yazar başlıkta varsa tekrarlama
                        let query = lastTrack.title;
                        if (!query.toLowerCase().includes(lastTrack.author.toLowerCase())) {
                            query = `${lastTrack.author} ${lastTrack.title}`;
                        }
                        query += " related";

                        this.search(query, 'DropKiller').catch(() => null);
                    }

                    // Kuyruktaki ilk şarkıyı da preload et (eğer hala edilmediyse)
                    if (player.queue.length > 0) {
                        const next = player.queue[0];
                        this.search(`${next.author} ${next.title}`, 'DropKiller').catch(() => null);
                    }
                }
            });

            this.kazagumo.on('playerEmpty', (player) => {
                // Autoplay aktifse player'ı silme, playerEnd beklesin
                if (player.data.get('autoplay')) {
                    console.log(`[LAVALINK] Kuyruk boşaldı, Autoplay için bekleniyor... (Guild: ${player.guildId})`);
                    return;
                }

                console.log(`[LAVALINK] Kuyruk bitti (Guild: ${player.guildId})`);
                const textChannelId = player.data.get('textChannelId');
                if (textChannelId) {
                    const channel = this.client.channels.cache.get(textChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setDescription('✨ **Kuyruk tamamlandı.** Müzik motoru dinlenmeye çekiliyor.')
                            .setColor('#2F3136');
                        channel.send({ embeds: [embed] }).catch(() => null);
                    }
                }
                player.destroy();
            });

            this.kazagumo.on('playerEnd', async (player) => {
                // Sadece kuyruk boşsa ve autoplay aktifse çalış (playerEmpty ile çakışmayı önle)
                if (player.queue.length === 0 && player.data.get('autoplay')) {
                    const lastTrack = player.data.get('autoplay_last');
                    if (!lastTrack || !lastTrack.title) {
                        console.log('[AUTOPLAY] No last track metadata found, destroying player.');
                        player.destroy();
                        return;
                    }

                    // Pro Algoritma: Sanatçı bazlı veya şarkı bazlı akıllı sorgu
                    // Eğer sanatçı biliniyorsa sadece sanatçı araması keşif için daha iyidir
                    let query = lastTrack.author;
                    if (query.toLowerCase().includes('topic') || query.toLowerCase().includes('vevo')) {
                        query = lastTrack.title;
                    }

                    console.log(`[AUTOPLAY] Pro Discovery started for: ${query}`);
                    const requester = { id: 'autoplay', username: 'RMusic Radio' };

                    try {
                        // 1. Arama yap
                        const result = await this.search(query, requester);

                        if (result && result.tracks.length > 0) {
                            // 2. Pro Filtreleme
                            let validTracks = result.tracks.filter(t => {
                                const title = t.title.toLowerCase();
                                const isBanned = BANNED_KEYWORDS.some(word => title.includes(word));
                                const isTooLong = t.length > MAX_DURATION;
                                const isDuplicate = t.uri === lastTrack.uri || t.title === lastTrack.title || playedTracksHistory.has(t.identifier);
                                return !isBanned && !isDuplicate && !isTooLong;
                            });

                            // Eğer hiç sonuç kalmadıysa filtreyi esnet (ama aynı şarkıyı çalma)
                            if (validTracks.length === 0) {
                                validTracks = result.tracks.filter(t => t.uri !== lastTrack.uri && t.title !== lastTrack.title);
                            }

                            // 3. Karıştır ve Seç
                            validTracks.sort(() => Math.random() - 0.5);
                            const nextTrack = validTracks[0] || result.tracks[Math.floor(Math.random() * Math.min(result.tracks.length, 5))];

                            if (nextTrack) {
                                console.log(`[AUTOPLAY] Selected: ${nextTrack.title} | Alg: Discovery`);
                                nextTrack.requester = requester;

                                try {
                                    await player.play(nextTrack);
                                    console.log(`[AUTOPLAY] SUCCESS: Radio mode active.`);
                                } catch (playErr) {
                                    console.error(`[AUTOPLAY_PLAY_ERR] ${playErr.message}`);
                                    player.destroy();
                                }
                            } else {
                                console.log('[AUTOPLAY] Discovery failed. Shutting down.');
                                player.destroy();
                            }
                        } else {
                            console.log('[AUTOPLAY] No tracks returned in search. Shutting down.');
                            player.destroy();
                        }
                    } catch (err) {
                        console.error('[AUTOPLAY_ERR]', err.message);
                        player.destroy();
                    }
                }
            });

            console.log('[LAVALINK] Kazagumo hazır.');
        } catch (err) {
            console.error('[LAVALINK_FATAL] Kazagumo başlatılamadı:', err.message);
        }
    }

    async switchServer(mode) {
        if (!this.kazagumo || !this.kazagumo.shoukaku) return { success: false, message: 'Lavalink hazır değil.' };

        const server = SERVERS[mode];
        if (!server) return { success: false, message: 'Geçersiz sunucu modu.' };

        console.log(`[LAVALINK] Sunucu değiştiriliyor: ${mode} (${server.url})`);

        try {
            // Mevcut node'ları temizle
            const currentNodes = Array.from(this.kazagumo.shoukaku.nodes.keys());
            for (const nodeName of currentNodes) {
                this.kazagumo.shoukaku.removeNode(nodeName);
            }

            // Yeni node ekle
            const newNode = {
                name: 'main',
                url: server.url,
                auth: LAVALINK_PASSWORD,
                secure: false,
                followRedirects: true
            };

            this.kazagumo.shoukaku.addNode(newNode);

            // Performans modunu güncelle (Kalite ayarları için)
            process.env.VM_PERFORMANCE_MODE = server.perfMode;
            this.client.activeServerMode = mode;

            // Ayarları kalıcı kaydet
            if (typeof saveSettings === 'function') saveSettings();

            console.log(`[LAVALINK] Sunucu başarıyla değiştirildi: ${mode}`);
            return { success: true, message: `${server.name} aktif edildi.` };
        } catch (e) {
            console.error('[LAVALINK_ERR] Sunucu değiştirme hatası:', e);
            return { success: false, message: `Hata: ${e.message}` };
        }
    }

    async search(query, requester) {
        if (!this.kazagumo) throw new Error('Kazagumo hazır değil');

        const cacheKey = query.toLowerCase().trim();
        const cached = ytCache.get(cacheKey);

        if (cached && (Date.now() - cached.time < CACHE_TTL)) {
            console.log(`[LAVALINK_CACHE] Sonuç önbellekten getirildi: ${query}`);
            return cached.data;
        }

        const result = await this.kazagumo.search(query, { requester: requester });

        // Sadece başarılı ve anlamlı sonuçları cache'le
        if (result && result.tracks.length > 0) {
            ytCache.set(cacheKey, { data: result, time: Date.now() });
            // Cache temizliği: Çok büyümesini engelle
            if (ytCache.size > 100) ytCache.delete(ytCache.keys().next().value);
        }

        return result;
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

    formatMS(ms) {
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / (1000 * 60)) % 60);
        const h = Math.floor((ms / (1000 * 60 * 60)) % 24);
        return h > 0 ? `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}` : `${m}:${s < 10 ? '0' + s : s}`;
    }

    static buildFilters(client) {
        const perfMode = (process.env.VM_PERFORMANCE_MODE || "LOW").toUpperCase();
        const isHigh = perfMode === "HIGH";

        const filters = {};
        const vol = (client.globalVolume || 100) / 100;
        filters.volume = vol;

        // Dynamic Quality based on VM Performance
        // Lavalink v4.0.5+ supports dynamic quality tweaks via filters if configured.
        // We ensure the bot's filter building reflects the intended quality balance.

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
