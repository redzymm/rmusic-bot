const { Client, GatewayIntentBits, Collection, Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ayarlar = require("../data/ayarlar.json");
const LavalinkManager = require("./LavalinkManager");

// Encoding ayarları
process.env.PYTHONIOENCODING = "utf-8";
process.env.LANG = "en_US.UTF-8";
if (process.stdout.setEncoding) process.stdout.setEncoding('utf8');
if (process.stderr.setEncoding) process.stderr.setEncoding('utf8');

/* =======================
   LAVALINK AUTOMATION
   ======================= */
let lavalinkProcess = null;

function startLavalink() {
    const lavalinkJar = path.normalize(path.join(__dirname, "../lavalink/Lavalink.jar"));
    const lavalinkDir = path.normalize(path.join(__dirname, "../lavalink"));

    console.log(`[LAVALINK] Kontrol ediliyor: ${lavalinkJar}`);

    if (!fs.existsSync(lavalinkJar)) {
        console.error("[LAVALINK_ERR] Lavalink.jar bulunamadı! Lütfen /lavalink klasöründe olduğundan emin olun.");
        return;
    }

    console.log("[LAVALINK] Sunucu başlatılıyor... (java -jar Lavalink.jar)");

    try {
        lavalinkProcess = spawn("java", ["-jar", "Lavalink.jar"], {
            cwd: lavalinkDir,
            stdio: "inherit"
        });

        lavalinkProcess.on("exit", (code) => {
            console.warn(`[LAVALINK] Sunucu kapandı (Kod: ${code})`);
            if (code !== 0) {
                console.error("[LAVALINK_ERR] Sunucu beklenmedik şekilde kapandı. Java yüklü mü? (java -version)");
            }
        });

        lavalinkProcess.on("error", (err) => {
            console.error(`[LAVALINK_ERR] Başlatma hatası:`, err);
            if (err.code === 'ENOENT') {
                console.error("[LAVALINK_ERR] 'java' komutu bulunamadı. Lütfen sisteme Java 17+ yükleyin.");
            }
        });
    } catch (e) {
        console.error(`[LAVALINK_ERR] Spawn hatası:`, e);
    }
}

// Bot kapanırken Lavalink'i de temizle
const cleanup = () => {
    if (lavalinkProcess) {
        console.log("[LAVALINK] Sunucu kapatılıyor...");
        lavalinkProcess.kill();
    }
};

process.on("exit", cleanup);
process.on("SIGINT", () => {
    cleanup();
    process.exit();
});
process.on("SIGTERM", () => {
    cleanup();
    process.exit();
});

// Lavalink'i başlat
startLavalink();

/* =======================
   CLIENT
 ======================= */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Müzik takibi ve Filtreler
client.müzik = new Map();
client.globalVolume = 100;
client.filters = { "8d": false, "bassboost": false, "nightcore": false };
client.equalizer = Array(10).fill(0);
client.disabledCommands = ayarlar.disabled_commands || [];
client.autoResponses = [];

function loadAutoResponses() {
    try {
        const arPath = path.join(__dirname, "../data/auto_responses.json");
        if (fs.existsSync(arPath)) {
            client.autoResponses = JSON.parse(fs.readFileSync(arPath, "utf8"));
            console.log(`[AUTO-RESPONSE] Loaded ${client.autoResponses.length} triggers.`);
        }
    } catch (e) {
        console.error("[AUTO_RESPONSE_LOAD_ERR]", e);
        client.autoResponses = [];
    }
}
loadAutoResponses();

/* =======================
   DATABASE (PREFIX)
 ======================= */
let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();
    const dbPath = path.join(__dirname, "../data/database.db");

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`CREATE TABLE IF NOT EXISTS prefixes (guildID TEXT PRIMARY KEY, prefix TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS locks (lockID TEXT PRIMARY KEY, lastHeartbeat INTEGER)`);

    const now = Date.now();
    db.run("DELETE FROM locks WHERE lastHeartbeat < ?", [now - 15000]);

    const lockExists = db.exec("SELECT lockID FROM locks WHERE lockID = 'active_bot'");
    if (lockExists.length > 0) {
        console.error("CRITICAL_ERROR: Dosya baska bir islem tarafindan kullanildigi icin bu islem dosyaya erisemiyor. (Başka bir Bot açık olabilir!)");
        setTimeout(() => process.exit(1), 3000);
        return;
    }

    db.run("INSERT INTO locks (lockID, lastHeartbeat) VALUES ('active_bot', ?)", [now]);
    saveDatabase();

    setInterval(() => {
        db.run("UPDATE locks SET lastHeartbeat = ? WHERE lockID = 'active_bot'", [Date.now()]);
        saveDatabase();
    }, 5000);
}

