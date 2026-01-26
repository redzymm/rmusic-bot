const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// 1. Load env vars FIRST
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// 2. Load config SECOND (Safe load)
let ayarlar = {};
try {
    ayarlar = require('../data/ayarlar.json');
} catch (e) {
    ayarlar = {};
}

// 3. Debug Logs (Now safe)
console.log(`[DEBUG] Loading env from: ${envPath}`);
console.log(`[DEBUG] File exists: ${fs.existsSync(envPath)}`);
const rawToken = process.env.DISCORD_TOKEN;
console.log(`[DEBUG] Loaded Token: ${rawToken ? rawToken.substring(0, 5) + '...' : 'UNDEFINED'}`);
console.log(`[DEBUG] Config Token: ${ayarlar.token ? 'PRESENT' : 'MISSING'}`);

/**
 * Discord Slash Commands Deploy Script
 */

const slashCommands = require('./slashCommands.js');
const isGlobal = process.argv.includes('--global');

async function deployCommands(passedIsGlobal = null, logger = console.log) {
    const commands = slashCommands.map(cmd => cmd.toJSON());
    const token = process.env.DISCORD_TOKEN || ayarlar.token;
    const finalIsGlobal = passedIsGlobal !== null ? passedIsGlobal : isGlobal;

    logger(`[DEBUG] Final Token to use: ${token ? token.substring(0, 5) + '...' : 'NULL'}`);

    if (!token) {
        const err = '❌ DISCORD_TOKEN bulunamadı! .env dosyasını kontrol edin.';
        logger(err);
        if (require.main === module) process.exit(1);
        throw new Error(err);
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        logger(`🚀 ${commands.length} slash komutu kaydediliyor...`);
        logger(`📍 Mod: ${finalIsGlobal ? 'GLOBAL (tüm sunucular)' : 'GUILD (test sunucusu)'}`);

        // Bot'un Application ID'sini al
        const clientData = await rest.get(Routes.user('@me'));
        const clientId = clientData.id;

        let data;

        if (finalIsGlobal) {
            // Global komutlar (tüm sunucularda, ~1 saat gecikme)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        } else {
            // Guild-specific komutlar (anında aktif)
            const guildId = process.env.TEST_GUILD_ID || ayarlar.test_guild_id || await getFirstGuildId(rest, clientId, logger);

            if (!guildId) {
                const err = '❌ Sunucu ID bulunamadı! .env içinde TEST_GUILD_ID tanımlayın.';
                logger(err);
                if (require.main === module) process.exit(1);
                throw new Error(err);
            }

            logger(`🎯 Hedef Sunucu ID: ${guildId}`);

            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
        }

        logger(`✅ ${data.length} slash komutu başarıyla kaydedildi!`);
        logger('\n📋 Kaydedilen komutlar:');
        data.forEach(cmd => logger(`   /${cmd.name} - ${cmd.description}`));

        // ayarlar.json'u güncelle (Eğer varsa)
        if (Object.keys(ayarlar).length > 0) {
            try {
                ayarlar.slash_commands_deployed = true;
                ayarlar.slash_deploy_mode = finalIsGlobal ? 'global' : 'guild';
                ayarlar.slash_deploy_date = new Date().toISOString();
                fs.writeFileSync(
                    path.join(__dirname, '../data/ayarlar.json'),
                    JSON.stringify(ayarlar, null, 2)
                );
            } catch (e) { }
        }

    } catch (error) {
        logger(`❌ Komut kaydı sırasında hata: ${error.message}`);
        if (require.main === module) process.exit(1);
        throw error;
    }
}

async function getFirstGuildId(rest, clientId, logger) {
    try {
        // Bu method bot zaten login değilse çalışmaz
        // Manuel olarak guild ID gerekebilir
        logger('⚠️  test_guild_id bulunamadı. Lütfen ayarlar.json dosyasına ekleyin:');
        logger('    "test_guild_id": "SUNUCU_ID_BURAYA"');
        return null;
    } catch (e) {
        return null;
    }
}

// Script'i sadece doğrudan çalıştırıldığında başlat (require edildiğinde değil)
if (require.main === module) {
    deployCommands();
}

module.exports = { deployCommands };
