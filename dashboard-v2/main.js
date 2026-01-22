const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const remoteMain = require('@electron/remote/main');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

// Initialize @electron/remote
remoteMain.initialize();

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// ========== REMOTE MODE CONFIGURATION ==========
let remoteConfig = { mode: 'local', serverUrl: '', apiKey: '' };
let remoteWs = null;
let isRemoteConnected = false;

function loadRemoteConfig() {
    try {
        const configPath = path.join(__dirname, '../data/remote-config.json');
        if (fs.existsSync(configPath)) {
            remoteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('[REMOTE] Config loaded:', remoteConfig.mode, remoteConfig.serverUrl);
        }
    } catch (e) {
        console.error('[REMOTE] Config load error:', e);
    }
}

function isRemoteMode() {
    return remoteConfig.mode === 'remote' && remoteConfig.serverUrl;
}

async function remoteRequest(endpoint, method = 'GET', body = null) {
    const url = `${remoteConfig.serverUrl}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': remoteConfig.apiKey
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(url, options);
        return await response.json();
    } catch (e) {
        console.error('[REMOTE] Request failed:', e.message);
        return { success: false, error: e.message };
    }
}

function connectRemoteWebSocket() {
    if (!isRemoteMode()) return;

    const wsUrl = remoteConfig.serverUrl.replace('http', 'ws') + `/ws?apiKey=${remoteConfig.apiKey}`;
    console.log('[REMOTE] Connecting WebSocket:', wsUrl);

    remoteWs = new WebSocket(wsUrl);

    remoteWs.on('open', () => {
        isRemoteConnected = true;
        console.log('[REMOTE] WebSocket connected');
        if (mainWindow) mainWindow.webContents.send('remote-connection', true);
    });

    remoteWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'status') {
                if (mainWindow) mainWindow.webContents.send('bot-status', msg.status);
            } else if (msg.type === 'log') {
                if (mainWindow) mainWindow.webContents.send('bot-log', msg.text);
            } else if (msg.type === 'bot-info') {
                if (mainWindow) mainWindow.webContents.send('bot-info', msg.info);
            }
        } catch (e) { }
    });

    remoteWs.on('close', () => {
        isRemoteConnected = false;
        console.log('[REMOTE] WebSocket disconnected');
        if (mainWindow) mainWindow.webContents.send('remote-connection', false);

        // Auto-reconnect after 5 seconds
        setTimeout(() => {
            if (isRemoteMode()) connectRemoteWebSocket();
        }, 5000);
    });

    remoteWs.on('error', (err) => {
        console.error('[REMOTE] WebSocket error:', err.message);
    });
}

// Discord OAuth2 Config (Uygulama Bilgileri)
const DISCORD_CLIENT_ID = '950813277007515709';
const REDIRECT_URI = 'http://localhost:3000/callback';

let mainWindow;
let botProcess;
let tray = null;
let isQuitting = false;

// Callback Server (Tarayıcıdan tokeni yakalamak için)
http.createServer((req, res) => {
    if (req.url.startsWith('/callback')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <html>
                <body style="background: #050507; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
                    <h1 style="color: #ff4c4c;">RMusic Pro Bağlandı!</h1>
                    <p>Uygulamaya dönebilirsiniz. Bu pencereyi kapatabilirsiniz.</p>
                    <script>
                        const hash = window.location.hash;
                        if (hash) {
                            const params = new URLSearchParams(hash.substring(1));
                            const token = params.get('access_token');
                            if (token) {
                                if (!window.location.search.includes('token=')) {
                                    window.location.search = '?token=' + token;
                                }
                            }
                        }
                    </script>
                </body>
            </html>
        `);

        const url = new URL(req.url, 'http://localhost:3000');
        const token = url.searchParams.get('token');
        if (token) {
            fetch('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'User-Agent': 'RMusicProDashboard (v3.0)'
                }
            })
                .then(r => r.json())
                .then(userData => {
                    if (mainWindow) mainWindow.webContents.send('discord-user-data', userData);
                });
        }
    }
}).listen(3000);

