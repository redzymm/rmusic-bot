const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Discord Slash Commands Deploy Script
 */

let ayarlar = {};
try {
    ayarlar = require('../data/ayarlar.json');
} catch (e) {
    ayarlar = {};
}

const slashCommands = require('./slashCommands.js');

const isGlobal = process.argv.includes('--global');

async function deployCommands() {
    const commands = slashCommands.map(cmd => cmd.toJSON());
    const token = process.env.DISCORD_TOKEN || ayarlar.token;

    if (!token) {
        console.error('❌ DISCORD_TOKEN bulunamadı! .env dosyasını kontrol edin.');
        process.exit(1);
    }

    const rest = new REST({ version: '10' }).setToken(token);

    try {
        console.log(`🚀 ${commands.length} slash komutu kaydediliyor...`);
        console.log(`📍 Mod: ${isGlobal ? 'GLOBAL (tüm sunucular)' : 'GUILD (test sunucusu)'}`);

        // Bot'un Application ID'sini al
        const clientData = await rest.get(Routes.user('@me'));
        const clientId = clientData.id;

        let data;

        if (isGlobal) {
            // Global komutlar (tüm sunucularda, ~1 saat gecikme)
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
        } else {
            // Guild-specific komutlar (anında aktif)
            const guildId = process.env.TEST_GUILD_ID || ayarlar.test_guild_id || await getFirstGuildId(rest, clientId);

            if (!guildId) {
                console.error('❌ Sunucu ID bulunamadı! .env içinde TEST_GUILD_ID tanımlayın.');
                process.exit(1);
            }

            console.log(`🎯 Hedef Sunucu ID: ${guildId}`);

            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
        }

        console.log(`✅ ${data.length} slash komutu başarıyla kaydedildi!`);
        console.log('\n📋 Kaydedilen komutlar:');
        data.forEach(cmd => console.log(`   /${cmd.name} - ${cmd.description}`));

        // ayarlar.json'u güncelle (Eğer varsa)
        if (Object.keys(ayarlar).length > 0) {
            try {
                ayarlar.slash_commands_deployed = true;
                ayarlar.slash_deploy_mode = isGlobal ? 'global' : 'guild';
                ayarlar.slash_deploy_date = new Date().toISOString();
                fs.writeFileSync(
                    path.join(__dirname, '../data/ayarlar.json'),
                    JSON.stringify(ayarlar, null, 2)
                );
            } catch (e) { }
        }

    } catch (error) {
        console.error('❌ Komut kaydı sırasında hata:', error);
        process.exit(1);
    }
}

async function getFirstGuildId(rest, clientId) {
    try {
        // Bu method bot zaten login değilse çalışmaz
        // Manuel olarak guild ID gerekebilir
        console.log('⚠️  test_guild_id bulunamadı. Lütfen ayarlar.json dosyasına ekleyin:');
        console.log('    "test_guild_id": "SUNUCU_ID_BURAYA"');
        return null;
    } catch (e) {
        return null;
    }
}

// Script'i çalıştır
deployCommands();