function saveDatabase() {
    if (!db) return;
    const data = db.export();
    fs.writeFileSync(path.join(__dirname, "../data/database.db"), Buffer.from(data));
}

function getPrefix(guildId) {
    if (!db) return ayarlar.prefix || "!";
    const result = db.exec("SELECT prefix FROM prefixes WHERE guildID = ?", [guildId]);
    return result.length ? result[0].values[0][0] : (ayarlar.prefix || "!");
}

function setPrefix(guildId, prefix) {
    if (!db) return;
    const exists = db.exec("SELECT guildID FROM prefixes WHERE guildID = ?", [guildId]);
    if (exists.length) {
        db.run("UPDATE prefixes SET prefix = ? WHERE guildID = ?", [prefix, guildId]);
    } else {
        db.run("INSERT INTO prefixes (guildID, prefix) VALUES (?, ?)", [guildId, prefix]);
    }
    saveDatabase();
}

client.getPrefix = getPrefix;
client.setPrefix = setPrefix;

// Ayarları Kalıcı Kaydetme Fonksiyonu
function saveSettings() {
    try {
        const dataDir = path.join(__dirname, "../data");
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const settingsPath = path.join(dataDir, "settings.json");
        const data = {
            volume: client.globalVolume,
            filters: client.filters,
            equalizer: client.equalizer
        };
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
        console.log(`[SETTINGS] Saved to ${settingsPath}`);
    } catch (e) {
        console.error("[SAVE_SETTINGS_ERR]", e);
    }
}

// Kayıtlı ayarları yükle
try {
    const settingsPath = path.join(__dirname, "../data/settings.json");
    console.log(`[SETTINGS] Loading from ${settingsPath}`);
    if (fs.existsSync(settingsPath)) {
        const data = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        if (data.volume !== undefined) {
            client.globalVolume = data.volume;
            console.log(`[SETTINGS] Volume loaded: ${data.volume}`);
        }
        if (data.filters !== undefined) {
            client.filters = data.filters;
            console.log(`[SETTINGS] Filters loaded:`, data.filters);
        }
        if (data.equalizer !== undefined) {
            client.equalizer = data.equalizer;
            console.log(`[SETTINGS] Equalizer loaded.`);
        }
    } else {
        console.log(`[SETTINGS] No settings.json found, checking fallback...`);
        // Eski sisteme bak (fallback)
        const oldPath = path.join(__dirname, "../data/settings.txt");
        if (fs.existsSync(oldPath)) {
            const volStr = fs.readFileSync(oldPath, "utf8").trim();
            const vol = parseInt(volStr);
            if (!isNaN(vol)) {
                client.globalVolume = vol;
                console.log(`[SETTINGS] Volume loaded from settings.txt: ${vol}`);
            }
        }
    }
} catch (e) {
    console.error("[LOAD_SETTINGS_ERR]", e);
}

/* =======================
   COMMANDS
 ======================= */
client.commands = new Collection();
const komutlarPath = path.join(__dirname, "komutlar");

fs.readdirSync(komutlarPath)
    .filter(f => f.endsWith(".js"))
    .forEach(file => {
        const command = require(path.join(komutlarPath, file));
        if (command.name) {
            client.commands.set(command.name.toLowerCase(), command);
            command.aliases?.forEach(a => client.commands.set(a.toLowerCase(), command));
        }
    });