let splashWindow = null;

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        backgroundColor: '#050507',
        resizable: false,
        center: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false, // Önce gizle
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Hazır olunca göster
    splashWindow.once('ready-to-show', () => {
        splashWindow.show();
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        frame: false,
        backgroundColor: '#050507',
        show: false, // ÖNCE GİZLE, SONRA HAZIR OLUNCA GÖSTER
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        icon: path.join(__dirname, 'icon.ico'),
    });

    // Enable @electron/remote for this window
    remoteMain.enable(mainWindow.webContents);

    // Pencere hazır olduğunda göster (titreme önlenir)
    mainWindow.once('ready-to-show', () => {
        // Splash kapatılır, ana pencere açılır
        setTimeout(() => {
            if (splashWindow) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
        }, 1500); // 1.5 saniye bekle (loading animasyonu tamamlansın)
    });

    const startUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:5178'
        : `file://${path.join(__dirname, 'dist/index.html')}`;

    console.log(`[SYSTEM] URL yükleniyor: ${startUrl}`);
    mainWindow.loadURL(startUrl);

    // Hata ayıklama için yükleme hatalarını izle
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[SYSTEM] Yükleme hatası: ${errorCode} - ${errorDescription}`);
    });

    // mainWindow.webContents.openDevTools();

    // Kapanma isteği geldiğinde
    mainWindow.on('close', (event) => {
        if (!isQuitting && botProcess) {
            event.preventDefault();
            mainWindow.hide();

            if (!tray) {
                tray = new Tray(path.join(__dirname, 'icon.ico'));
                const contextMenu = Menu.buildFromTemplate([
                    { label: 'RMusic Pro\'yu Göster', click: () => mainWindow.show() },
                    {
                        label: 'Tamamen Kapat',
                        click: () => {
                            isQuitting = true;
                            if (botProcess) botProcess.kill();
                            app.quit();
                        }
                    }
                ]);
                tray.setToolTip('RMusic Pro (Active)');
                tray.setContextMenu(contextMenu);

                tray.on('click', () => {
                    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
                });
            }
            // Kullanıcıya bildirim (Opsiyonel, Windows otomatik yapar genelde)
            tray.displayBalloon({
                title: 'RMusic Pro',
                content: 'Müzik devam ediyor 🎵 Arka plana alındı.',
                iconType: 'info'
            });
        } else {
            // Normal kapanış
            /* Defer key process killing to window-all-closed or just let it happen naturally */
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Uygulama hazır olduğunda pencere oluştur
app.whenReady().then(() => {
    loadRemoteConfig();
    createSplashWindow();
    createWindow();

    // Connect to remote server if in remote mode
    if (isRemoteMode()) {
        setTimeout(connectRemoteWebSocket, 1000);
    }
});

app.on('window-all-closed', () => {
    if (botProcess) botProcess.kill();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    isQuitting = true;
});

// IPC KONTROLLERİ
ipcMain.on('start-bot', async () => {
    // REMOTE MODE
    if (isRemoteMode()) {
        const result = await remoteRequest('/api/bot/start', 'POST');
        if (mainWindow) {
            mainWindow.webContents.send('bot-log', `[REMOTE] ${result.message || result.error}`);
        }
        return;
    }

    // LOCAL MODE
    if (botProcess) botProcess.kill();

    const botPath = path.join(__dirname, '../src/index.js');
    botProcess = spawn('node', [botPath], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, FORCE_COLOR: true, PYTHONIOENCODING: 'utf-8' }
    });

    botProcess.stdout.on('data', (data) => {
        const str = data.toString('utf8');
        if (str.includes('DASHBOARD_DATA:')) {
            const rawPart = str.split('DASHBOARD_DATA:')[1].split('\n')[0];
            try {
                const info = JSON.parse(rawPart.trim());
                if (mainWindow) mainWindow.webContents.send('bot-info', info);
            } catch (e) { }
            return;
        }
        if (mainWindow) mainWindow.webContents.send('bot-log', str);
    });

    botProcess.stderr.on('data', (data) => {
        const str = data.toString('utf8');
        // FFmpeg mesajlarını [FFMPEG] olarak işaretle (bilgilendirme, hata değil)
        if (str.includes('ffmpeg') || str.includes('FFMPEG') || str.includes('Stream mapping') || str.includes('Duration:') || str.includes('Output #')) {
            if (mainWindow) mainWindow.webContents.send('bot-log', `[FFMPEG] ${str}`);
        } else {
            if (mainWindow) mainWindow.webContents.send('bot-log', `[ERR] ${str}`);
        }
    });

    botProcess.on('close', () => {
        if (mainWindow) mainWindow.webContents.send('bot-status', 'offline');
        botProcess = null;
    });

    if (mainWindow) mainWindow.webContents.send('bot-status', 'online');
});

ipcMain.on('stop-bot', async () => {
    // REMOTE MODE
    if (isRemoteMode()) {
        const result = await remoteRequest('/api/bot/stop', 'POST');
        if (mainWindow) {
            mainWindow.webContents.send('bot-log', `[REMOTE] ${result.message || result.error}`);
        }
        return;
    }

    // LOCAL MODE
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
        if (mainWindow) mainWindow.webContents.send('bot-status', 'offline');
    }
});

ipcMain.on('kill-all-bot', async () => {
    // REMOTE MODE
    if (isRemoteMode()) {
        const result = await remoteRequest('/api/bot/kill', 'POST');
        if (mainWindow) {
            mainWindow.webContents.send('bot-log', `[REMOTE] ${result.message || result.error}`);
        }
        return;
    }

    // LOCAL MODE
    if (botProcess) botProcess.kill('SIGKILL');
    if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/IM', 'node.exe', '/T']);
    }
    if (mainWindow) {
        mainWindow.webContents.send('bot-status', 'offline');
        mainWindow.webContents.send('bot-log', '[SYSTEM] ACİL DURDURMA YAPILDI.');
    }
});

ipcMain.on('window-control', (event, action, data) => {
    if (!mainWindow) return;
    switch (action) {
        case 'close': mainWindow.close(); break;
        case 'minimize': mainWindow.minimize(); break;
        case 'maximize':
            if (mainWindow.isMaximized()) mainWindow.unmaximize();
            else mainWindow.maximize();
            break;
        case 'start-drag':
            // For IPC-based dragging
            const { x, y } = data || {};
            if (x !== undefined && y !== undefined) {
                mainWindow.setPosition(x, y);
            }
            break;
    }
});

ipcMain.handle('get-audio-settings', async () => {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (e) {
        console.error('[SETTINGS_LOAD_ERR]', e);
    }
    return {
        volume: 100,
        filters: { "8d": false, "bassboost": false, "nightcore": false },
        equalizer: Array(10).fill(0)
    };
});

ipcMain.handle('get-config', async () => {
    const configPath = path.join(__dirname, '../data/ayarlar.json');
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.adminPassword) config.adminPassword = '3131';
        return config;
    } catch (e) {
        return {
            prefix: '!',
            theme: 'Red Ultra',
            adminPassword: '3131',
            disabled_commands: []
        };
    }
});

ipcMain.on('save-config', (event, config) => {
    const configPath = path.join(__dirname, '../data/ayarlar.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    if (botProcess) botProcess.stdin.write(JSON.stringify({ cmd: 'reloadConfig' }) + '\n');
});

ipcMain.handle('get-remote-config', async () => {
    return remoteConfig;
});

ipcMain.on('save-remote-config', (event, config) => {
    remoteConfig = config;
    const configPath = path.join(__dirname, '../data/remote-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Reconnect if mode changed to remote
    if (isRemoteMode()) {
        connectRemoteWebSocket();
    } else {
        if (remoteWs) {
            remoteWs.close();
            remoteWs = null;
        }
    }
});

ipcMain.handle('get-auto-responses', async () => {
    const arPath = path.join(__dirname, '../data/auto_responses.json');
    try {
        if (fs.existsSync(arPath)) {
            return JSON.parse(fs.readFileSync(arPath, 'utf8'));
        }
    } catch (e) {
        console.error('[AUTO_RESPONSE_LOAD_ERR]', e);
    }
    return [];
});

ipcMain.on('save-auto-responses', (event, responses) => {
    const arPath = path.join(__dirname, '../data/auto_responses.json');
    fs.writeFileSync(arPath, JSON.stringify(responses, null, 2));
    if (botProcess) botProcess.stdin.write(JSON.stringify({ cmd: 'reloadAutoResponses' }) + '\n');
});

ipcMain.on('bot-control', async (event, data) => {
    // REMOTE MODE
    if (isRemoteMode()) {
        await remoteRequest('/api/bot/control', 'POST', data);
        return;
    }

    // LOCAL MODE
    if (botProcess) {
        botProcess.stdin.write(JSON.stringify(data) + '\n');
    }

    // Auto-persist audio settings in main.js so they save even when bot is offline
    if (['volume', 'toggleFilter', 'equalizer'].includes(data.cmd)) {
        persistAudioSettings(data);
    }
});

function persistAudioSettings(update) {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    let current = {
        volume: 100,
        filters: { "8d": false, "bassboost": false, "nightcore": false },
        equalizer: Array(10).fill(0)
    };

    try {
        if (fs.existsSync(settingsPath)) {
            current = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (e) { }

    if (update.cmd === 'volume') current.volume = parseInt(update.value);
    if (update.cmd === 'toggleFilter') {
        current.filters = current.filters || { "8d": false, "bassboost": false, "nightcore": false };
        current.filters[update.value] = !current.filters[update.value];
    }
    if (update.cmd === 'equalizer') {
        const [bid, val] = update.value.split(':').map(Number);
        current.equalizer = current.equalizer || Array(10).fill(0);
        current.equalizer[bid] = val;
    }

    try {
        fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2));
    } catch (e) {
        console.error('[PERSIST_ERR]', e);
    }
}

ipcMain.handle('search-youtube', async (event, query) => {
    return new Promise((resolve) => {
        const ytDlpPath = path.join(__dirname, '../node_modules/@distube/yt-dlp/bin/yt-dlp.exe');
        const child = spawn(ytDlpPath, [
            '--encoding', 'UTF-8', '--quiet', '--no-warnings',
            '--get-title', '--get-id', '--get-thumbnail', '--get-duration',
            '--default-search', `ytsearch5:`, query
        ], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });

        let outputBuffer = [];
        child.stdout.on('data', (d) => outputBuffer.push(d));
        child.on('close', () => {
            const output = Buffer.concat(outputBuffer).toString('utf8');
            const lines = output.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim());
            const results = [];
            for (let i = 0; i < lines.length; i += 4) {
                if (lines[i] && lines[i + 1]) {
                    results.push({ title: lines[i], id: lines[i + 1], thumbnail: lines[i + 2], duration: lines[i + 3] });
                }
            }
            resolve(results);
        });
    });
});

ipcMain.on('play-local', async (event, { id, title }) => {
    const ytDlpPath = path.join(__dirname, '../node_modules/@distube/yt-dlp/bin/yt-dlp.exe');
    const child = spawn(ytDlpPath, [
        '--quiet', '--no-warnings',
        '--no-playlist', '--no-cache-dir',
        '--no-check-certificates',
        '--format', 'bestaudio[ext=webm]/bestaudio',
        '--socket-timeout', '5',
        '--get-url', `https://www.youtube.com/watch?v=${id}`
    ]);
    let url = '';
    child.stdout.on('data', (d) => url += d.toString().trim());
    child.stderr.on('data', (d) => console.error('[PLAY-LOCAL ERR]', d.toString()));
    child.on('close', (code) => {
        if (url && mainWindow) {
            console.log('[PLAY-LOCAL] URL obtained successfully');
            mainWindow.webContents.send('playback-status', { status: 'playing', title, url, id });
        } else {
            console.error('[PLAY-LOCAL] Failed to get URL, code:', code);
            if (mainWindow) mainWindow.webContents.send('bot-log', `[ERR] Müzik URL alınamadı: ${title}`);
        }
    });
});

