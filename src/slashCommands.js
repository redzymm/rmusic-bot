const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Discord Slash Command Definitions
 * Bu dosya tüm slash command tanımlarını içerir.
 * Deploy edilmek için deploy-commands.js kullanılır.
 */

module.exports = [
    // 🎵 Müzik Komutları
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Şarkı çalar (YouTube)')
        .addStringOption(opt => 
            opt.setName('şarkı')
                .setDescription('Şarkı adı veya YouTube linki')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Çalan şarkıyı atlar'),

    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Müziği durdurur ve kanaldan çıkar'),

    new SlashCommandBuilder()
        .setName('kuyruk')
        .setDescription('Sıradaki şarkıları gösterir'),

    new SlashCommandBuilder()
        .setName('sifirla')
        .setDescription('Oynatma sırasını temizler'),

    // 🛠️ Sistem Komutları
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun ping değerini gösterir'),

    new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları listeler'),

    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Sistem durumunu kontrol eder')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ⚙️ Yönetim Komutları
    new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Sunucu ön ekini değiştirir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('yeni_prefix')
                .setDescription('Yeni ön ek (maksimum 10 karakter)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
];