/* =======================
   READY
 ======================= */
const os = require("os");

// Initialize Lavalink Manager
client.lavalink = new LavalinkManager(client);

client.once(Events.ClientReady, () => {
    console.log(`[BOT] ${client.user.tag} aktif!`);
    console.log(`[BOT] Lavalink manager başlatıldı, bağlantı bekleniyor...`);

    const sendStatus = () => {
        const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0);
        const cpuUsed = (os.loadavg()[0] * 10).toFixed(0);

        console.log("DASHBOARD_DATA:" + JSON.stringify({
            type: "status",
            username: client.user.username,
            tag: client.user.tag,
            avatar: client.user.displayAvatarURL({ extension: 'png', size: 128 }),
            ping: client.ws.ping,
            guilds: client.guilds.cache.size,
            cpu: cpuUsed,
            ram: memUsed,
            volume: client.globalVolume,
            filters: client.filters,
            equalizer: client.equalizer,
            songProgress: null,
            guildList: client.guilds.cache.map(g => ({
                name: g.name,
                icon: g.iconURL({ extension: 'png', size: 64 }) || "https://cdn.discordapp.com/embed/avatars/0.png"
            })),
            // Voice Channel Activity
            voiceChannels: client.guilds.cache
                .filter(g => g.members.me?.voice?.channel)
                .map(g => ({
                    guildName: g.name,
                    channelName: g.members.me.voice.channel.name,
                    userCount: g.members.me.voice.channel.members.filter(m => !m.user.bot).size
                })),
            commands: Array.from(new Set(client.commands.values())).map(cmd => ({
                name: cmd.name,
                description: cmd.description
            }))
        }));
    };

    sendStatus();
    saveSettings(); // Ensure settings file exists with current values
    setInterval(sendStatus, 10000); // 10 saniyede bir gönder (Performans optimizasyonu)

    // Dinamik Bot Durumu (Presence) Dönüşümü
    const statuses = [
        () => `!p [şarkı adı]`,
        () => `!yardım | ${client.guilds.cache.size} Sunucu`,
        () => `Designed by AHG`
    ];
    let statusIndex = 0;

    const updatePresence = () => {
        const status = statuses[statusIndex]();
        client.user.setActivity(status, { type: 2 }); // Listening (Dinliyor)
        statusIndex = (statusIndex + 1) % statuses.length;
    };

    updatePresence();
    setInterval(updatePresence, 15000); // 15 saniyede bir değiştir
});

/* =======================
   MESSAGE HANDLER
 ======================= */
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = getPrefix(message.guild.id);
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const command = client.commands.get(cmd);
    if (!command) return;

    if (client.disabledCommands.includes(cmd)) {
        return message.reply("❌ **Bu komut şu anda devre dışı!**");
    }

    try {
        await command.run(message, args, client);
    } catch (e) {
        console.error(e);
        message.channel.send("❌ Bir hata oluştu.");
    }
});

/* =======================
   SLASH COMMAND HANDLER
 ======================= */
