const { Shoukaku, Connectors } = require('shoukaku');
const { Client, GatewayIntentBits } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Nodes = [{
    name: 'test-node',
    url: '127.0.0.1:2333',
    auth: 'rmusic_lavalink_2024',
    secure: false
}];

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

console.log('--- LAVALINK DIAGNOSTIC START ---');
console.log('Target Node:', Nodes[0].url);

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
    moveOnDisconnect: false,
    resume: true,
    reconnectTries: 5,
    reconnectInterval: 2000
});

shoukaku.on('ready', (name) => {
    console.log(`✅ SUCCESS: Node ${name} connected!`);
    process.exit(0);
});

shoukaku.on('error', (name, error) => {
    console.error(`❌ ERROR: Node ${name} failed:`, error);
});

shoukaku.on('debug', (name, info) => {
    console.log(`[DEBUG] ${info}`);
});

setTimeout(() => {
    console.log('--- TIMEOUT: Connection taking too long ---');
    console.log('Current Node States:');
    for (const [name, node] of shoukaku.nodes) {
        console.log(`- ${name}: State ${node.state}`);
    }
    process.exit(1);
}, 15000);

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('❌ DISCORD LOGIN FAILED:', err.message);
    process.exit(1);
});
