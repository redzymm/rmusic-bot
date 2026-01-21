const { spawn } = require('child_process');
const path = require('path');

console.log('[SYSTEM] Starting Development Environment...');

// Start Vite
const vite = spawn('cmd', ['/c', 'npx vite'], {
    shell: true,
    env: { ...process.env, FORCE_COLOR: 'true' }
});

vite.stdout.on('data', (data) => {
    const line = data.toString();
    console.log(`[VITE] ${line}`);

    if (line.includes('Local:') || line.includes('5178')) {
        console.log('[SYSTEM] Vite is ready, launching Electron...');
        const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
        const electron = spawn(electronPath, ['.'], {
            env: { ...process.env, NODE_ENV: 'development' },
            shell: true
        });

        electron.stdout.on('data', (data) => console.log(`[ELECTRON] ${data}`));
        electron.stderr.on('data', (data) => console.error(`[ELECTRON ERR] ${data}`));

        electron.on('close', () => {
            vite.kill();
            process.exit();
        });
    }
});

vite.stderr.on('data', (data) => console.error(`[VITE ERR] ${data}`));