// Slash command isimlerini prefix komutlarına eşle
const slashToPrefix = {
    'play': 'p',
    'skip': 'skip',
    'stop': 'stop',
    'kuyruk': 'kuyruk',
    'sifirla': 'sıfırla',
    'ping': 'ping',
    'yardim': 'yardım',
    'test': 'test',
    'prefix': 'prefix',
    'clear': 'clear'
};

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    const prefixCmd = slashToPrefix[commandName];

    if (!prefixCmd) {
        return interaction.reply({ content: '❌ Bilinmeyen komut!', ephemeral: true });
    }

    const command = client.commands.get(prefixCmd);
    if (!command) {
        return interaction.reply({ content: '❌ Komut bulunamadı!', ephemeral: true });
    }

    // Komut devre dışı mı kontrol et
    if (client.disabledCommands.includes(prefixCmd)) {
        return interaction.reply({ content: '❌ **Bu komut şu anda devre dışı!**', ephemeral: true });
    }

    // Slash command options'ı args dizisine çevir
    const args = [];

    // play komutu için şarkı seçeneği
    if (commandName === 'play') {
        const şarkı = interaction.options.getString('şarkı');
        if (şarkı) args.push(şarkı);
    }
    // prefix komutu için yeni_prefix seçeneği
    else if (commandName === 'prefix') {
        const yeniPrefix = interaction.options.getString('yeni_prefix');
        if (yeniPrefix) args.push(yeniPrefix);
    }
    // clear komutu için miktar seçeneği
    else if (commandName === 'clear') {
        const miktar = interaction.options.getInteger('miktar');
        if (miktar) args.push(miktar.toString());
    }

    // Yapay message objesi oluştur (mevcut komut yapısıyla uyumluluk için)
    const fakeMessage = {
        guild: interaction.guild,
        member: interaction.member,
        author: interaction.user,
        client: client,
        _interaction: interaction,
        _replied: false,
        reply: async (content) => {
            const options = typeof content === 'string' ? { content } : content;
            if (interaction.deferred || interaction.replied) {
                return interaction.editReply(options);
            }
            fakeMessage._replied = true;
            return interaction.reply({ ...options, fetchReply: true });
        }
    };

    // Channel wrapper (Object.create ile prototype metodlarını koruyoruz)
    fakeMessage.channel = Object.create(interaction.channel);
    fakeMessage.channel.send = async (content) => {
        const options = typeof content === 'string' ? { content } : content;
        if (!fakeMessage._replied && !interaction.replied && !interaction.deferred) {
            fakeMessage._replied = true;
            return interaction.reply({ ...options, fetchReply: true });
        }
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(options);
        }
        return interaction.channel.send(content);
    };

    try {
        // Interaction'ı defer et (3 saniye limitini aşmamak için)
        if (!interaction.deferred && !interaction.replied) {
            // /clear komutu için ephemeral defer yap ki bulkDelete onu silmesin
            const isClear = commandName === 'clear';
            // Discord.js v14+ için flags kullanımı (64 = Ephemeral)
            await interaction.deferReply({ flags: isClear ? [64] : [] });
        }

        await command.run(fakeMessage, args, client);
        console.log(`[SLASH] /${commandName} executed by ${interaction.user.tag}`);
    } catch (e) {
        // 10008: Unknown Message (Mesaj silinmiş olabilir, özellikle /clear sırasında)
        if (e.code === 10008 || e.code === '10008') {
            console.log(`[SLASH_WARN] /${commandName}: Interaction message was likely deleted, ignoring 10008.`);
            return;
        }

        console.error(`[SLASH_ERR] /${commandName}:`, e);
        const errorMsg = '❌ Bir hata oluştu.';
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMsg });
            } else {
                await interaction.reply({ content: errorMsg, flags: [64] });
            }
        } catch (err) { }
    }
});

// Auto Response Handler (Non-prefix messages)
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    const prefix = getPrefix(message.guild.id);
    if (message.content.startsWith(prefix)) return;

    const content = message.content.toLowerCase().trim();

    const match = client.autoResponses.find(r => {
        const trigger = r.trigger.toLowerCase().trim();
        return content === trigger;
    });

    if (match) {
        try {
            // Randomly select if response is an array
            const responsePool = Array.isArray(match.response) ? match.response : [match.response];
            const baseResponse = responsePool[Math.floor(Math.random() * responsePool.length)];

            // Placeholder replacement (Ensure it's a string)
            const finalReply = String(baseResponse).replace(/{user}/g, `<@${message.author.id}>`);

            await message.reply(finalReply);
            console.log(`[AUTO-RESPONSE] Triggered: ${match.trigger}`);
        } catch (e) {
            console.error("[AUTO_RESPONSE_REPLY_ERR]", e);
        }
    }
});

/* =======================
   MOD LOGS (Audit Log)
 ======================= */
