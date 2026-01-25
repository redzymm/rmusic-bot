/**
 * RMusic Pro - Remote API Server
 * VM sunucusunda çalışacak HTTP API sunucusu
 * Dashboard bu API'ye bağlanarak botu uzaktan kontrol eder
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Load environment variables
// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Configuration - use environment variables with secure defaults
const PORT = process.env.API_PORT || 3001;
const API_KEY = process.env.API_SECRET_KEY || 'CHANGE_THIS_INSECURE_DEFAULT';

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json());

// API Key Authentication Middleware
const authenticate = (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.apiKey;
    console.log('[AUTH] Received key:', key ? key.substring(0, 10) + '...' : 'NONE');
    console.log('[AUTH] Expected key:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT_SET');
    if (key !== API_KEY) {
        console.log('[AUTH] Key mismatch! Full received:', key);
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
};

// Bot Process Management
let botProcess = null;
let botStatus = 'offline';
let botInfo = {};

// WebSocket Clients for log streaming
const wsClients = new Set();

wss.on('connection', (ws, req) => {
    // Authenticate WebSocket connections
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const key = url.searchParams.get('apiKey');

    if (key !== API_KEY) {
        ws.close(1008, 'Unauthorized');
        return;
    }

    wsClients.add(ws);
    console.log('[WS] Client connected. Total:', wsClients.size);

    // Send current status immediately
    ws.send(JSON.stringify({ type: 'status', status: botStatus, info: botInfo }));

    ws.on('close', () => {
        wsClients.delete(ws);
        console.log('[WS] Client disconnected. Total:', wsClients.size);
    });
});

// Broadcast to all WebSocket clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Send log to all clients with duplicate suppression
const logHistory = new Set();
const MAX_HISTORY = 10;

function sendLog(text, isError = false) {
    const clean = text.trim();
    if (!clean) return;

    // Check if we've seen this exact log very recently (within the last few lines)
    if (logHistory.has(clean)) return;

    // Manage history size
    logHistory.add(clean);
    if (logHistory.size > MAX_HISTORY) {
        const first = logHistory.values().next().value;
        logHistory.delete(first);
    }

    // Clear history item after 3 seconds to allow it again later if it's legitimate
    setTimeout(() => logHistory.delete(clean), 3000);

    broadcast({ type: 'log', text, isError, timestamp: Date.now() });
}

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Get bot status
app.get('/api/bot/status', authenticate, (req, res) => {
    res.json({
        status: botStatus,
        info: botInfo,
        uptime: botProcess ? process.uptime() : 0
    });
});

// Start bot
app.post('/api/bot/start', authenticate, (req, res) => {
    if (botProcess) {
        return res.json({ success: false, message: 'Bot zaten çalışıyor' });
    }

    const botPath = path.join(__dirname, 'src/index.js');

    if (!fs.existsSync(botPath)) {
        return res.status(404).json({ success: false, message: 'Bot dosyası bulunamadı: ' + botPath });
    }

    console.log(`[API] Bot başlatılıyor: ${botPath}`);
    sendLog(`[SYSTEM] Bot süreci başlatılıyor: ${path.basename(botPath)}`);

    try {
        botProcess = spawn('node', [botPath], {
            cwd: __dirname,
            env: { ...process.env, FORCE_COLOR: 'true', PYTHONIOENCODING: 'utf-8' }
        });
        sendLog(`[SYSTEM] İşlem ID (PID): ${botProcess.pid} oluşturuldu.`);
    } catch (spawnErr) {
        console.error(`[API_SPAWN_ERR] Spawn failed: ${spawnErr.message}`);
        return res.status(500).json({ success: false, message: 'Bot başlatılamadı: ' + spawnErr.message });
    }

    botProcess.stdout.on('data', (data) => {
        const str = data.toString('utf8');
        const lines = str.split('\n');

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            if (cleanLine.includes('DASHBOARD_DATA:')) {
                try {
                    const rawPart = cleanLine.split('DASHBOARD_DATA:')[1];
                    botInfo = JSON.parse(rawPart.trim());
                    broadcast({ type: 'bot-info', info: botInfo });
                } catch (e) { }
            } else {
                sendLog(line);
            }
        }
    });

    botProcess.stderr.on('data', (data) => {
        const str = data.toString('utf8');
        console.error(`[BOT_STDERR] ${str.trim()}`);
        if (str.includes('ffmpeg') || str.includes('FFMPEG')) {
            sendLog(`[FFMPEG] ${str}`);
        } else {
            sendLog(`[ERR] ${str}`, true);
        }
    });

    botProcess.on('error', (err) => {
        console.error(`[API_BOT_ERR] Failed to start bot process: ${err.message}`);
        sendLog(`[SYSTEM_ERR] Bot süreci başlatılamadı: ${err.message}`, true);
    });

    botProcess.on('close', (code) => {
        botStatus = 'offline';
        botProcess = null;
        broadcast({ type: 'status', status: 'offline', code });
        sendLog(`[SYSTEM] Bot kapandı. Kod: ${code}`);
    });

    botStatus = 'online';
    broadcast({ type: 'status', status: 'online' });
    res.json({ success: true, message: 'Bot başlatıldı' });
});

// Stop bot
app.post('/api/bot/stop', authenticate, (req, res) => {
    if (!botProcess) {
        return res.json({ success: false, message: 'Bot zaten kapalı' });
    }

    botProcess.kill();
    botProcess = null;
    botStatus = 'offline';
    broadcast({ type: 'status', status: 'offline' });
    res.json({ success: true, message: 'Bot durduruldu' });
});

// Emergency stop (kill all)
app.post('/api/bot/kill', authenticate, (req, res) => {
    if (botProcess) {
        botProcess.kill('SIGKILL');
    }

    // Kill all node processes on Windows (optional, be careful!)
    if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/IM', 'node.exe', '/T']);
    }

    botProcess = null;
    botStatus = 'offline';
    broadcast({ type: 'status', status: 'offline' });
    sendLog('[SYSTEM] ACİL DURDURMA YAPILDI.');
    res.json({ success: true, message: 'Acil durdurma yapıldı' });
});

// Bot control (volume, filters, etc.)
app.post('/api/bot/control', authenticate, (req, res) => {
    if (!botProcess) {
        return res.json({ success: false, message: 'Bot çalışmıyor' });
    }

    const data = req.body;
    botProcess.stdin.write(JSON.stringify(data) + '\n');
    res.json({ success: true, message: 'Komut gönderildi', data });
});

// Get config
app.get('/api/config', authenticate, (req, res) => {
    const configPath = path.join(__dirname, 'data/ayarlar.json');
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Token'ı gizle
        delete config.token;

        // Admin ID injection for Dashboard
        if (process.env.ADMIN_DISCORD_ID) {
            config.sysToken = Buffer.from(process.env.ADMIN_DISCORD_ID).toString('base64');
        }

        res.json(config);
    } catch (e) {
        res.status(500).json({ error: 'Config okunamadı', details: e.message });
    }
});

// Save config
app.post('/api/config', authenticate, (req, res) => {
    const configPath = path.join(__dirname, 'data/ayarlar.json');
    try {
        // Mevcut config'i oku (token'ı korumak için)
        let existing = {};
        if (fs.existsSync(configPath)) {
            existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // Token'ı koru
        const newConfig = { ...existing, ...req.body };
        if (existing.token) newConfig.token = existing.token;

        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

        // Reload config in bot
        if (botProcess) {
            botProcess.stdin.write(JSON.stringify({ cmd: 'reloadConfig' }) + '\n');
        }

        res.json({ success: true, message: 'Config kaydedildi' });
    } catch (e) {
        res.status(500).json({ error: 'Config kaydedilemedi', details: e.message });
    }
});

// Get audio settings
app.get('/api/audio-settings', authenticate, (req, res) => {
    const settingsPath = path.join(__dirname, 'data/settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            res.json(JSON.parse(fs.readFileSync(settingsPath, 'utf8')));
        } else {
            res.json({
                volume: 100,
                filters: { "8d": false, "bassboost": false, "nightcore": false },
                equalizer: Array(10).fill(0)
            });
        }
    } catch (e) {
        res.status(500).json({ error: 'Settings okunamadı' });
    }
});

// Get auto responses
app.get('/api/auto-responses', authenticate, (req, res) => {
    const arPath = path.join(__dirname, 'data/auto_responses.json');
    try {
        if (fs.existsSync(arPath)) {
            res.json(JSON.parse(fs.readFileSync(arPath, 'utf8')));
        } else {
            res.json([]);
        }
    } catch (e) {
        res.status(500).json({ error: 'Auto responses okunamadı' });
    }
});

// Save auto responses
app.post('/api/auto-responses', authenticate, (req, res) => {
    const arPath = path.join(__dirname, 'data/auto_responses.json');
    try {
        fs.writeFileSync(arPath, JSON.stringify(req.body, null, 2));
        if (botProcess) {
            botProcess.stdin.write(JSON.stringify({ cmd: 'reloadAutoResponses' }) + '\n');
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Kaydedilemedi' });
    }
});

// ========== START SERVER ==========
server.listen(PORT, '0.0.0.0', () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     RMusic Pro - Remote API Server         ║');
    console.log('╠════════════════════════════════════════════╣');
    console.log(`║  HTTP:  http://0.0.0.0:${PORT}               ║`);
    console.log(`║  WS:    ws://0.0.0.0:${PORT}/ws              ║`);
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('Dashboard bağlantısı bekleniyor...');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[API] Kapatılıyor...');
    if (botProcess) botProcess.kill();
    server.close();
    process.exit();
});