ipcMain.on('stop-local', () => {
    if (mainWindow) mainWindow.webContents.send('playback-status', { status: 'stopped' });
});

// External link açma (Discord davet vb.)
ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url);
});

// Discord Login OAuth2 (Tarayıcı Yönlendirmeli)
ipcMain.on('login-discord', () => {
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=token&scope=identify`;
    shell.openExternal(authUrl);
});

// Beam to Server (Yerel müziği sunucuya fırlat)
ipcMain.on('beam-to-server', (event, data) => {
    // data: { title, url, currentTime, userId }
    if (botProcess) {
        botProcess.stdin.write(`beam:${JSON.stringify(data)}\n`);
        if (mainWindow) mainWindow.webContents.send('bot-log', `[SYSTEM] Müziği sunucuya fırlatıyorum: ${data.title}`);
    }
});

// Deploy Slash Commands (Dashboard'dan tetiklenir)
ipcMain.handle('deploy-slash-commands', async (event, isGlobal = false) => {
    const { spawn } = require('child_process');
    const deployScript = path.join(__dirname, '../src/deploy-commands.js');

    return new Promise((resolve) => {
        const args = isGlobal ? [deployScript, '--global'] : [deployScript];
        const child = spawn('node', args, {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env }
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
            if (mainWindow) mainWindow.webContents.send('bot-log', data.toString());
        });

        child.stderr.on('data', (data) => {
            error += data.toString();
            if (mainWindow) mainWindow.webContents.send('bot-log', `[ERR] ${data.toString()}`);
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: 'Slash komutları başarıyla kaydedildi!', output });
            } else {
                resolve({ success: false, error: error || 'Deployment failed', output });
            }
        });
    });
});

// Get Slash Commands List (Dashboard için)
ipcMain.handle('get-slash-commands', async () => {
    try {
        const slashCommands = require('../src/slashCommands.js');
        return slashCommands.map(cmd => ({
            name: cmd.name,
            description: cmd.description
        }));
    } catch (e) {
        console.error('[SLASH_CMD_LIST_ERR]', e);
        return [];
    }
});

ipcMain.handle('ask-ai', async (event, { log }) => {
    const configPath = path.join(__dirname, '../data/ayarlar.json');
    let config = {};
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!config.adminPassword) config.adminPassword = '3131';
    } catch (e) {
        // Fallback or handle missing file
        config = { aiProvider: 'gemini', adminPassword: '3131' };
    }

    const { aiProvider, aiApiKey } = config;

    if (!aiApiKey) {
        throw new Error("API Key not configured. Please go to Settings > RMusic Guardian.");
    }

    const prompt = `
    You are RMusic Guardian, an AI assistant for a music bot dashboard.
    Analyze the following error log and provide a helpful diagnosis and a fix.
    
    Error Log: "${log}"
    
    Format your response exactly as a JSON object:
    {
      "diagnosis": "Short explanation of what went wrong in Turkish (max 2 sentences).",
      "fix": "Specific instruction on how to fix it in Turkish (max 2 sentences)."
    }
    `;

    try {
        const result = await callAI(aiProvider, aiApiKey, prompt);
        return result;
    } catch (error) {
        throw new Error("AI Request Failed: " + error.message);
    }
});

async function callAI(provider, apiKey, prompt) {
    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const content = data.choices[0].message.content;
        try {
            return JSON.parse(content);
        } catch {
            return { diagnosis: content, fix: "See diagnosis." };
        }
    } else {
        // Default to Gemini
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const content = data.candidates[0].content.parts[0].text;
        // Clean markdown code blocks if present
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(cleanContent);
        } catch {
            return { diagnosis: cleanContent, fix: "See diagnosis." };
        }
    }
}