async function sendModLog(guild, embed) {
    try {
        const configPath = path.join(__dirname, "../data/ayarlar.json");
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

        if (!config.mod_log_enabled || !config.log_channel) return;

        const channel = guild.channels.cache.get(config.log_channel);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    } catch (e) {
        console.error("[MOD_LOG_ERR]", e.message);
    }
}

// Log Message Delete
client.on(Events.MessageDelete, async (message) => {
    if (!message.guild || message.author?.bot) return;

    const fetchedLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete,
    });
    const deletionLog = fetchedLogs.entries.first();
    let executor = "Bilinmiyor";

    if (deletionLog) {
        const { executor: logExec, target } = deletionLog;
        if (target.id === message.author.id) {
            executor = `${logExec.tag}`;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle("🗑️ Mesaj Silindi")
        .setColor("#ff4c4c")
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
            { name: "Yazar", value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: "Kanal", value: `<#${message.channel.id}>`, inline: true },
            { name: "Silen", value: executor, inline: true },
            { name: "İçerik", value: message.content || "*İçerik bulunamadı (resim veya embed olabilir)*" }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(message.guild, embed);
});

// Log Message Update
client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (!oldMsg.guild || oldMsg.author?.bot || oldMsg.content === newMsg.content) return;

    const embed = new EmbedBuilder()
        .setTitle("📝 Mesaj Düzenlendi")
        .setColor("#ffcc00")
        .setThumbnail(oldMsg.author.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${oldMsg.author.tag} (${oldMsg.author.id})`, inline: true },
            { name: "Kanal", value: `<#${oldMsg.channel.id}>`, inline: true },
            { name: "Eski İçerik", value: oldMsg.content || "*Boş*" },
            { name: "Yeni İçerik", value: newMsg.content || "*Boş*" }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(oldMsg.guild, embed);
});

// Log Member Join
client.on(Events.GuildMemberAdd, async (member) => {
    const embed = new EmbedBuilder()
        .setTitle("📥 Üye Katıldı")
        .setColor("#00ff88")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Hesap Oluşturma", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(member.guild, embed);
});

// Log Member Leave
client.on(Events.GuildMemberRemove, async (member) => {
    // Check for Kicks
    const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick,
    });
    const kickLog = fetchedLogs.entries.first();
    let title = "📤 Üye Ayrıldı";
    let color = "#ff4c4c";
    let executor = null;

    if (kickLog && kickLog.target.id === member.id && kickLog.createdAt > (Date.now() - 5000)) {
        title = "👢 Üye Atıldı (Kick)";
        executor = kickLog.executor.tag;
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Sunucuya Katılmıştı", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "*Bilinmiyor*", inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    if (executor) {
        embed.addFields({ name: "Atan Yetkili", value: executor, inline: true });
        if (kickLog.reason) embed.addFields({ name: "Sebep", value: kickLog.reason });
    }

    sendModLog(member.guild, embed);
});

// Log Member Ban
client.on(Events.GuildBanAdd, async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd,
    });
    const banLog = fetchedLogs.entries.first();
    const executor = banLog ? banLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("🚫 Üye Yasaklandı (Ban)")
        .setColor("#ff0000")
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
            { name: "Yasaklayan", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    if (banLog && banLog.reason) embed.addFields({ name: "Sebep", value: banLog.reason });

    sendModLog(ban.guild, embed);
});

// Log Member Unban
client.on(Events.GuildBanRemove, async (ban) => {
    const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanRemove,
    });
    const unbanLog = fetchedLogs.entries.first();
    const executor = unbanLog ? unbanLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("🔓 Yasak Kaldırıldı")
        .setColor("#00ff88")
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
            { name: "Kaldıran", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(ban.guild, embed);
});

