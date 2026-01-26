import React, { useState, useEffect } from 'react';
import {
    Home,
    Music,
    Settings,
    Terminal,
    ShieldCheck,
    Power,
    X,
    Minus,
    Search,
    Play,
    Pause,
    Square,
    Volume2,
    Activity,
    Cpu,
    Wifi,
    Users,
    Zap,
    Sliders,
    Disc,
    Palette,
    Lock,
    Moon,
    Sun,
    Eye,
    EyeOff,
    Flame,
    Waves,
    Leaf,
    Crown,
    Bot,
    AlertTriangle,
    Loader,
    LogOut,
    MessageSquare,
    Plus,
    Trash2,
    ChevronDown,
    Shield,
    Check,
    User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ipc = window.require ? window.require('electron').ipcRenderer : {
    send: (channel) => console.log(`[IPC SEND] ${channel}`),
    on: (channel, cb) => console.log(`[IPC ON] ${channel}`),
    invoke: async (channel) => ({ prefix: '!', disabled_commands: [] })
};

// --- Constants ---
const THEMES = [
    { name: 'Red Ultra', color: '#ff4c4c', rgb: '255 76 76', glow: 'rgba(255, 76, 76, 0.4)', icon: Flame },
    { name: 'Neon Blue', color: '#00d2ff', rgb: '0 210 255', glow: 'rgba(0, 210, 255, 0.4)', icon: Waves },
    { name: 'Emerald', color: '#00ff88', rgb: '0 255 136', glow: 'rgba(0, 255, 136, 0.4)', icon: Leaf },
    { name: 'Gold Pulse', color: '#ffcc00', rgb: '255 204 0', glow: 'rgba(255, 204, 0, 0.4)', icon: Crown }
];

const SettingsView = React.memo(({ config, setConfig, isSystemAdmin, discordUser, remoteConfig, saveRemoteConfig, botData }) => {
    if (!config) return null;
    const [localPrefix, setLocalPrefix] = useState(config.prefix || '!');

    const applyTheme = (t) => {
        document.documentElement.style.setProperty('--brand-rgb', t.rgb);
        document.documentElement.style.setProperty('--brand-color', t.color);
        document.documentElement.style.setProperty('--brand-glow', t.glow);
        const newConfig = { ...config, theme: t.name };
        setConfig(newConfig);
        ipc.send('save-config', newConfig);
    };

    return (
        <div className="space-y-8">
            <header>
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-8 h-[2px] bg-brand-red" />
                    <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Core Configuration</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Settings <span className="text-brand-red">Hub</span></h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* 1. Aesthetics Grid */}
                <div className="bg-[#ffffff05] border border-white/5 p-4 rounded-2xl space-y-4 border-white/5 lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red">
                                <Palette size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest">Aesthetics Studio</h3>
                                <p className="text-[10px] text-white/30 uppercase font-black">Design & Themes</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {THEMES.map(t => {
                            const Icon = t.icon;
                            return (
                                <button
                                    key={t.name}
                                    onClick={() => applyTheme(t)}
                                    style={{
                                        boxShadow: config.theme === t.name ? `0 0 30px ${t.glow}33` : 'none',
                                        borderColor: config.theme === t.name ? t.color : 'rgba(255,255,255,0.05)'
                                    }}
                                    className={`p-3 rounded-xl btn-animate flex flex-col items-center gap-2 border group relative overflow-hidden ${config.theme === t.name ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10 hover:border-white/20'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${config.theme === t.name ? 'scale-110 neo-glow' : 'opacity-40 group-hover:opacity-100 group-hover:scale-105'}`} style={{ color: t.color, backgroundColor: `${t.color}15`, '--brand-glow': t.color }}>
                                        <Icon size={20} />
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.1em] transition-all ${config.theme === t.name ? 'opacity-100' : 'opacity-30'}`}>{t.name}</span>
                                    {config.theme === t.name && (
                                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: t.color, boxShadow: `0 0 10px ${t.color}` }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Prefix Settings */}
                <div className="glass p-4 rounded-2xl space-y-4 border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <Terminal size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest">Bot Prefix</h3>
                            <p className="text-[10px] text-white/30 uppercase font-black">Command Prefix</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={localPrefix}
                            onChange={e => setLocalPrefix(e.target.value)}
                            className="w-full bg-white/5 border border-white/5 p-3 rounded-xl outline-none focus:border-brand-red focus:bg-white/10 transition-all font-black text-xl text-center shadow-inner"
                        />
                        <button
                            onClick={() => {
                                setConfig(prev => ({ ...prev, prefix: localPrefix }));
                                ipc.send('save-config', { ...config, prefix: localPrefix });
                            }}
                            className="bg-brand-red px-4 rounded-xl btn-animate font-black text-[10px] uppercase tracking-[0.1em] shadow-lg shadow-brand-red/20 text-white"
                        >
                            SET
                        </button>
                    </div>
                </div>

                <div className="glass p-4 rounded-2xl gap-4 border-brand-red/10 bg-brand-red/5 flex flex-col justify-between lg:col-span-1">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-red/20 rounded-xl flex items-center justify-center text-brand-red">
                                <Zap size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest">System Core</h3>
                                <p className="text-[10px] text-white/30 uppercase font-black">All-in-One Control</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex bg-white/5 p-1 rounded-xl gap-1 relative overflow-hidden">
                                {/* Animated Selector Background */}
                                <motion.div
                                    className="absolute inset-y-1 bg-brand-red rounded-lg shadow-lg shadow-brand-red/20 z-0"
                                    initial={false}
                                    animate={{
                                        x: remoteConfig.mode === 'local' ? '0%' :
                                            (remoteConfig.serverUrl.includes('35.187.186.246') ? '100%' : '200%'),
                                        width: 'calc(33.33% - 2.6px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />

                                <button
                                    onClick={() => {
                                        saveRemoteConfig({ ...remoteConfig, mode: 'local', serverUrl: 'http://localhost:3001' });
                                        ipc.send('bot-control', { cmd: 'switchServer', value: 'LOCAL' });
                                    }}
                                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors duration-200 z-10 ${remoteConfig.mode === 'local' ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    LOCAL
                                </button>
                                <button
                                    onClick={() => {
                                        saveRemoteConfig({ ...remoteConfig, mode: 'remote', serverUrl: 'http://35.187.186.246:3001' });
                                        ipc.send('bot-control', { cmd: 'switchServer', value: 'LOW_VM' });
                                    }}
                                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors duration-200 z-10 ${remoteConfig.mode === 'remote' && remoteConfig.serverUrl.includes('35.187.186.246') ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    LOW VM
                                </button>
                                <button
                                    onClick={() => {
                                        saveRemoteConfig({ ...remoteConfig, mode: 'remote', serverUrl: 'http://35.233.125.241:3001' });
                                        ipc.send('bot-control', { cmd: 'switchServer', value: 'HIGH_VM' });
                                    }}
                                    className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors duration-200 z-10 ${remoteConfig.mode === 'remote' && remoteConfig.serverUrl.includes('35.233.125.241') ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    HIGH VM
                                </button>
                            </div>
                            <div className="px-2">
                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${botData ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-red-500 animate-pulse'}`} />
                                    Active: <span className="text-white/50">{botData ? `${botData.activeServer} (${remoteConfig.mode.toUpperCase()})` : 'BAĞLANTI BEKLENİYOR...'}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Remote Connection Config (Hidden/Background) */}

                {/* 3. Discord Integration */}
                <div className="glass p-4 rounded-2xl space-y-4 border-[#5865F2]/20 bg-[#5865F2]/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#5865F2]/20 rounded-xl flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-[#5865F2]">Discord Hub</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => ipc.send('open-external', 'https://discord.com/api/oauth2/authorize?client_id=950813277007515709&permissions=8&scope=bot%20applications.commands')}
                        className="w-full py-3 bg-[#5865F2] text-white font-black text-[10px] tracking-widest uppercase rounded-xl hover:bg-[#4752C4] transition-none active:scale-95"
                    >
                        Botu Davet Et
                    </button>
                </div>


                {/* 4. Access Control */}
                <div className={`glass p-4 rounded-2xl space-y-4 border-white/5`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${isSystemAdmin ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} rounded-xl flex items-center justify-center`}>
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-widest text-white/90">Erişim Yönetimi</h3>
                                <p className="text-[10px] text-white/30 uppercase font-black">{isSystemAdmin ? 'SİSTEM SAHİBİ DOĞRULANDI' : 'ERİŞİM KISITLI'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                        {discordUser ? (
                            <>
                                <img src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                                <div>
                                    <p className="font-bold text-[10px]">{discordUser.username}</p>
                                </div>
                                <div className="ml-auto">
                                    {isSystemAdmin ? (
                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap">ADMİN</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-[9px] font-black uppercase tracking-widest">YETKİSİZ</span>
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest w-full text-center py-2">Discord hesabı bağlı değil</p>
                        )}
                    </div>
                </div>


                {/* 6. System Utilities */}
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl lg:col-span-3 flex flex-col md:flex-row items-center justify-between gap-6 pointer-events-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg uppercase tracking-widest text-red-500">System Core Utils</h3>
                            <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Maintenance & Emergency Force Exit</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="flex-1 md:flex-none px-8 py-4 bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all btn-animate flex items-center justify-center gap-2"
                        >
                            <X size={14} /> Önbelleği Sıfırla
                        </button>
                        <button
                            onClick={() => ipc.send('kill-all-bot')}
                            className="flex-1 md:flex-none px-8 py-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all btn-animate flex items-center justify-center gap-2"
                        >
                            <Zap size={14} /> Botu Zorla Durdur
                        </button>
                    </div>
                </div>

            </div>

            <div className="flex items-center justify-center gap-4 py-8">
                <div className="h-[1px] flex-1 bg-white/5" />
                <p className="text-[10px] text-brand-red/50 font-black uppercase tracking-[0.4em] flex items-center gap-2">
                    <Zap size={14} className="animate-pulse" /> Hot-reload active
                </p>
                <div className="h-[1px] flex-1 bg-white/5" />
            </div>
        </div>
    );
});

export default function App() {
    const [activeTab, setActiveTab] = useState('Home');
    const [botStatus, setBotStatus] = useState('offline');
    const [botData, setBotData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [nowPlayingLocal, setNowPlayingLocal] = useState(null);
    const [nowPlayingLocalId, setNowPlayingLocalId] = useState(null);
    const [config, setConfig] = useState(null);
    const [localVolume, setLocalVolume] = useState(() => {
        const saved = localStorage.getItem('localVolume');
        return saved ? parseFloat(saved) : 1;
    });
    const [autoResponses, setAutoResponses] = useState([]);
    const [discordUser, setDiscordUser] = useState(() => {
        const saved = localStorage.getItem('discordUser');
        return saved ? JSON.parse(saved) : null;
    });
    const [remoteConfig, setRemoteConfig] = useState({ mode: 'local', serverUrl: '', apiKey: '' });

    useEffect(() => {
        const loadConfig = async () => {
            const rc = await ipc.invoke('get-remote-config');
            if (rc) setRemoteConfig(rc);
        };
        loadConfig();
    }, []);

    const saveRemoteConfig = (newConfig) => {
        setRemoteConfig(newConfig);
        ipc.send('save-remote-config', newConfig);
    };

    const isSystemAdmin = discordUser && config && config.sysToken && String(discordUser.id) === String(atob(config.sysToken));
    const audioRef = React.useRef(new Audio());
    const audioContextRef = React.useRef(null);
    const sourceRef = React.useRef(null);
    const eqNodesRef = React.useRef([]);
    const masterGainRef = React.useRef(null);
    const pannerNodeRef = React.useRef(null);
    const bassNodeRef = React.useRef(null);
    const logBufferRef = React.useRef([]); // Buffer for logs

    const loginDiscord = () => ipc.send('login-discord');

    // --- Discord Logout Implementation ---
    const logoutDiscord = () => {
        setDiscordUser(null);
        localStorage.removeItem('discordUser');
    };

    const updateVolume = (val) => {
        setBotData(prev => ({ ...prev, volume: parseInt(val) }));
        ipc.send('bot-control', { cmd: 'volume', value: val });
    };

    const toggleFilter = (f) => {
        setBotData(prev => {
            const filters = prev?.filters || {};
            return { ...prev, filters: { ...filters, [f]: !filters[f] } };
        });
        ipc.send('bot-control', { cmd: 'toggleFilter', value: f });
    };

    const setEQ = (band, val) => {
        setBotData(prev => {
            const eq = [...(prev?.equalizer || Array(10).fill(0))];
            eq[band] = parseInt(val);
            return { ...prev, equalizer: eq };
        });
        ipc.send('bot-control', { cmd: 'equalizer', value: `${band}:${val}` });
    };

    const beamToServer = () => {
        if (!nowPlayingLocalId || !discordUser) return;
        ipc.send('beam-to-server', {
            title: nowPlayingLocal,
            url: `https://www.youtube.com/watch?v=${nowPlayingLocalId}`,
            currentTime: audioRef.current.currentTime,
            userId: discordUser.id
        });
    };

    // --- Local Audio Engine Setup ---
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // Setup crossOrigin for EQ processing
        audio.crossOrigin = "anonymous";

        if (!audioContextRef.current) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();

                sourceRef.current = audioContextRef.current.createMediaElementSource(audio);

                // Equalizer Bands
                const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
                eqNodesRef.current = frequencies.map(freq => {
                    const node = audioContextRef.current.createBiquadFilter();
                    node.type = 'peaking';
                    node.frequency.value = freq;
                    node.Q.value = 1;
                    node.gain.value = 0;
                    return node;
                });

                // Bassboost Node
                bassNodeRef.current = audioContextRef.current.createBiquadFilter();
                bassNodeRef.current.type = 'lowshelf';
                bassNodeRef.current.frequency.value = 200;
                bassNodeRef.current.gain.value = 0;

                // 8D Panner Node
                pannerNodeRef.current = audioContextRef.current.createPanner();
                pannerNodeRef.current.panningModel = 'HRTF';
                pannerNodeRef.current.distanceModel = 'inverse';

                // Master Gain
                masterGainRef.current = audioContextRef.current.createGain();

                // Connect Chain: Source -> EQ -> Bass -> Panner -> Gain -> Destination
                let current = sourceRef.current;
                eqNodesRef.current.forEach(node => {
                    current.connect(node);
                    current = node;
                });
                current.connect(bassNodeRef.current);
                current = bassNodeRef.current;
                current.connect(pannerNodeRef.current);
                current = pannerNodeRef.current;
                current.connect(masterGainRef.current);
                masterGainRef.current.connect(audioContextRef.current.destination);
            } catch (err) {
                console.error("Audio Context initialization failed:", err);
            }
        }
    }, []);

    // --- Audio Processor Sync ---
    useEffect(() => {
        if (!audioContextRef.current) return;

        // Apply Volume
        // Bot volume is 0-200, Gain is 0-2.0 (but we also have localVolume 0.0-1.0)
        const botVolume = (botData?.volume || 100) / 100;
        masterGainRef.current.gain.setTargetAtTime(botVolume * localVolume, audioContextRef.current.currentTime, 0.1);

        // Apply EQ
        const eqValues = botData?.equalizer || Array(10).fill(0);
        eqNodesRef.current.forEach((node, i) => {
            if (eqValues[i] !== undefined) {
                // EQ value is usually -10 to 10 in our UI, apply as gain
                node.gain.setTargetAtTime(eqValues[i], audioContextRef.current.currentTime, 0.1);
            }
        });

        // Apply Bassboost
        const isBassboost = botData?.filters?.bassboost;
        bassNodeRef.current.gain.setTargetAtTime(isBassboost ? 15 : 0, audioContextRef.current.currentTime, 0.2);

        // Apply Nightcore (Playback Rate)
        const isNightcore = botData?.filters?.nightcore;
        audioRef.current.playbackRate = isNightcore ? 1.25 : 1.0;

    }, [botData, localVolume]);

    // --- 8D Animation Loop ---
    useEffect(() => {
        let animationFrame;
        const process8D = () => {
            if (botData?.filters?.['8d'] && audioContextRef.current && pannerNodeRef.current) {
                const angle = Date.now() / 1500;
                pannerNodeRef.current.setPosition(Math.sin(angle) * 3, 0, Math.cos(angle) * 3);
            } else if (pannerNodeRef.current) {
                pannerNodeRef.current.setPosition(0, 0, 0);
            }
            animationFrame = requestAnimationFrame(process8D);
        };
        process8D();
        return () => cancelAnimationFrame(animationFrame);
    }, [botData?.filters?.['8d']]);


    useEffect(() => {
        const interval = setInterval(() => {
            if (logBufferRef.current.length > 0) {
                const logsToAdd = [...logBufferRef.current];
                logBufferRef.current = [];
                setLogs(prev => {
                    // Optimized: only keep last 50 logs, batch update
                    const newLogs = [...prev, ...logsToAdd];
                    return newLogs.slice(-50);
                });
            }
        }, 150); // Update UI roughly 6-7 times per second (vs 100+)

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let isMounted = true;

        const logsHandler = (event, log) => {
            if (!isMounted) return;
            logBufferRef.current.push(log);
        };

        const statusHandler = (event, status) => { if (isMounted) setBotStatus(status); };
        const infoHandler = (event, data) => { if (isMounted) setBotData(data); };
        const userDataHandler = (event, data) => {
            if (!isMounted) return;
            setDiscordUser(data);
            localStorage.setItem('discordUser', JSON.stringify(data));
        };

        const playbackHandler = (event, data) => {
            if (!isMounted) return;
            if (data.status === 'playing' && data.url) {
                if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
                setNowPlayingLocal(data.title);
                setNowPlayingLocalId(data.id);
                if (audioRef.current) {
                    const audio = audioRef.current;
                    audio.pause();
                    audio.src = data.url;
                    audio.load();
                    audio.play().catch(e => {
                        console.error('Audio play failed, retrying without processing:', e);
                        audio.crossOrigin = null;
                        audio.src = data.url;
                        audio.load();
                        audio.play().catch(err => console.error('Final fallback failed:', err));
                    });
                }
            } else {
                setNowPlayingLocal(null);
                setNowPlayingLocalId(null);
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };

        const configHandler = (event, cfg) => {
            if (!isMounted) return;
            setConfig(cfg);
            if (cfg.darkMode !== undefined) {
                // Forcing dark mode internally, ignoring config set
                document.documentElement.setAttribute('data-theme', 'dark');
            }
            if (cfg.theme) {
                const foundTheme = THEMES.find(t => t.name === cfg.theme);
                if (foundTheme) {
                    document.documentElement.style.setProperty('--brand-rgb', foundTheme.rgb);
                    document.documentElement.style.setProperty('--brand-color', foundTheme.color);
                    document.documentElement.style.setProperty('--brand-glow', foundTheme.glow);
                }
            }
        };

        ipc.on('bot-log', logsHandler);
        ipc.on('bot-status', statusHandler);
        ipc.on('bot-info', infoHandler);
        ipc.on('discord-user-data', userDataHandler);
        ipc.on('playback-status', playbackHandler);
        ipc.on('config-data', configHandler); // Assuming 'config-data' is an event for config updates

        // Initial config load
        const loadInitialConfig = async () => {
            const cfg = await ipc.invoke('get-config');
            if (isMounted) {
                configHandler(null, cfg); // Use the same handler to apply initial config
            }

            // Load initial audio settings (Volume, Filter, EQ) even if bot is offline
            const audioSettings = await ipc.invoke('get-audio-settings');
            if (isMounted) {
                setBotData(prev => ({
                    ...prev,
                    volume: audioSettings.volume,
                    filters: audioSettings.filters,
                    equalizer: audioSettings.equalizer
                }));
            }
        };
        loadInitialConfig();

        const loadAutoResponses = async () => {
            const res = await ipc.invoke('get-auto-responses');
            if (isMounted) setAutoResponses(res);
        };
        loadAutoResponses();

        return () => {
            isMounted = false;
            ipc.removeAllListeners('bot-log');
            ipc.removeAllListeners('bot-status');
            ipc.removeAllListeners('bot-info');
            ipc.removeAllListeners('discord-user-data');
            ipc.removeAllListeners('playback-status');
            ipc.removeAllListeners('config-data');
        };
    }, []);

    const saveConfig = (newConfig) => {
        setConfig(newConfig);
        ipc.send('save-config', newConfig);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await ipc.invoke('search-youtube', searchQuery);
            setSearchResults(results);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const playMusic = (track) => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        ipc.send('play-local', track);

        // Reset search to return to main view
        setSearchQuery('');
        setSearchResults([]);
    };

    const stopMusic = () => {
        ipc.send('stop-local');
    };

    const startBot = () => ipc.send('start-bot');
    const stopBot = () => ipc.send('stop-bot');
    const closeApp = () => ipc.send('window-control', 'close');
    const minimizeApp = () => ipc.send('window-control', 'minimize');
    const killAll = () => ipc.send('kill-all-bot');



    const handleTabClick = (tabId) => {
        const protectedTabs = ['Commands', 'Logs'];
        if (protectedTabs.includes(tabId) && !isSystemAdmin) return;

        // Always reset search when switching tabs to ensure Player view is fresh
        setSearchQuery('');
        setSearchResults([]);
        setActiveTab(tabId);
    };


    const navItems = [
        { id: 'Home', icon: Home, label: 'Dashboard' },
        { id: 'Player', icon: Music, label: 'Music Player' },
        { id: 'Audio', icon: Sliders, label: 'Audio Engine' },
        { id: 'Commands', icon: ShieldCheck, label: 'Command Vault' },
        { id: 'Logs', icon: Terminal, label: 'System Logs' },
        { id: 'AutoResponse', icon: MessageSquare, label: 'Auto Response' },
        { id: 'Settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className={`relative flex h-screen w-full bg-[#050507] text-white font-sans overflow-hidden border border-white/5 rounded-2xl shadow-2xl`}>

            {/* Title Bar for Dragging - Mouse Event Based */}
            <div
                className="h-4 w-full absolute top-0 left-0 right-0 z-[100] cursor-move bg-transparent"
                onMouseDown={(e) => {
                    if (e.button !== 0) return; // Only left click
                    const startX = e.screenX;
                    const startY = e.screenY;

                    // Get current window position
                    const { ipcRenderer } = require('electron').remote || require('electron');
                    const remote = require('@electron/remote') || window.require?.('@electron/remote');

                    let win;
                    try {
                        win = remote?.getCurrentWindow?.() || require('electron').remote?.getCurrentWindow?.();
                    } catch {
                        // Fallback: use screen API
                    }

                    if (!win) return;

                    const [winX, winY] = win.getPosition();

                    const onMove = (moveEvent) => {
                        const deltaX = moveEvent.screenX - startX;
                        const deltaY = moveEvent.screenY - startY;
                        win.setPosition(winX + deltaX, winY + deltaY);
                    };

                    const onUp = () => {
                        document.removeEventListener('mousemove', onMove);
                        document.removeEventListener('mouseup', onUp);
                    };

                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp);
                }}
            />


            {/* Sidebar */}
            <div className={`w-20 md:w-64 glass-heavy h-full flex flex-col p-4 z-20 transition-colors border-r no-drag border-white/5`}>
                <div className="flex items-center gap-3 px-2 mb-10">
                    <div className="w-12 h-12 bg-brand-red rounded-xl flex items-center justify-center neo-glow overflow-hidden">
                        <img src="./src/assets/new_logo.png" className="w-full h-full object-cover" alt="R" />
                    </div>
                    <div className="hidden md:block">
                        <h2 className={`font-black text-xl tracking-[-0.05em] leading-none mb-1.5 text-white`}>RMUSIC</h2>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[8px] font-black tracking-[0.1em] bg-white/5 border-white/10 text-white/30`}>
                            VER <span className="text-brand-red ml-1">3.1.9</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const isLocked = ['Commands', 'Logs'].includes(item.id) && !isSystemAdmin;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors duration-150 group ${activeTab === item.id
                                    ? 'bg-brand-red text-white neo-glow'
                                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} className={activeTab === item.id ? '' : 'group-hover:scale-110 transition-none duration-150'} />
                                <span className="font-bold text-sm hidden md:block">{item.label}</span>
                                {isLocked && <Lock size={14} className="ml-auto text-white/20" />}
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-auto px-4 py-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${botStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-[10px] uppercase tracking-widest font-black hidden md:block text-white/40`}>
                            {botStatus === 'online' ? 'Engine Active' : 'Engine Ready'}
                        </span>
                    </div>
                    <div className="hidden md:block">
                        <p className={`text-[9px] uppercase font-black tracking-widest leading-tight text-white/20`}>Designed by</p>
                        <p className="text-[11px] text-brand-red font-black tracking-tighter cursor-default hover:text-white transition-colors duration-150">REDZYMM STUDIO</p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden no-drag">

                {/* Title Bar Buttons & Profile */}
                <div className="absolute top-0 right-0 p-4 flex items-center gap-4 z-50 no-drag">
                    {/* Discord Profile Segment */}
                    <div className={`relative flex items-center gap-3 glass p-1.5 pr-4 rounded-full border transition-none duration-100 group/profile border-white/5 hover:border-red-500/50 hover:bg-red-500/10`}>
                        {discordUser ? (
                            <button onClick={logoutDiscord} className="flex items-center gap-3 text-left w-full h-full">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#5865F2]/30 group-hover/profile:border-red-500 transition-colors">
                                    <img
                                        src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`}
                                        className="w-full h-full object-cover shadow-lg group-hover/profile:opacity-20 transition-opacity"
                                        alt=""
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/profile:opacity-100 transition-opacity">
                                        <LogOut size={14} className="text-red-500" />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black tracking-tight leading-tight group-hover/profile:text-red-500 transition-colors">{discordUser.global_name}</span>
                                    <span className="text-[8px] text-green-500 font-black uppercase tracking-widest leading-none group-hover/profile:text-red-400 group-hover/profile:content-['LOGOUT']">
                                        <span className="group-hover/profile:hidden">Online</span>
                                        <span className="hidden group-hover/profile:inline">LOGOUT</span>
                                    </span>
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={loginDiscord}
                                className="flex items-center gap-2 group"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#5865F2]/10 flex items-center justify-center border border-[#5865F2]/20 group-hover:bg-[#5865F2] group-hover:text-white transition-none duration-100">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">Discord Connect</span>
                            </button>
                        )}
                    </div>

                    <button onClick={minimizeApp} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"><Minus size={18} /></button>
                    <button onClick={closeApp} className="p-2 hover:bg-brand-red group rounded-lg transition-none text-white/40 hover:text-white"><X size={18} /></button>
                </div>

                <main className="flex-1 p-4 pt-10 overflow-y-auto custom-scroll">
                    {/* Global Admin Authentication Gate (Allow Settings always) */}
                    {!isSystemAdmin && activeTab !== 'Settings' ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-8">
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 mx-auto bg-brand-red/10 rounded-full flex items-center justify-center ring-4 ring-brand-red/20">
                                    <ShieldCheck size={40} className="text-brand-red" />
                                </div>
                                <h1 className="text-3xl font-black tracking-tighter uppercase">Erişim <span className="text-brand-red">Engellendi</span></h1>
                                <p className="text-sm text-white/40 max-w-md">
                                    Bu dashboard'a erişmek için sistem yöneticisi yetkisi gereklidir.
                                    Lütfen yetkili Discord hesabınızla giriş yapın.
                                </p>
                            </div>

                            {!discordUser ? (
                                <button
                                    onClick={loginDiscord}
                                    className="flex items-center gap-3 px-8 py-4 bg-[#5865F2] text-white font-black text-sm rounded-2xl hover:bg-[#4752C4] transition-all active:scale-95 shadow-xl shadow-[#5865F2]/30"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                                    </svg>
                                    Discord ile Giriş Yap
                                </button>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="flex items-center justify-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                                        <img src={`https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />
                                        <div className="text-left">
                                            <p className="font-bold text-sm">{discordUser.username}</p>
                                            <p className="text-[10px] text-red-400 uppercase font-black tracking-widest">Yetki Yok</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-white/30">Bu hesap sistem yöneticisi olarak tanımlanmamış.</p>
                                    <button
                                        onClick={logoutDiscord}
                                        className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest underline"
                                    >
                                        Farklı Hesapla Dene
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="h-full"
                            >
                                {activeTab === 'Home' && <HomeView status={botStatus} start={startBot} stop={stopBot} botInfo={botData} killAll={killAll} />}
                                {activeTab === 'Player' && (
                                    <PlayerView
                                        query={searchQuery}
                                        setQuery={setSearchQuery}
                                        results={searchResults}
                                        searching={isSearching}
                                        onSearch={handleSearch}
                                        onPlay={playMusic}
                                        onStop={stopMusic}
                                        playing={nowPlayingLocal}
                                        onBeam={discordUser ? beamToServer : null}
                                    />
                                )}
                                {activeTab === 'Audio' && (
                                    <AudioEngineView
                                        botInfo={botData}
                                        status={botStatus}
                                        updateVolume={updateVolume}
                                        toggleFilter={toggleFilter}
                                        setEQ={setEQ}
                                    />
                                )}
                                {activeTab === 'Logs' && <LogsView logs={logs} onSimulateLog={(l) => setLogs(p => [...p.slice(-49), l])} onClearLogs={() => setLogs([])} />}
                                {activeTab === 'Commands' && <CommandsView config={config} setConfig={saveConfig} killAll={killAll} botInfo={botData} isSystemAdmin={isSystemAdmin} />}
                                {activeTab === 'AutoResponse' && <AutoResponseView responses={autoResponses} setResponses={(r) => { setAutoResponses(r); ipc.send('save-auto-responses', r); }} isSystemAdmin={isSystemAdmin} />}
                                {activeTab === 'Settings' && <SettingsView config={config} setConfig={saveConfig} isSystemAdmin={isSystemAdmin} discordUser={discordUser} remoteConfig={remoteConfig} saveRemoteConfig={saveRemoteConfig} botData={botData} />}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </main>
            </div>


            <BottomPlayer
                audioRef={audioRef}
                audioContextRef={audioContextRef}
                nowPlayingLocal={nowPlayingLocal}
                localVolume={localVolume}
                setLocalVolume={setLocalVolume}
                discordUser={discordUser}
                beamToServer={beamToServer}
                onStop={stopMusic} // Pass the stopMusic function from App
            />
        </div>
    );
}


const BottomPlayer = ({ audioRef, audioContextRef, nowPlayingLocal, localVolume, setLocalVolume, discordUser, beamToServer, onStop }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPaused, setIsPaused] = useState(true);

    useEffect(() => {
        const audio = audioRef.current;
        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration || 0);
        const updateStatus = () => setIsPaused(audio.paused);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', updateStatus);
        audio.addEventListener('pause', updateStatus);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('play', updateStatus);
            audio.removeEventListener('pause', updateStatus);
        };
    }, [audioRef]);

    return (
        <AnimatePresence>
            {nowPlayingLocal && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    exit={{ y: 100 }}
                    className="fixed bottom-4 left-[20px] md:left-[270px] right-4 glass-heavy px-3 py-2 rounded-xl flex items-center gap-3 shadow-2xl z-50 border-brand-red/20 ring-1 ring-brand-red/30"
                >
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 h-8 bg-brand-red rounded-full flex items-center justify-center animate-spin-slow shadow-[0_0_15px_var(--brand-glow)]">
                            <Disc size={16} className="text-white/80" />
                        </div>
                        <div className="max-w-[140px] md:max-w-[200px]">
                            <p className="text-[8px] text-brand-red font-black uppercase tracking-widest">NOW STREAMING</p>
                            <p className="font-bold text-xs truncate">{nowPlayingLocal}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="flex items-center gap-3">
                            <Volume2 size={16} className="text-white/40" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={localVolume}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setLocalVolume(val);
                                    audioRef.current.volume = val;
                                    localStorage.setItem('localVolume', val.toString());
                                }}
                                className="w-16 md:w-20 accent-brand-red h-1 rounded-full cursor-pointer"
                            />
                        </div>

                        <div className="flex flex-col items-end gap-1 min-w-[100px] md:min-w-[120px]">
                            <div className="flex justify-between w-full text-[10px] font-black tracking-widest text-white/20">
                                <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                                <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setCurrentTime(val);
                                    audioRef.current.currentTime = val;
                                }}
                                className="w-24 md:w-48 accent-brand-red h-1 rounded-full cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                            {discordUser && (
                                <button
                                    onClick={beamToServer}
                                    className="w-8 h-8 md:w-9 md:h-9 bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white rounded-full flex items-center justify-center transition-none duration-150 group"
                                    title="Discord'a Fırlat"
                                >
                                    <Zap size={14} className="group-hover:scale-110" fill="currentColor" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (audioRef.current.paused) {
                                        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                                            audioContextRef.current.resume();
                                        }
                                        audioRef.current.play();
                                    }
                                    else audioRef.current.pause();
                                }}
                                className="w-8 h-8 md:w-9 md:h-9 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-none duration-150"
                                title={isPaused ? 'Oynat' : 'Duraklat'}
                            >
                                {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            </button>
                            <button
                                onClick={onStop}
                                className="w-8 h-8 md:w-9 md:h-9 bg-white/5 hover:bg-brand-red text-white rounded-full flex items-center justify-center transition-colors duration-150"
                                title="Durdur"
                            >
                                <Square size={14} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- Helper Components ---

const StatCard = React.memo(({ icon: Icon, label, value, color }) => {
    const colors = {
        red: 'text-brand-red',
        blue: 'text-blue-400',
        purple: 'text-purple-400',
        orange: 'text-orange-400',
        green: 'text-green-400'
    };

    const glowColors = {
        red: 'rgba(255, 76, 76, 0.4)',
        blue: 'rgba(96, 165, 250, 0.4)',
        purple: 'rgba(192, 132, 252, 0.4)',
        orange: 'rgba(251, 146, 60, 0.4)',
        green: 'rgba(74, 222, 128, 0.4)'
    };

    return (
        <div className={`bg-[#ffffff05] border border-white/5 p-4 rounded-2xl group transition-all duration-300 overflow-hidden relative hover:border-white/20`}>
            <div className={`absolute -inset-2 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`} style={{ backgroundColor: glowColors[color] }} />

            <div className="flex justify-between items-start relative z-10">
                <div className={`p-3 rounded-xl bg-white/5 ${colors[color]} group-hover:scale-110 group-hover:neo-glow transition-all duration-300`}>
                    <Icon size={18} />
                </div>
                <span className={`text-[9px] font-black tracking-widest uppercase text-white/20`}>{label}</span>
            </div>
            <div className="mt-4 relative z-10">
                <p className="text-3xl font-black tracking-tighter group-hover:translate-x-1 transition-transform">{value}</p>
            </div>
        </div>
    );
});

// --- Views ---

const HomeView = React.memo(({ status, start, stop, botInfo, killAll, discordUser, onDiscordLogin }) => {
    return (
        <div className="space-y-8">
            <header className="pr-48">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-8 h-[2px] bg-brand-red" />
                    <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">System Overview</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Command <span className="text-brand-red">Center</span></h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Bot Identity Card */}
                <div className="bg-[#ffffff05] border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-center space-y-4 relative overflow-hidden group transition-colors duration-150">
                    <div className={`absolute inset-0 bg-gradient-to-br ${status === 'online' ? 'from-green-500/5' : 'from-brand-red/5'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-100`} />

                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-none duration-100 relative ${status === 'online' ? 'bg-green-500/10 neo-glow ring-4 ring-green-500/20' : 'bg-brand-red/10 ring-4 ring-brand-red/20'}`}>
                        {botInfo?.avatar ? (
                            <img src={botInfo.avatar} className="w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover" alt="Avatar" />
                        ) : (
                            <Power size={28} className={status === 'online' ? 'text-green-500' : 'text-brand-red'} />
                        )}
                        <div className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-[2px] border-[#0a0a0c] ${status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    <div className="text-center z-10">
                        <h3 className={`font-black text-xl tracking-tighter text-white`}>{botInfo?.username || 'RMusic Engine'}</h3>
                        <p className={`text-[9px] uppercase tracking-[0.2em] font-black mt-0.5 text-white/30`}>{status === 'online' ? 'OPERATIONAL' : 'SYSTEM STANDBY'}</p>
                    </div>

                    <div className="flex flex-col gap-2 w-full mt-1 z-10">
                        {status === 'offline' ? (
                            <button onClick={start} className={`w-full font-black py-2.5 rounded-xl btn-animate active:scale-95 text-[10px] tracking-widest uppercase bg-white text-black hover:bg-brand-red hover:text-white`}>BOOT SYSTEM</button>
                        ) : (
                            <button onClick={stop} className={`w-full border font-black py-2.5 rounded-xl btn-animate active:scale-95 text-[10px] tracking-widest uppercase bg-brand-red/10 border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white`}>SHUTDOWN</button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <StatCard icon={Wifi} label="Ping" value={botInfo?.ping ? `${botInfo.ping}ms` : '---'} color="blue" />
                    <StatCard icon={Users} label="Guilds" value={botInfo?.guilds || '---'} color="purple" />
                    <StatCard icon={Cpu} label="System Load" value={botInfo?.cpu ? `${botInfo.cpu}%` : '0%'} color="orange" />
                    <StatCard icon={Zap} label="System Memory" value={botInfo?.ram ? `${botInfo.ram}${botInfo.totalRam ? ` / ${botInfo.totalRam}` : ''} GB` : '0GB'} color="green" />

                    {/* Voice Channel Activity - Spans 2 columns */}
                    {botInfo?.voiceChannels && botInfo.voiceChannels.length > 0 && (
                        <div className="col-span-2 glass p-4 rounded-[20px] space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full voice-active" />
                                <h4 className="font-black text-xs uppercase tracking-widest">Voice Activity</h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {botInfo.voiceChannels.map((vc, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                                        <div className="w-2 h-2 bg-green-400 rounded-full voice-active" />
                                        <div>
                                            <p className="text-[10px] font-bold">{vc.channelName}</p>
                                            <p className="text-[8px] text-white/40">{vc.guildName}</p>
                                        </div>
                                        <span className="text-[8px] bg-brand-red/20 text-brand-red px-1.5 py-0.5 rounded-full font-bold">
                                            {vc.userCount} 🎧
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Guild List */}
            {
                botInfo?.guildList && (
                    <div className="glass p-5 rounded-3xl space-y-4 overflow-hidden">
                        <h3 className="font-black text-base tracking-tight uppercase px-2">Connected <span className="text-brand-red">Nodes</span></h3>
                        <div className="flex gap-3 overflow-x-auto pb-3 custom-scroll px-2">
                            {botInfo.guildList.map((g, i) => (
                                <div key={i} className="min-w-[160px] bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors duration-150 shrink-0">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-black">
                                        <img src={g.icon} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-bold text-[10px] truncate uppercase tracking-tighter">{g.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </div >
    );
});

const AudioEngineView = React.memo(({ botInfo, status, updateVolume, toggleFilter, setEQ }) => {
    // We want the Audio Engine to be accessible even when status is offline
    // so users can process local audio.

    const currentVolume = botInfo?.volume || 100;
    const currentFilters = botInfo?.filters || {};
    const filters = ["8d", "bassboost", "nightcore"];

    return (
        <div className="space-y-6">
            <header className="pr-48">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-8 h-[2px] bg-brand-red" />
                    <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Acoustic Processing</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Audio <span className="text-brand-red">Studio</span></h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-[#ffffff05] border border-white/5 p-5 rounded-3xl space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-black text-base tracking-tight uppercase flex items-center gap-2"><Volume2 className="text-brand-red" size={18} /> Master Gain</h3>
                            <span className="bg-brand-red px-3 py-1 rounded-full text-[10px] font-black ring-2 ring-brand-red/20">{currentVolume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="200"
                            value={currentVolume}
                            onChange={(e) => updateVolume(e.target.value)}
                            className="w-full accent-brand-red bg-white/5 h-2 rounded-full cursor-pointer appearance-none outline-none focus:ring-4 ring-brand-red/5"
                        />
                        <div className="flex justify-between text-[9px] text-white/20 font-black tracking-widest">
                            <span>MUTE</span>
                            <span>NORMAL</span>
                            <span>BOOST (200%)</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <h3 className="font-black text-sm tracking-tight uppercase flex items-center gap-2 whitespace-nowrap">
                                <Zap className="text-brand-red" size={16} /> Signal Processing
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {filters.map(f => (
                                <button
                                    key={f}
                                    onClick={() => toggleFilter(f)}
                                    className={`px-5 py-2.5 rounded-xl border btn-animate font-black text-[10px] uppercase tracking-[0.2em] transform active:scale-95 ${currentFilters[f]
                                        ? 'bg-brand-red text-white border-brand-red neo-glow'
                                        : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20 hover:text-white'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-[#ffffff05] border border-white/5 p-5 rounded-3xl space-y-5">
                    <h3 className="font-black text-base tracking-tight uppercase flex items-center gap-2"><Activity className="text-brand-red" size={18} /> 10-Band Equalizer</h3>
                    <div className="flex justify-between h-36 items-end gap-2 px-1">
                        {(botInfo?.equalizer || [...Array(10).fill(0)]).map((val, i) => (
                            <div key={i} className="flex-1 flex flex-col gap-2 items-center group">
                                <div className="w-full bg-white/5 rounded-full relative h-[120px] group-hover:bg-white/10 transition-colors duration-300 overflow-hidden">
                                    <div
                                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-brand-red/40 via-brand-red to-brand-red rounded-full transition-none duration-100 shadow-[0_0_15px_var(--brand-glow)]"
                                        style={{ height: `${((val + 10) / 20) * 100}%` }}
                                    />
                                    {/* Subtle meter lines */}
                                    <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none p-1">
                                        {[...Array(6)].map((_, j) => <div key={j} className="h-px w-full bg-white" />)}
                                    </div>
                                    <input
                                        type="range"
                                        min="-10"
                                        max="10"
                                        value={val}
                                        onChange={(e) => setEQ(i, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                                        style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' }}
                                    />
                                </div>
                                <span className="text-[7px] text-white/20 font-black tracking-tighter uppercase">{i === 0 ? '60Hz' : i === 9 ? '16kHz' : i + 1}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[8px] text-center text-white/10 font-bold uppercase tracking-[0.3em]">Drag columns to adjust frequency response</p>

                        <div className="flex gap-2 p-1.5 bg-black/20 rounded-xl border border-white/5 shadow-inner">
                            {['ROCK', 'POP', 'JAZZ', 'FLAT'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => {
                                        const presets = {
                                            ROCK: [4, 3, 2, 0, 0, 1, 3, 4, 5, 5],
                                            POP: [-1, 1, 2, 3, 1, 0, -1, -2, -2, -2],
                                            JAZZ: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
                                            FLAT: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                                        };
                                        presets[p].forEach((v, i) => setEQ(i, v));
                                    }}
                                    className="px-4 py-2 bg-white/5 hover:bg-brand-red hover:text-white rounded-lg text-[9px] font-black transition-all border border-white/5 active:scale-95 uppercase tracking-widest shadow-lg hover:shadow-brand-red/20"
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const PlayerView = React.memo(({ query, setQuery, results, searching, onSearch, onPlay, onStop, playing, onBeam }) => {
    const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
        const saved = localStorage.getItem('recentlyPlayed');
        return saved ? JSON.parse(saved) : [];
    });

    const popularTracks = [
        { id: 'p0k7-T4-K0Y', title: 'Die With A Smile', thumbnail: 'https://img.youtube.com/vi/p0k7-T4-K0Y/maxresdefault.jpg', duration: '4:11' },
        { id: 'eVli-tstM5E', title: 'Espresso', thumbnail: 'https://img.youtube.com/vi/eVli-tstM5E/maxresdefault.jpg', duration: '2:55' },
        { id: 'zV123J_5n98', title: 'BIRDS OF A FEATHER', thumbnail: 'https://img.youtube.com/vi/zV123J_5n98/maxresdefault.jpg', duration: '3:30' },
        { id: 'mZqwQJ1464k', title: 'Not Like Us', thumbnail: 'https://img.youtube.com/vi/mZqwQJ1464k/maxresdefault.jpg', duration: '4:34' }
    ];

    const handlePlay = (track) => {
        onPlay(track);
        // Add to history
        const newHistory = [track, ...recentlyPlayed.filter(t => t.id !== track.id)].slice(0, 10);
        setRecentlyPlayed(newHistory);
        localStorage.setItem('recentlyPlayed', JSON.stringify(newHistory));
    };

    return (
        <div className="h-full flex flex-col space-y-5">
            <header className="flex items-center justify-between pr-48">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-8 h-[2px] bg-brand-red" />
                        <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Local Playback Engine</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase">Music <span className="text-brand-red">Studio</span></h1>
                </div>

                {/* Compact Search Bar */}
                <div className="relative group w-80">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-red transition-none duration-150`} size={16} />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                        placeholder="Search tracks..."
                        className={`w-full glass p-2.5 pl-10 rounded-xl outline-none focus:ring-2 ring-brand-red/20 border border-white/5 focus:border-brand-red/40 transition-none duration-150 text-xs font-bold placeholder:text-white/10`}
                    />
                    {query && (
                        <button
                            onClick={onSearch}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-brand-red p-1 rounded-full text-white hover:scale-110 transition-transform shadow-lg"
                        >
                            <Search size={10} />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-6 pb-16">
                {/* Search Results (Conditional) */}
                {results.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="font-black text-sm tracking-tight uppercase flex items-center gap-2"><Search size={14} className="text-brand-red" /> Search Results</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {results.map((track) => (
                                <div key={track.id} className={`bg-[#ffffff05] border border-white/5 p-2.5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors group`}>
                                    <div className="w-20 aspect-video rounded-lg overflow-hidden relative bg-white/5">
                                        <img src={track.thumbnail} className="w-full h-full object-cover" alt="" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handlePlay(track)} className="bg-brand-red p-1.5 rounded-full text-white shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-300"><Play size={16} fill="white" /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-xs truncate">{track.title}</h4>
                                        <span className="text-[9px] text-white/40 font-bold">{track.duration} • YouTube</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trending Grid */}
                {results.length === 0 && (
                    <div className="space-y-3">
                        <h3 className="font-black text-sm tracking-tight uppercase flex items-center gap-2"><Flame size={14} className="text-brand-red" /> Trending Now</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {popularTracks.map((track) => (
                                <div key={track.id} className="group relative aspect-video rounded-2xl overflow-hidden cursor-pointer bg-white/5 border border-white/5" onClick={() => handlePlay(track)}>
                                    <img src={track.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-3 group-hover:translate-y-0 transition-transform duration-100">
                                        <div className="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center mb-2 opacity-0 group-hover:opacity-100 transition-none duration-100 shadow-xl scale-0 group-hover:scale-100">
                                            <Play size={16} fill="white" className="ml-0.5" />
                                        </div>
                                        <h4 className="font-black text-sm leading-tight line-clamp-2 mb-0.5">{track.title}</h4>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">{track.duration}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recently Played */}
                {recentlyPlayed.length > 0 && results.length === 0 && (
                    <div className="space-y-3">
                        <h3 className="font-black text-sm tracking-tight uppercase flex items-center gap-2"><Activity size={14} className="text-brand-red" /> Recently Played</h3>
                        <div className="flex gap-3 overflow-x-auto pb-3 custom-scroll snap-x">
                            {recentlyPlayed.map((track, i) => (
                                <div key={`${track.id}-${i}`} className="min-w-[40%] md:min-w-[calc(20%-10px)] group cursor-pointer snap-start" onClick={() => handlePlay(track)}>
                                    <div className="w-full aspect-video rounded-2xl overflow-hidden mb-2 relative shadow-lg bg-white/5">
                                        <img src={track.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                                <Play size={20} fill="white" />
                                            </div>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-sm truncate px-1">{track.title}</h4>
                                    <p className="text-[9px] text-white/40 font-bold uppercase px-1">Played recently</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!searching && results.length === 0 && recentlyPlayed.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <Music size={80} />
                        <p className="mt-4 font-black uppercase tracking-widest">Start your journey</p>
                    </div>
                )}
            </div>
        </div>
    );
});

const LogsView = React.memo(({ logs, onSimulateLog, onClearLogs }) => {
    const scrollRef = React.useRef();
    const [analyzingLog, setAnalyzingLog] = useState(null);
    const [aiResult, setAiResult] = useState(null);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleAnalyze = async (log) => {
        setAnalyzingLog(log);
        setLoading(true);
        setAiResult(null);

        // --- DEMO MODE BYPASS ---
        // Provide accurate simulated responses for each test error
        if (log.includes("[ERR]")) {
            let demoResult = null;

            if (log.includes("MODULE_NOT_FOUND")) {
                demoResult = {
                    diagnosis: "Eksik Kütüphane: 'ffmpeg-static' modülü sistemde bulunamadı. Bu modül ses işleme için kritiktir.",
                    fix: "Terminali açın ve 'npm install ffmpeg-static' komutunu çalıştırarak eksik paketi yükleyin."
                };
            } else if (log.includes("CONNECTION_REFUSED")) {
                demoResult = {
                    diagnosis: "Veritabanı Bağlantı Hatası: 5432 portuna erişilemiyor. PostgreSQL servisi kapalı olabilir.",
                    fix: "PostgreSQL servisinin çalıştığından emin olun veya güvenlik duvarı ayarlarını kontrol edin."
                };
            } else if (log.includes("API_RATE_LIMIT")) {
                demoResult = {
                    diagnosis: "Discord API Sınırı: Çok fazla istek gönderildiği için Discord ağ geçidi geçici olarak engelledi (429).",
                    fix: "Botun istek sıklığını azaltın. Sistem otomatik olarak 5 dakika bekleyip tekrar deneyecektir."
                };
            } else if (log.includes("AUDIO_BUFFER_UNDERRUN")) {
                demoResult = {
                    diagnosis: "Ses Tamponu Hatası: İşlemci, ses verisini zamanında işleyemediği için kare atlaması yaşandı.",
                    fix: "High-quality ses filtrelerini kapatmayı veya çalışan diğer ağır uygulamaları kapatmayı deneyin."
                };
            }

            if (demoResult) {
                setTimeout(() => {
                    setAiResult(demoResult);
                    setLoading(false);
                }, 1500);
                return;
            }
        }

        try {
            // Real IPC call
            const result = await ipc.invoke('ask-ai', { log });
            setAiResult(result);
        } catch (e) {
            console.error(e);
            setAiResult({ error: true, message: "Yapay zeka servisine bağlanılamadı. Lütfen uygulamayı tamamen kapatıp açın. (Backend handler not ready)" });
        } finally {
            if (!log.includes("[ERR]")) setLoading(false); // Only unset here if not demo mode (demo handles its own loading)
        }
    };

    return (
        <div className="h-full flex flex-col space-y-4 relative">
            <header className="flex items-center justify-between pr-48">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-8 h-[2px] bg-brand-red" />
                        <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Console Access</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase">System <span className="text-brand-red">Logs</span></h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const testErrors = [
                                "[ERR] CONNECTION_REFUSED: Failed to connect to local database at port 5432.",
                                "[ERR] AUDIO_BUFFER_UNDERRUN: Stream processing too slow, skipping frames.",
                                "[ERR] API_RATE_LIMIT: Discord gateway rejected payload code 429.",
                                "[ERR] MODULE_NOT_FOUND: Required dependency 'ffmpeg-static' is missing."
                            ];
                            const randomError = testErrors[Math.floor(Math.random() * testErrors.length)];
                            if (onSimulateLog) onSimulateLog(randomError);
                            ipc.send('bot-control', { cmd: 'simulateError', error: randomError });
                        }}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-none active:scale-95"
                    >
                        + Test Error
                    </button>
                    <button
                        onClick={() => onClearLogs && onClearLogs()}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-[9px] font-black uppercase tracking-widest rounded-lg border border-white/5 transition-none active:scale-95"
                    >
                        Temizle
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${analyzingLog ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                            Guardian {analyzingLog ? 'Analyzing' : 'Ready'}
                        </span>
                        <Bot size={12} className="opacity-40 ml-1" />
                    </div>
                </div>
            </header>

            {/* AI Analysis Modal */}
            <AnimatePresence>
                {analyzingLog && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAnalyzingLog(null)}
                        className="absolute inset-0 z-50 glass-heavy rounded-[40px] p-8 flex flex-col backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${loading ? 'animate-pulse bg-brand-red/20' : 'bg-brand-red text-white'} shadow-lg shadow-brand-red/20`}>
                                    <Bot size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl uppercase tracking-tighter">Guardian Insight</h3>
                                    <p className="text-[10px] uppercase font-bold opacity-50">AI Powered Error Diagnosis</p>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setAnalyzingLog(null); }} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/20 flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scroll space-y-6" onClick={e => e.stopPropagation()}>
                            <div className="bg-black/20 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-red-400 break-all">
                                {analyzingLog}
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4 opacity-50">
                                    <Loader size={32} className="animate-spin text-brand-red" />
                                    <p className="font-black text-xs uppercase tracking-[0.2em]">Analyzing System Vectors...</p>
                                </div>
                            ) : aiResult ? (
                                <div className="space-y-6 animate-fade-in">
                                    {aiResult.error ? (
                                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                                            <AlertTriangle size={24} />
                                            <div>
                                                <h4 className="font-black uppercase tracking-widest text-xs">Analysis Failed</h4>
                                                <p className="text-xs opacity-75">{aiResult.message}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <h4 className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-brand-red"><AlertTriangle size={16} /> Diagnosis</h4>
                                                <p className="leading-relaxed text-sm opacity-80">{aiResult.diagnosis}</p>
                                            </div>
                                            <div className="w-full h-[1px] bg-white/10" />
                                            <div className="space-y-2">
                                                <h4 className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-green-400"><ShieldCheck size={16} /> Recommended Fix</h4>
                                                <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-xl text-green-300/90 text-sm">
                                                    {aiResult.fix}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div
                ref={scrollRef}
                className={`flex-1 glass-heavy p-3 rounded-2xl font-mono text-[10px] overflow-y-auto space-y-2 custom-scroll shadow-inner scroll-smooth bg-[#020205]`}
            >
                {logs.map((log, i) => {
                    const isErr = log.includes('[ERR]');
                    const isCmd = log.includes('[CMD]');
                    const isBot = log.includes('[BOT]');

                    let statusClass = 'bg-white/5 text-white/50 border-white/5';
                    let labelClass = 'text-white/20';
                    let label = `NODE_KERNEL_X${i}`;

                    if (isErr) {
                        statusClass = 'bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10';
                        labelClass = 'text-red-500';
                    } else if (isCmd) {
                        statusClass = 'bg-green-500/10 text-green-400 border-green-500/20';
                        labelClass = 'text-green-500';
                        label = `COMMAND_EXEC_X${i}`;
                    } else if (isBot) {
                        statusClass = 'bg-green-500/10 text-green-400 border-green-500/20';
                        labelClass = 'text-green-500';
                        label = `BOT_CORE_X${i}`;
                    }

                    return (
                        <div key={i} className={`px-4 py-3 rounded-xl border transition-all duration-300 group relative overflow-hidden ${statusClass} hover:translate-x-1`}>
                            {/* Terminal scanline effect on hover */}
                            <div className="absolute inset-x-0 top-0 h-px bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-center mb-1 relative z-10">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${labelClass} opacity-60`}>{label}</span>
                                <div className="flex items-center gap-3">
                                    {isErr && (
                                        <button
                                            onClick={() => handleAnalyze(log)}
                                            className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white rounded-md shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <Bot size={10} />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Guardian Fix</span>
                                        </button>
                                    )}
                                    <span className={`text-[9px] font-mono opacity-20 text-white`}>{new Date().toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <div className="leading-relaxed break-all font-mono text-[10px] font-medium tracking-tight relative z-10 opacity-90">{log}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

const CommandsView = React.memo(({ config, setConfig, killAll, botInfo }) => {
    if (!config) return <div className="h-full flex items-center justify-center text-brand-red font-black tracking-widest uppercase text-xl">Initializing Policy...</div>;

    const getIcon = (name) => {
        const iconSize = 20;
        switch (name.toLowerCase()) {
            case 'p': return <Play size={iconSize} />;
            case 'skip': return <Zap size={iconSize} />;
            case 'stop': return <Square size={iconSize} />;
            case 'kuyruk': return <Music size={iconSize} />;
            case 'sıfırla': return <Activity size={iconSize} />;
            case 'prefix': return <Terminal size={iconSize} />;
            case 'test': return <ShieldCheck size={iconSize} />;
            case 'ping': return <Wifi size={iconSize} />;
            case 'autoplay': return <Waves size={iconSize} />;
            case 'yardım': return <Search size={iconSize} />;
            default: return <Terminal size={iconSize} />;
        }
    };

    const knownCmds = botInfo?.commands || [
        { name: 'p', description: 'YouTube üzerinden müzik oynatır' },
        { name: 'autoplay', description: 'Otomatik oynatmayı açar/kapatır' },
        { name: 'skip', description: 'Mevcut şarkıyı atlar' },
        { name: 'stop', description: 'Oynatmayı durdurur ve kanaldan çıkar' },
        { name: 'kuyruk', description: 'Sunucudaki şarkı sırasını gösterir' },
        { name: 'sıfırla', description: 'Mevcut şarkı listesini temizler' },
        { name: 'prefix', description: 'Botun komut ön ekini ayarlar' },
        { name: 'test', description: 'Sistem durumunu kontrol eder' },
        { name: 'ping', description: 'Botun gecikme süresini gösterir' },
        { name: 'yardım', description: 'Tüm komutları listeler' }
    ];

    const toggleCommand = (name) => {
        const disabled = config.disabled_commands || [];
        let newDisabled;
        if (disabled.includes(name)) {
            newDisabled = disabled.filter(c => c !== name);
        } else {
            newDisabled = [...disabled, name];
        }
        setConfig({ ...config, disabled_commands: newDisabled });
    };

    return (
        <div className="space-y-10">
            <header>
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-8 h-[2px] bg-brand-red" />
                    <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Access Policy</span>
                </div>
                <h1 className="text-4xl font-black tracking-tighter uppercase">Command <span className="text-brand-red">Vault</span></h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {knownCmds.map((cmd) => {
                    const isEnabled = !(config.disabled_commands || []).includes(cmd.name);
                    return (
                        <div
                            key={cmd.name}
                            onClick={() => toggleCommand(cmd.name)}
                            className={`p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden cursor-pointer ${isEnabled
                                ? 'bg-brand-red/5 border-brand-red/20 hover:border-brand-red/40 hover:shadow-[0_0_20px_rgba(255,76,76,0.1)]'
                                : 'bg-white/5 border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className={`p-3 rounded-xl transition-all duration-300 ${isEnabled ? 'bg-brand-red text-white neo-glow' : 'bg-white/10 text-white/40'}`}>
                                    {getIcon(cmd.name)}
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isEnabled ? 'bg-brand-red' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isEnabled ? 'translate-x-5 shadow-[0_0_10px_white]' : 'translate-x-0'}`} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className={`font-black text-lg uppercase tracking-tighter mb-0.5 transition-colors ${isEnabled ? 'text-white' : 'text-white/20'}`}>{cmd.name}</h4>
                                <p className={`text-[9px] font-bold opacity-60 uppercase tracking-tight line-clamp-1 transition-colors ${isEnabled ? 'text-white/40' : 'text-white/10'}`}>{cmd.description}</p>
                            </div>

                            {/* Hover background glow */}
                            {isEnabled && <div className="absolute -inset-2 bg-brand-red opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />}
                        </div>
                    );
                })}
            </div>

            {/* SLASH COMMANDS PANEL */}
            <SlashCommandsPanel />

            {/* Audit Log Configuration - Moved from Settings */}
            <div className="glass p-5 rounded-3xl border-white/5 relative overflow-hidden group hover:border-brand-red/30 transition-all duration-300 bg-gradient-to-br from-[#ffffff03] to-transparent">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 ${config.mod_log_enabled ? 'bg-brand-red/20 text-brand-red' : 'bg-white/10 text-white/20'} rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl`}>
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm uppercase tracking-widest text-white/90">Denetim Kaydı Sistemi</h3>
                            <p className="text-[9px] text-white/30 uppercase font-black">Audit Log Configuration</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                value={config.log_channel || ''}
                                onChange={(e) => {
                                    const newConfig = { ...config, log_channel: e.target.value };
                                    setConfig(newConfig);
                                    ipc.send('save-config', newConfig);
                                }}
                                placeholder="Log Kanal ID"
                                className="w-full bg-black/40 border border-white/10 p-2.5 rounded-lg outline-none focus:border-brand-red transition-all font-mono text-[10px] text-center md:text-left"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/10">
                                <Search size={12} />
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const newConfig = { ...config, mod_log_enabled: !config.mod_log_enabled };
                                setConfig(newConfig);
                                ipc.send('save-config', newConfig);
                            }}
                            className={`px-6 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] border transition-all active:scale-95 ${config.mod_log_enabled
                                ? 'bg-brand-red text-white border-brand-red neo-glow shadow-[0_0_15px_rgba(255,76,76,0.3)]'
                                : 'bg-white/5 text-white/30 border-white/10 hover:border-white/20'}`}
                        >
                            {config.mod_log_enabled ? 'SİSTEM AKTİF' : 'DEVRE DIŞI'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KILL SWITCH PANEL */}
            <div className="mt-12 relative">
                <div className="bg-[#ffffff05] border border-white/5 p-6 rounded-3xl border-red-600/30 bg-gradient-to-br from-red-950/30 via-[#0c0c0e]/80 to-red-950/20 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-600/5 rounded-3xl"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="flex-1 text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
                                <div className="w-8 h-[2px] bg-red-600" />
                                <span className="text-[9px] text-red-500 font-black uppercase tracking-[0.3em]">Emergency Override</span>
                            </div>
                            <h2 className={`text-3xl font-black tracking-tighter uppercase mb-2 text-white`}>
                                <span className="text-red-500">KILL</span> SWITCH
                            </h2>
                            <p className={`text-white/40 text-[11px] max-w-sm leading-relaxed`}>
                                Bot kilitlenmelerinde ve acil durumlarda tüm süreçleri anında sonlandırır.
                                Database kilitlerini temizler ve sistemi sıfırlar.
                            </p>
                        </div>

                        <button
                            onClick={killAll}
                            className={`px-6 py-2.5 rounded-full font-black text-[9px] tracking-widest uppercase transition-none duration-150 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 active:scale-95`}
                        >
                            KAYNAKLARI SIFIRLA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});


const AutoResponseView = React.memo(({ responses, setResponses }) => {
    const [trigger, setTrigger] = useState('');
    const [response, setResponse] = useState('');
    const [expandedIndex, setExpandedIndex] = useState(null);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!trigger.trim() || !response.trim()) return;

        const newResponses = [...responses, {
            trigger: trigger.trim(),
            response: response.trim(),
        }];
        setResponses(newResponses);
        setTrigger('');
        setResponse('');
    };

    const handleDelete = (index) => {
        const newResponses = responses.filter((_, i) => i !== index);
        setResponses(newResponses);
    };

    const loadReadyMadeSet = () => {
        const readySet = [
            { trigger: "sa", response: ["Aleyküm Selam!", "Aleyküm Selam {user}, hoş geldin!", "Ve Aleyküm Selam, nasılsın?"] },
            { trigger: "as", response: ["Memnun oldum!", "Hoş geldin {user}!"] },
            { trigger: "merhaba", response: ["Merhaba {user}, harika bir gün dilerim!", "Selamlar! Nasıl yardımcı olabilirim?", "Merhaba! Bugün nasılsın?"] },
            { trigger: "selam", response: ["Selam {user}!", "Selamlar, hoş geldin.", "Ooo selamlar!"] },
            { trigger: "günaydın", response: ["Günaydın! Harika bir sabah değil mi?", "Günaydın {user}, bugün enerji doluyuz!", "Sana da günaydın!"] },
            { trigger: "iyi geceler", response: ["İyi geceler {user}, tatlı rüyalar.", "Görüşürüz, kendine iyi bak.", "İyi uykular!"] },
            { trigger: "nasılsın", response: ["Çok iyiyim, seni gördüm daha iyi oldum!", "Harikayım! Sen nasılsın?", "Bomma gibiyim, her şey yolunda."] },
            { trigger: "teşekkürler", response: ["Rica ederim!", "Lafı bile olmaz {user}!", "Ne demek, her zaman."] },
            { trigger: "hoş geldin", response: ["Hoş bulduk!", "Selamlar {user}!", "Teşekkür ederim, nasılsın?"] },
            { trigger: "görüşürüz", response: ["Güle güle!", "Kendine iyi bak {user}!", "Yine bekleriz."] },
            { trigger: "naber", response: ["İyidir, senden naber?", "Harika gidiyor, seninle daha iyi oldu!", "Süperim, her şey yolunda."] },
            { trigger: "baybay", response: ["Hadi baybay!", "Görüşürüz!", "Sana da bay bay."] },
            { trigger: "cansın", response: ["O senin canlığın!", "Teşekkür ederim {user}, sen de öylesin!", "Seni sevdim!"] },
            { trigger: "bot", response: ["Buyur benim?", "Efendim {user}?", "Biri bot mu dedi?"] },
            { trigger: "yardım", response: ["Komutlar için !help yazabilirsin!", "Herhangi bir konuda yardıma mı ihtiyacın var?", "Sana nasıl yardımcı olabilirim?"] },
            { trigger: "müzik", response: ["Müzik komutlarını çalma listende görebilirsin.", "En sevdiğin şarkıyı açmaya ne dersin?", "Müzik ruhun gıdasıdır!"] },
            { trigger: "eyvallah", response: ["Rica ederim.", "Ne demek!", "Her zaman yanındayım."] },
            { trigger: "hb", response: ["Hoş geldin kral!", "Ooo hoş geldin {user}!", "Merhaba!"] },
            { trigger: "kolay gelsin", response: ["Teşekkürler, sana da!", "Çok sağ ol {user}!", "Eksik olma."] },
            { trigger: "afiyet olsun", response: ["Teşekkürler!", "Sana da afiyet olsun!", "Birlikte olsun."] }
        ];

        // Merge or replace? Let's append but avoid duplicate triggers
        const existingTriggers = new Set(responses.map(r => r.trigger.toLowerCase()));
        const filteredSet = readySet.filter(r => !existingTriggers.has(r.trigger.toLowerCase()));

        if (filteredSet.length > 0) {
            setResponses([...responses, ...filteredSet]);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-8 h-[2px] bg-brand-red" />
                    <span className="text-[10px] text-brand-red font-black uppercase tracking-[0.3em]">Smart Integration</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase">Auto <span className="text-brand-red">Response</span></h1>
            </header>

            <div className="flex flex-col gap-8">
                {/* Horizontal Form Section */}
                <div className="glass-heavy p-6 rounded-[32px] border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-red/10 rounded-lg flex items-center justify-center text-brand-red">
                                <Plus size={16} />
                            </div>
                            <div>
                                <h3 className="font-black text-xs uppercase tracking-widest">Yeni Ekle</h3>
                                <p className="text-[9px] text-white/30 uppercase font-black">Tetikleyici ve Yanıtlar</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={loadReadyMadeSet}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all group"
                            >
                                <Plus size={10} className="text-brand-red group-hover:scale-125 transition-transform" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">Hazır Seti Yükle</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!trigger.trim() || !response.trim()) return;

                        const responsePayload = response.includes('|')
                            ? response.split('|').map(s => s.trim()).filter(s => s !== "")
                            : response.trim();

                        const newResponses = [...responses, {
                            trigger: trigger.trim(),
                            response: responsePayload
                        }];
                        setResponses(newResponses);
                        setTrigger('');
                        setResponse('');
                    }} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                        <div className="md:col-span-3 flex flex-col">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2 mb-1">Algılanan Mesaj</label>
                            <input
                                value={trigger}
                                onChange={(e) => setTrigger(e.target.value)}
                                placeholder="Örn: sa"
                                className="w-full bg-white/5 border border-white/10 px-4 rounded-xl outline-none focus:border-brand-red transition-all font-bold text-sm h-[44px]"
                            />
                            <div className="h-4" />
                        </div>
                        <div className="md:col-span-6 flex flex-col">
                            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 ml-2 mb-1">Gönderilecek Mesaj(lar)</label>
                            <input
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                placeholder="Birden fazla cevap için araya | koyun."
                                className="w-full bg-white/5 border border-white/10 px-4 rounded-xl outline-none focus:border-brand-red transition-all font-bold text-sm h-[44px]"
                            />
                            <div className="flex gap-4 h-4 items-center">
                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest ml-1">👤 Etiket: {"{user}"}</p>
                                <p className="text-[8px] text-brand-red/40 font-bold uppercase tracking-widest ml-1">⚡ Varyasyon: | </p>
                            </div>
                        </div>
                        <div className="md:col-span-3 flex flex-col">
                            <div className="text-[9px] font-black uppercase tracking-widest opacity-0 mb-1">Buton</div>
                            <button
                                type="submit"
                                className="w-full bg-brand-red text-white font-black h-[44px] rounded-xl btn-animate hover:shadow-[0_0_20px_var(--brand-glow)] active:scale-95 text-[10px] tracking-widest uppercase"
                            >
                                SİSTEME EKLE
                            </button>
                            <div className="h-4" />
                        </div>
                    </form>
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-4 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Aktif Yanıtlar ({responses.length})</span>
                    </div>

                    {responses.length === 0 ? (
                        <div className="glass p-12 rounded-[40px] border-white/5 flex flex-col items-center justify-center text-center opacity-40">
                            <MessageSquare size={48} className="mb-4 text-white/20" />
                            <p className="font-black uppercase tracking-widest text-sm">Henüz otomatik yanıt eklenmedi</p>
                            <p className="text-[10px] mt-2">Yukarıdaki formdan yeni bir yanıt oluşturun.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Left Column */}
                            <div className="space-y-4">
                                {responses.filter((_, i) => i % 2 === 0).map((res, idx) => {
                                    const actualIndex = idx * 2;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={actualIndex}
                                            onClick={() => setExpandedIndex(expandedIndex === actualIndex ? null : actualIndex)}
                                            className={`glass p-4 rounded-[24px] border-white/5 flex flex-col group cursor-pointer hover:border-brand-red/30 transition-all duration-300 ${expandedIndex === actualIndex ? 'bg-white/[0.03] border-brand-red/20' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs text-brand-red border border-white/5">
                                                        {actualIndex + 1}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Tetikleyici:</span>
                                                            <span className="text-sm font-black text-white">{res.trigger}</span>
                                                            {res.isAI && (
                                                                <span className="flex items-center gap-1 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                    <Bot size={7} /> AI
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Yanıtlar:</span>
                                                            <span className="text-[9px] font-bold text-white/40 uppercase bg-white/5 px-1.5 py-0.5 rounded-md">
                                                                {Array.isArray(res.response) ? `${res.response.length} Varyasyon` : '1 Yanıt'}
                                                            </span>
                                                            <ChevronDown size={12} className={`text-white/20 transition-transform duration-300 ${expandedIndex === actualIndex ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(actualIndex);
                                                    }}
                                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {expandedIndex === actualIndex && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                                                            {Array.isArray(res.response) ? (
                                                                res.response.map((v, i) => (
                                                                    <div key={i} className="flex gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                                                        <div className="w-4 h-4 bg-brand-red/10 rounded-md flex items-center justify-center text-[8px] font-black text-brand-red flex-shrink-0">
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className="text-[12px] font-bold text-white/60 italic">{v}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="flex gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                                                    <span className="text-[12px] font-bold text-white/60 italic">{res.response}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                {responses.filter((_, i) => i % 2 !== 0).map((res, idx) => {
                                    const actualIndex = idx * 2 + 1;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            key={actualIndex}
                                            onClick={() => setExpandedIndex(expandedIndex === actualIndex ? null : actualIndex)}
                                            className={`glass p-4 rounded-[24px] border-white/5 flex flex-col group cursor-pointer hover:border-brand-red/30 transition-all duration-300 ${expandedIndex === actualIndex ? 'bg-white/[0.03] border-brand-red/20' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center font-black text-xs text-brand-red border border-white/5">
                                                        {actualIndex + 1}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Tetikleyici:</span>
                                                            <span className="text-sm font-black text-white">{res.trigger}</span>
                                                            {res.isAI && (
                                                                <span className="flex items-center gap-1 text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                                    <Bot size={7} /> AI
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Yanıtlar:</span>
                                                            <span className="text-[9px] font-bold text-white/40 uppercase bg-white/5 px-1.5 py-0.5 rounded-md">
                                                                {Array.isArray(res.response) ? `${res.response.length} Varyasyon` : '1 Yanıt'}
                                                            </span>
                                                            <ChevronDown size={12} className={`text-white/20 transition-transform duration-300 ${expandedIndex === actualIndex ? 'rotate-180' : ''}`} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(actualIndex);
                                                    }}
                                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <AnimatePresence>
                                                {expandedIndex === actualIndex && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                                                            {Array.isArray(res.response) ? (
                                                                res.response.map((v, i) => (
                                                                    <div key={i} className="flex gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                                                        <div className="w-4 h-4 bg-brand-red/10 rounded-md flex items-center justify-center text-[8px] font-black text-brand-red flex-shrink-0">
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className="text-[12px] font-bold text-white/60 italic">{v}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="flex gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                                                                    <span className="text-[12px] font-bold text-white/60 italic">{res.response}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});


// --- Slash Commands Panel ---
const SlashCommandsPanel = React.memo(() => {
    const [slashCommands, setSlashCommands] = useState([]);
    const [isDeploying, setIsDeploying] = useState(false);
    const [deployResult, setDeployResult] = useState(null);

    useEffect(() => {
        const loadSlashCommands = async () => {
            try {
                const commands = await ipc.invoke('get-slash-commands');
                setSlashCommands(commands);
            } catch (e) {
                console.error('[SLASH_CMD_LOAD]', e);
            }
        };
        loadSlashCommands();
    }, []);

    const handleDeploy = async (isGlobal = false) => {
        setIsDeploying(true);
        setDeployResult(null);
        try {
            const result = await ipc.invoke('deploy-slash-commands', isGlobal);
            setDeployResult(result);
        } catch (e) {
            setDeployResult({ success: false, error: e.message });
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="glass p-5 rounded-3xl border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300 bg-gradient-to-br from-purple-950/20 via-[#0c0c0e]/80 to-[#0c0c0e]">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl">
                        <Terminal size={22} />
                    </div>
                    <div>
                        <h3 className="font-black text-base uppercase tracking-widest text-white/90">Slash Commands</h3>
                        <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.2em]">Discord Native Integration</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleDeploy(false)}
                        disabled={isDeploying}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] border transition-all active:scale-95 ${isDeploying
                            ? 'bg-white/5 text-white/30 border-white/10 cursor-wait'
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500 hover:text-white'
                            }`}
                    >
                        {isDeploying ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                        Guild Deploy
                    </button>
                    <button
                        onClick={() => handleDeploy(true)}
                        disabled={isDeploying}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-[0.2em] border transition-all active:scale-95 ${isDeploying
                            ? 'bg-white/5 text-white/30 border-white/10 cursor-wait'
                            : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                    >
                        {isDeploying ? <Loader size={12} className="animate-spin" /> : <Crown size={12} />}
                        Global Deploy
                    </button>
                </div>
            </div>

            {/* Deploy Result */}
            {deployResult && (
                <div className={`mt-4 p-3 rounded-lg border ${deployResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    <div className="flex items-center gap-2">
                        {deployResult.success ? <Check size={14} /> : <AlertTriangle size={14} />}
                        <span className="font-black text-[10px] uppercase tracking-widest">
                            {deployResult.success ? deployResult.message : deployResult.error}
                        </span>
                    </div>
                </div>
            )}

            {/* Slash Command List */}
            {slashCommands.length > 0 && (
                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {slashCommands.map((cmd) => (
                        <div key={cmd.name} className="bg-white/5 border border-white/5 px-3 py-2 rounded-lg hover:border-purple-500/30 transition-all group/cmd">
                            <div className="flex items-center gap-1.5">
                                <span className="text-purple-400 font-mono text-xs">/</span>
                                <span className="font-bold text-xs text-white/80 group-hover/cmd:text-white transition-colors">{cmd.name}</span>
                            </div>
                            <p className="text-[8px] text-white/30 mt-0.5 line-clamp-1">{cmd.description}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="mt-4 flex items-center gap-2 text-[8px] text-white/20 uppercase tracking-widest font-bold">
                <Shield size={10} />
                <span>Guild: Anında aktif | Global: ~1 saat gecikme</span>
            </div>
        </div>
    );
});

// --- Layout & Sidebar ---
