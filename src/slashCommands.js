const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Discord Slash Command Definitions
 * All slash commands are in English for global reach.
 * Use deploy-commands.js to register these commands.
 */

module.exports = [
    // 🎵 Music Commands
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist')
        .addStringOption(opt =>
            opt.setName('song')
                .setDescription('Song name or YouTube/Spotify link')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback and leave the voice channel'),

    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current song queue'),

    new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Clear the current queue'),

    // 🛠️ System Commands
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),

    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Check system status')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ⚙️ Management Commands
    new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change the server command prefix')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('new_prefix')
                .setDescription('New prefix (max 10 characters)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Delete a specified number of messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
];