// Log Role Update (Member)
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

    if (addedRoles.size === 0 && removedRoles.size === 0) return;

    const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate,
    });
    const roleLog = fetchedLogs.entries.first();
    const executor = roleLog ? roleLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("🛡️ Rol Güncellendi")
        .setColor("#00d2ff")
        .setThumbnail(newMember.user.displayAvatarURL())
        .addFields(
            { name: "Kullanıcı", value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: "Yapan", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    if (addedRoles.size > 0) {
        embed.addFields({ name: "➕ Eklenen Rol(ler)", value: addedRoles.map(r => `<@&${r.id}>`).join(", ") });
    }
    if (removedRoles.size > 0) {
        embed.addFields({ name: "➖ Kaldırılan Rol(ler)", value: removedRoles.map(r => `<@&${r.id}>`).join(", ") });
    }

    sendModLog(newMember.guild, embed);
});

// Log Channel Create
client.on(Events.ChannelCreate, async (channel) => {
    if (!channel.guild) return;

    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate,
    });
    const channelLog = fetchedLogs.entries.first();
    const executor = channelLog ? channelLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("📁 Kanal Oluşturuldu")
        .setColor("#00ff88")
        .addFields(
            { name: "Kanal", value: `<#${channel.id}> (${channel.name})`, inline: true },
            { name: "Tür", value: channel.type.toString(), inline: true },
            { name: "Yapan", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(channel.guild, embed);
});

// Log Channel Delete
client.on(Events.ChannelDelete, async (channel) => {
    if (!channel.guild) return;

    const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete,
    });
    const channelLog = fetchedLogs.entries.first();
    const executor = channelLog ? channelLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("🗑️ Kanal Silindi")
        .setColor("#ff4c4c")
        .addFields(
            { name: "Kanal", value: channel.name, inline: true },
            { name: "ID", value: channel.id, inline: true },
            { name: "Yapan", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    sendModLog(channel.guild, embed);
});

// Log Channel Update (Permissions/Name)
client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (!oldChannel.guild) return;

    const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate,
    });
    const channelLog = fetchedLogs.entries.first();
    const executor = channelLog ? channelLog.executor.tag : "Bilinmiyor";

    const embed = new EmbedBuilder()
        .setTitle("⚙️ Kanal Güncellendi")
        .setColor("#ffcc00")
        .addFields(
            { name: "Kanal", value: `<#${newChannel.id}>`, inline: true },
            { name: "Düzenleyen", value: executor, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "REDZYMM Audit Log", iconURL: client.user.displayAvatarURL() });

    let changes = "";
    if (oldChannel.name !== newChannel.name) {
        changes += `**İsim:** \`${oldChannel.name}\` -> \`${newChannel.name}\`\n`;
    }

    // Permission Overwrites Detection
    const oldPerms = oldChannel.permissionOverwrites.cache;
    const newPerms = newChannel.permissionOverwrites.cache;

    if (oldPerms.size !== newPerms.size || !oldPerms.equals(newPerms)) {
        changes += `**İzinler:** Kanal izinlerinde değişiklik yapıldı.\n`;
    }

    if (!changes) return; // Ignore irrelevant updates

    embed.addFields({ name: "Değişiklikler", value: changes });
    sendModLog(newChannel.guild, embed);
});

/* =======================
   DASHBOARD STDIN LISTENER
 ======================= */
process.stdin.on("data", (data) => {
    try {
        const str = data.toString().trim();
        if (!str) return;

        const lines = str.split("\n");
        for (const line of lines) {
            if (!line.trim()) continue;

            if (line.startsWith("beam:")) {
                const data = JSON.parse(line.substring(5));
                const { title, url, currentTime, userId } = data;

                // Kullanıcının kanalını bul
                const guild = client.guilds.cache.find(g => g.members.cache.has(userId));
                if (!guild) return console.log("[BEAM] Guild not found for user: " + userId);

                const member = guild.members.cache.get(userId);
                if (!member?.voice?.channel) return console.log("[BEAM] User not in voice: " + userId);

                // p.js komutunu manuel tetikle veya play fonksiyonunu çağır
                const pCommand = client.commands.get('p');
                if (pCommand) {
                    // Yapay bir mesaj objesi oluştur (Command.run için)
                    const fakeMsg = {
                        guild: guild,
                        member: member,
                        channel: {
                            send: () => Promise.resolve({ delete: () => { } }), // Sessiz - mesaj gönderme
                            id: guild.channels.cache.find(c => c.type === 0)?.id
                        },
                        author: member.user,
                        client: client,
                        reply: () => { },  // Sessiz
                        send: () => { }    // Sessiz
                    };

                    // Seek (atlama) parametresi ekle - Doğrudan URL kullan (Aramadan kaçın, HIZLI)
                    const seekSeconds = Math.floor(currentTime);
                    pCommand.run(fakeMsg, [url, `--seek=${seekSeconds}`], client);
                    console.log(`[BEAM] Hot-Sync: ${title} @ ${seekSeconds}s`);
                }
                continue;
            }
            if (!line.trim()) continue;
            const json = JSON.parse(line);

            if (json.cmd === "volume") {
                const vol = parseInt(json.value);
                client.globalVolume = vol;

                const pCommand = client.commands?.get('p');
                if (pCommand && typeof pCommand.buildFilters === 'function') {
                    const newFilters = pCommand.buildFilters(client);
                    client.müzik.forEach((data, guildId) => {
                        client.lavalink.setFilters(guildId, newFilters);
                    });
                }
                saveSettings();
            }

            if (json.cmd === "toggleFilter") {
                const fid = json.value;
                if (client.filters.hasOwnProperty(fid)) {
                    client.filters[fid] = !client.filters[fid];

                    const pCommand = client.commands?.get('p');
                    if (pCommand && typeof pCommand.buildFilters === 'function') {
                        try {
                            const newFilters = pCommand.buildFilters(client);
                            client.müzik.forEach((data, guildId) => {
                                client.lavalink.setFilters(guildId, newFilters);
                            });
                        } catch (e) {
                            console.error("[DASHBOARD_FILTER_ERR]", e.message);
                        }
                    }
                    saveSettings();
                }
            }

            if (json.cmd === "equalizer") {
                const [bid, val] = json.value.split(":").map(Number);
                client.equalizer[bid] = val;

                const pCommand = client.commands?.get('p');
                if (pCommand && typeof pCommand.buildFilters === 'function') {
                    try {
                        const newFilters = pCommand.buildFilters(client);
                        client.müzik.forEach((data, guildId) => {
                            client.lavalink.setFilters(guildId, newFilters);
                        });
                    } catch (e) {
                        console.error("[DASHBOARD_EQ_ERR]", e.message);
                    }
                }
                saveSettings();
            }

            if (json.cmd === "reloadConfig") {
                delete require.cache[require.resolve("../data/ayarlar.json")];
                const newConfig = require("../data/ayarlar.json");
                client.disabledCommands = newConfig.disabled_commands || [];
                console.log("[INFO] Config Reloaded. Disabled Cmds: " + client.disabledCommands.length);
            }

            if (json.cmd === "reloadAutoResponses") {
                loadAutoResponses();
            }
        }
    } catch (e) {
        // Sessiz hata (Dashboard verisi bazen bozuk gelebilir)
    }
});

// Error handlers
process.on('uncaughtException', (err) => console.error(`[FATAL] ${err.message}`));
process.on('unhandledRejection', (reason) => console.error(`[REJECT] ${reason}`));

// ANSI stripper
const origLog = console.log, origErr = console.error;
const strip = s => typeof s === 'string' ? s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') : s;
console.log = (...a) => origLog(...a.map(strip));
console.error = (...a) => origErr(...a.map(strip));

// Process events
process.on("SIGINT", () => { if (db) { db.run("DELETE FROM locks WHERE lockID = 'active_bot'"); saveDatabase(); } process.exit(); });
process.on("exit", () => { if (db) { db.run("DELETE FROM locks WHERE lockID = 'active_bot'"); saveDatabase(); } });

// START
(async () => {
    await initDatabase();
    client.login(ayarlar.token);
})();
