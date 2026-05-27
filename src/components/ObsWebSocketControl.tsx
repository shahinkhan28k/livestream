import React, { useState, useEffect, useRef } from 'react';
import OBSWebSocket from 'obs-websocket-js';
import { 
  Tv, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  RefreshCw, 
  Cpu, 
  Play, 
  Square,
  Sparkles,
  Layers,
  Clock,
  Radio,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { StreamDestination } from '../types';

interface ObsWebSocketControlProps {
  destinations: StreamDestination[];
  setDestinations: React.Dispatch<React.SetStateAction<StreamDestination[]>>;
  addLog: (source: string, type: 'info' | 'success' | 'warn' | 'error', message: string) => void;
  currentUser: any;
  db: any;
}

export default function ObsWebSocketControl({
  destinations,
  setDestinations,
  addLog,
  currentUser,
  db
}: ObsWebSocketControlProps) {
  // OBS WebSocket server settings states
  const [obsIp, setObsIp] = useState(() => localStorage.getItem('obs_ws_ip') || 'localhost');
  const [obsPort, setObsPort] = useState(() => localStorage.getItem('obs_ws_port') || '4455');
  const [obsPassword, setObsPassword] = useState(() => localStorage.getItem('obs_ws_password') || '');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('obs_ws_autosync') !== 'false');

  // Connection states
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // OBS stats / Scene tracker
  const [obsBroadcasting, setObsBroadcasting] = useState(false);
  const [currentScene, setCurrentScene] = useState<string>('N/A');
  const [scenesList, setScenesList] = useState<string[]>([]);
  const [streamStats, setStreamStats] = useState<{
    fps: number;
    cpuClass: string;
    bitrate: number;
    uptime: string;
    uptimeSeconds: number;
    skippedFrames: number;
    totalFrames: number;
  } | null>(null);

  // Simulation mode (Fallback for preview environments / users without OBS)
  const [simulationActive, setSimulationActive] = useState(false);
  const [simStreamActive, setSimStreamActive] = useState(false);
  const [simBitrate, setSimBitrate] = useState(4500);
  const [simFps, setSimFps] = useState(60);
  const [simUptime, setSimUptime] = useState(0);

  const obsRef = useRef<OBSWebSocket | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Local storage effect
  useEffect(() => {
    localStorage.setItem('obs_ws_ip', obsIp);
    localStorage.setItem('obs_ws_port', obsPort);
    localStorage.setItem('obs_ws_password', obsPassword);
    localStorage.setItem('obs_ws_autosync', autoSync ? 'true' : 'false');
  }, [obsIp, obsPort, obsPassword, autoSync]);

  // Synchronize Portal UI with "Is OBS Currently Streaming?" State
  const syncWorkspaceUIWithOBSData = async (isStreamingNow: boolean) => {
    const activeDestinations = destinations.filter(d => d.enabled);
    if (activeDestinations.length === 0) {
      addLog('OBS-SYNC', 'warn', 'কোনো সক্রিয় ব্রডকাস্ট রিলে চ্যানেল সিলেক্ট করা নেই। সিঙ্ক্রোনাইজেশন এড়ানো হয়েছে।');
      return;
    }

    addLog('OBS-SYNC', 'info', `সিঙ্ক ট্রিগার হয়েছে: OBS ব্রডকাস্ট স্টেট = ${isStreamingNow ? 'লাইভ' : 'বন্ধ'}। পোর্টাল আপডেট হচ্ছে...`);

    // 1. Local React State Update
    setDestinations(prev => prev.map(d => {
      if (d.enabled) {
        return { ...d, status: isStreamingNow ? 'streaming' : 'offline' };
      }
      return d;
    }));

    // 2. Firebase Firestore State Update if logged in
    if (currentUser && db) {
      for (const dest of activeDestinations) {
        try {
          const path = `users/${currentUser.id}/destinations/${dest.id}`;
          await updateDoc(doc(db, 'users', currentUser.id, 'destinations', dest.id), {
            status: isStreamingNow ? 'streaming' : 'offline'
          });
          console.log(`[OBS SYNC] Updated destination status to ${isStreamingNow ? 'streaming' : 'offline'} for layout id: ${dest.id}`);
        } catch (err) {
          console.error(`Could not write OBS sync state to Firestore for destination ${dest.id}:`, err);
        }
      }
    }

    addLog(
      'OBS-SYNC', 
      isStreamingNow ? 'success' : 'warn', 
      isStreamingNow 
        ? `OBS-এর সোর্স লাইভ একটিভিটি সনাক্ত হয়েছে! সক্রিয় ${activeDestinations.length} টি সোশ্যাল রিলে গ্লোবাল পোর্টালে সিঙ্ক করা হয়েছে!`
        : 'OBS ব্রডকাস্ট সংযোগ বিচ্ছিন্ন! গ্লোবাল পোর্টালে রিলে এন্ডিং সিঙ্ক করা হয়েছে।'
    );
  };

  // Run Simulator ticks
  useEffect(() => {
    if (simulationActive) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      
      simIntervalRef.current = setInterval(() => {
        if (simStreamActive) {
          setSimUptime(prev => prev + 1);
          // Floating random bitrates
          setSimBitrate(prev => {
            const delta = Math.floor(Math.random() * 300) - 150;
            return Math.max(3000, Math.min(6500, prev + delta));
          });
        } else {
          setSimUptime(0);
        }
      }, 1000);
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }

    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, [simulationActive, simStreamActive]);

  // Synchronize from simulator action change
  useEffect(() => {
    if (simulationActive && autoSync) {
      syncWorkspaceUIWithOBSData(simStreamActive);
    }
  }, [simStreamActive, simulationActive, autoSync]);

  // Connect to physical OBS WebSocket
  const handleConnectOBS = async () => {
    if (connectionStatus === 'connecting') return;
    setConnectionStatus('connecting');
    setErrorMsg(null);
    setSimulationActive(false); // Disable simulation when connecting to real OBS

    try {
      const url = `ws://${obsIp}:${obsPort}`;
      addLog('OBS-CLIENT', 'info', `OBS WebSocket সার্ভারে সংযোগ স্থাপনের চেষ্টা করা হচ্ছে: ${url}`);
      
      const obs = new OBSWebSocket();
      obsRef.current = obs;

      // Identify & Connect
      await obs.connect(url, obsPassword || undefined);
      setConnectionStatus('connected');
      addLog('OBS-CLIENT', 'success', `OBS স্টুডিওর সাথে সফলভাবে কানেক্টেড!`);

      // Retrieve Initial states
      const sceneResponse = await obs.call('GetCurrentProgramScene');
      setCurrentScene(sceneResponse.currentProgramSceneName || 'N/A');

      const scenesListResponse = await obs.call('GetSceneList');
      if (scenesListResponse && scenesListResponse.scenes) {
        const names = (scenesListResponse.scenes as any[]).map(s => s.sceneName as string);
        setScenesList(names);
      }

      // Check Stream Status
      const streamStatusResponse = await obs.call('GetStreamStatus');
      const isBroadcasting = streamStatusResponse.outputActive;
      setObsBroadcasting(isBroadcasting);
      
      if (autoSync) {
        syncWorkspaceUIWithOBSData(isBroadcasting);
      }

      // Listeners for Live RTMP Handshake Statuses
      obs.on('StreamStateChanged', (data: any) => {
        const isLive = data.outputActive;
        setObsBroadcasting(isLive);
        addLog('OBS-CLIENT', isLive ? 'success' : 'warn', `OBS স্টেট পরিবর্তন লক্ষ্য করা গেছে: ${data.outputState}`);
        if (autoSync) {
          syncWorkspaceUIWithOBSData(isLive);
        }
      });

      obs.on('CurrentProgramSceneChanged', (data: any) => {
        setCurrentScene(data.sceneName);
        addLog('OBS-CLIENT', 'info', `OBS সক্রিয় দৃশ্য (Scene) পরিবর্তন হয়েছে: ${data.sceneName}`);
      });

      // Polling Stats Timer
      statsIntervalRef.current = setInterval(async () => {
        try {
          if (obsRef.current) {
            const stats = await obsRef.current.call('GetStats');
            const streamStat = await obsRef.current.call('GetStreamStatus');
            
            // Format uptime code duration from UTC
            const seconds = streamStat.outputDuration;
            const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
            const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
            const s = Math.floor(seconds % 60).toString().padStart(2, '0');
            
            setStreamStats({
              fps: Math.round(stats.activeFps),
              cpuClass: `${stats.cpuUsage.toFixed(1)}%`,
              bitrate: Math.round(streamStat.outputCongestion * 100), // simplistic map or fetch real stream output active data
              uptime: `${h}:${m}:${s}`,
              uptimeSeconds: seconds,
              skippedFrames: streamStat.outputSkippedFrames,
              totalFrames: streamStat.outputTotalFrames
            });
          }
        } catch (e) {
          // ignore transient poll error
        }
      }, 2000);

    } catch (err: any) {
      console.error("[OBS CONNECTION ERROR]", err);
      setConnectionStatus('error');
      setErrorMsg(err.message || 'কানেকশন টাইমআউট বা ভুল পাসওয়ার্ড!');
      addLog('OBS-CLIENT', 'error', `OBS স্টুডিওর সাথে সংযোগ করতে ব্যর্থ হয়েছে: ${err.message || 'Not found'}`);
    }
  };

  const handleDisconnectOBS = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (obsRef.current) {
      try {
        obsRef.current.disconnect();
      } catch (e) {}
      obsRef.current = null;
    }

    setConnectionStatus('disconnected');
    setObsBroadcasting(false);
    setStreamStats(null);
    setCurrentScene('N/A');
    addLog('OBS-CLIENT', 'warn', `OBS WebSocket সংযোগ বিচ্ছিন্ন করা হয়েছে।`);
  };

  // Toggle Simulator Mode
  const handleToggleSimulation = () => {
    if (connectionStatus === 'connected') {
      handleDisconnectOBS();
    }
    setSimulationActive(prev => {
      const next = !prev;
      if (next) {
        addLog('OBS-SIMULATOR', 'success', 'OBS ভার্চুয়াল সংযোগ সফলভাবে অ্যাক্টিভেট করা হয়েছে (Simulator Mode Active)!');
        setConnectionStatus('connected');
        setCurrentScene('Esports Showcase Overlay v1');
        setScenesList(['Esports Showcase Overlay v1', 'Talking Head Camera', 'Sponsor Loop Credits']);
      } else {
        setConnectionStatus('disconnected');
        setSimStreamActive(false);
        setCurrentScene('N/A');
        addLog('OBS-SIMULATOR', 'warn', 'OBS ভার্চুয়াল সিমুলেটর বন্ধ করা হয়েছে।');
      }
      return next;
    });
  };

  const handleToggleSimStreaming = () => {
    setSimStreamActive(prev => !prev);
  };

  // Manual Portal UI Sync Action
  const triggerManualSync = () => {
    const isLive = simulationActive ? simStreamActive : obsBroadcasting;
    syncWorkspaceUIWithOBSData(isLive);
  };

  // Render Uptime code format
  const formatSeconds = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div id="obs-websocket-integration-tool" className="bg-slate-900 border border-slate-805 p-6 rounded-2xl flex flex-col gap-5">
      {/* Tool Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Tv className={`w-5 h-5 ${connectionStatus === 'connected' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Desktop OBS Studio Real-time WebSocket Client</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 lines-normal">
            আপনার কম্পিউটারে সচল ওবিএস স্টুডিও থেকে সরাসরি রিয়েল-টাইম সম্প্রচার সনাক্ত করুন এবং লোকাল প্যানেলের UI লাইভ স্ট্যাটাস সিঙ্ক করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Simulation Toggle Fallback Option */}
          <button
            type="button"
            onClick={handleToggleSimulation}
            className={`px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider font-extrabold font-mono transition border ${
              simulationActive 
                ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {simulationActive ? '⚡ SIMULATOR ON' : '🎮 USE OBS SEMILATOR'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left: Settings Panel */}
        <div className="lg:col-span-1 bg-slate-955 p-4 rounded-xl border border-slate-850 flex flex-col gap-4">
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 font-mono flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>OBS WebSocket Settings (ws)</span>
          </h4>

          {simulationActive ? (
            <div className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl text-center flex flex-col gap-2 my-auto">
              <span className="text-lg">🎮</span>
              <p className="text-[11px] text-amber-400 font-semibold leading-relaxed">
                ভার্চুয়াল সিমুলেশন মোড সক্রিয়। আপনি সরাসরি ডানদিকের প্যানেল থেকে ওবিএস ব্রডকাস্ট স্টেট পরিবর্তন করে পোর্টাল সিঙ্ক ফাংশন টেস্ট করুন।
              </p>
              <button
                type="button"
                onClick={handleToggleSimulation}
                className="text-[9px] font-mono text-slate-400 hover:text-white underline"
              >
                প্রকৃত কানেকশন মোডে ফিরে যান
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-mono font-extrabold text-slate-500">Host IP / Target Address</label>
                <input 
                  type="text"
                  value={obsIp}
                  onChange={(e) => setObsIp(e.target.value)}
                  placeholder="e.g. localhost or 127.0.0.1"
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-mono font-extrabold text-slate-500">WebSocket Port (v5 default: 4455)</label>
                <input 
                  type="text"
                  value={obsPort}
                  onChange={(e) => setObsPort(e.target.value)}
                  placeholder="4455"
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] uppercase font-mono font-extrabold text-slate-500">WebSocket Password (ইন্টারনাল ওবিএস পাসওয়ার্ড)</label>
                <input 
                  type="password"
                  value={obsPassword}
                  onChange={(e) => setObsPassword(e.target.value)}
                  placeholder="•••••••••••••• (ঐচ্ছিক)"
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Status display */}
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">কানেকশন স্ট্যাটাস:</span>
                  <span className={`font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                    connectionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400' :
                    connectionStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400' :
                    connectionStatus === 'error' ? 'bg-rose-500/10 text-rose-450' :
                    'bg-slate-900 text-slate-500'
                  }`}>
                    {connectionStatus === 'connected' && <Wifi className="w-3.5 h-3.5" />}
                    {connectionStatus === 'disconnected' && <WifiOff className="w-3.5 h-3.5" />}
                    <span>{connectionStatus}</span>
                  </span>
                </div>

                {errorMsg && (
                  <p className="text-[10px] text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 leading-snug">
                    ⚠️ {errorMsg}
                  </p>
                )}

                {connectionStatus === 'connected' ? (
                  <button
                    type="button"
                    onClick={handleDisconnectOBS}
                    className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs py-2 px-3 rounded-lg mt-1 transition cursor-pointer select-none active:scale-95"
                  >
                    অবস্থান বিচ্ছিন্ন করুন (Disconnect Client)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectOBS}
                    disabled={connectionStatus === 'connecting'}
                    className="w-full bg-emerald-500 hover:bg-emerald-650 text-slate-950 disabled:opacity-40 font-bold text-xs py-2 px-3 rounded-lg mt-1 transition cursor-pointer select-none active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {connectionStatus === 'connecting' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>কানেক্ট হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3.5 h-3.5" />
                        <span>ওবিএস কানেক্ট করুন</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Middle and Right: Control & Diagnostics Panels */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* Sync Control & Broadcast detect node */}
          <div className="bg-slate-955 p-4 rounded-xl border border-slate-850 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
              <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-400 font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>OBS Broadcasting & Portal Synchronizer</span>
              </h4>

              {/* Auto Sync Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-amber-500 w-3.5 h-3.5 focus:ring-0 cursor-pointer"
                />
                <span className="text-[10px] text-slate-350 font-semibold uppercase tracking-wider font-mono">
                  Auto-Sync Portal (অটো সিঙ্ক অন)
                </span>
              </label>
            </div>

            {connectionStatus !== 'connected' ? (
              <div className="text-center py-6 text-slate-500 font-sans flex flex-col items-center justify-center gap-2">
                <Radio className="w-10 h-10 text-slate-705 stroke-[1.2]" />
                <p className="text-xs">
                  OBS WebSocket অথবা Simulator কানেক্ট ও সক্রিয় করুন। এরপর লাইভ ব্রডকাস্টিং প্যারামিটার অবলোকন করতে পারবেন।
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                
                {/* Active status indicator block */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
                  (simulationActive ? simStreamActive : obsBroadcasting)
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    : 'bg-slate-900 border-slate-800/80 text-slate-400'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {(simulationActive ? simStreamActive : obsBroadcasting) ? (
                        <div className="relative flex h-3 w-3 mt-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </div>
                      ) : (
                        <div className="h-3 w-3 rounded-full bg-slate-700 mt-1.5" />
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <span>OBS সম্প্রচার অবস্থা:</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                          (simulationActive ? simStreamActive : obsBroadcasting)
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-950 text-slate-500 border border-slate-900'
                        }`}>
                          {(simulationActive ? simStreamActive : obsBroadcasting) ? 'LIVE / BROADCASTING' : 'IDLE / OFF-AIR'}
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-350 mt-1.5 leading-relaxed font-sans">
                        {(simulationActive ? simStreamActive : obsBroadcasting) 
                          ? "ওবিএস অ্যাপের মাধ্যমে আপনার ডেক্সটপ লাইভ সম্প্রচার সচল রয়েছে। আউটপুট সিগন্যাল সোর্স রিলে হচ্ছে।"
                          : "ওবিএস থেকে কোনো লাইভ সোর্স পাঠানো হচ্ছে না। ওবিএস অ্যাপে 'Start Streaming' বাটনে ক্লিক করুন।"
                        }
                      </p>
                    </div>
                  </div>

                  {/* Right: Connect simulator buttons & Sync trigger */}
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={triggerManualSync}
                      className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white font-bold text-[10px] rounded-lg transition active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto"
                    >
                      <Database className="w-3.5 h-3.5 text-amber-500" />
                      <span>ম্যানুয়ালি সিঙ্ক করুন (Manual Sync)</span>
                    </button>

                    {simulationActive && (
                      <button
                        type="button"
                        onClick={handleToggleSimStreaming}
                        className={`px-3 py-2 text-[10px] font-bold rounded-lg transition active:scale-95 flex items-center justify-center gap-1.5 border-none cursor-pointer ${
                          simStreamActive 
                            ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        }`}
                      >
                        {simStreamActive ? (
                          <>
                            <Square className="w-3 h-3 fill-current text-white" />
                            <span>ভার্চুয়াল লাইভ বন্ধ করুন</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current text-slate-950" />
                            <span>ভার্চুয়াল লাইভ চালু করুন</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid for Scene and Live Streaming Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Scene Selector card */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-sky-450" />
                        <span>সক্রিয় দৃশ্য (Active OBS Scene)</span>
                      </span>
                      <span className="text-[9px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/15 px-1 rounded">
                        OBS Screen Layout
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="text-white text-xs font-mono font-bold bg-slate-950 px-3 py-2 rounded-lg border border-slate-850">
                        🎬 {currentScene}
                      </div>

                      {/* Display scene list if more than 0 */}
                      {scenesList.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-[9px] uppercase font-mono text-slate-500">অন্যান্য সিনসমূহ:</span>
                          <div className="flex flex-wrap gap-1 max-h-[70px] overflow-y-auto">
                            {scenesList.map(scn => (
                              <span 
                                key={scn} 
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${
                                  scn === currentScene
                                    ? 'bg-sky-500/15 border-sky-450 text-sky-305 font-bold'
                                    : 'bg-slate-950 border-slate-900 text-slate-500'
                                }`}
                              >
                                {scn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network stream stats card */}
                  <div className="bg-slate-905 p-4 rounded-xl border border-slate-850/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>লাইভ ডাটা স্ট্রিম স্ট্যাটিস্টিকস</span>
                      </span>
                      <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/15 px-1 rounded">
                        Streaming Telemetry
                      </span>
                    </div>

                    {simulationActive ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-2 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8.5px] font-mono block">FPS TRANSMISSION</span>
                          <span className="text-slate-200 font-bold font-mono">{simFps} fps</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8.5px] font-mono block">BITRATE SINK</span>
                          <span className="text-amber-400 font-bold font-mono">{(simBitrate / 1000).toFixed(1)} Mbps</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded border border-slate-900 leading-snug col-span-2 flex justify-between items-center">
                          <div>
                            <span className="text-slate-500 text-[8.5px] font-mono block">UPTIME DURATION</span>
                            <span className="text-slate-200 font-bold font-mono">{formatSeconds(simUptime)}</span>
                          </div>
                          <span className="text-[8px] uppercase font-mono text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 rounded font-extrabold select-none animate-pulse">
                            {simStreamActive ? 'ACTIVE CONGESTION OK' : 'STREAM STOPPED'}
                          </span>
                        </div>
                      </div>
                    ) : streamStats ? (
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8px] font-mono block">ACTIVE FPS</span>
                          <span className="text-slate-200 font-bold font-mono">{streamStats.fps} fps</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8px] font-mono block">CPU UTILIZATION</span>
                          <span className="text-slate-200 font-bold font-mono">{streamStats.cpuClass}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8px] font-mono block">STABILIZED BITRATE</span>
                          <span className="text-amber-400 font-bold font-mono">{streamStats.bitrate > 0 ? `${streamStats.bitrate} kbps` : 'Calculating...'}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-900 leading-snug">
                          <span className="text-slate-500 text-[8px] font-mono block">UPTIME DURATION</span>
                          <span className="text-slate-200 font-bold font-mono">{streamStats.uptime}</span>
                        </div>
                        {streamStats.skippedFrames > 0 && (
                          <div className="col-span-2 text-[9px] text-rose-400 bg-rose-500/5 p-1 rounded font-mono">
                            ⚠️ Frames Dropped: {streamStats.skippedFrames} / {streamStats.totalFrames} (Network congestion detected)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-550 italic text-[11px] font-mono">
                        {obsBroadcasting ? "অপেক্ষা করুন... লাইভ টেলিমেট্রি লোড হচ্ছে।" : "কোনো স্ট্রিম টেলিমেট্রি পাওয়া যায়নি (Off Air)."}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Sync Status Banner */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex items-start gap-3 justify-between">
        <div className="flex gap-2.5 items-start">
          <Database className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="leading-snug">
            <span className="text-white font-bold text-xs font-sans block">পোর্টালে রিয়াক্টিভ রিলে সিঙ্ক চ্যানেল</span>
            <p className="text-[11px] text-slate-400 mt-1 lines-normal">
              বর্তমানে সক্রিয় রয়েছে <strong className="text-amber-500 font-mono">{destinations.filter(d => d.enabled).length} টি</strong> রিলে ডেস্টিনেশন। 
              ওবিএস চালু হলে এই ডেস্টিনেশনগুলো স্বয়ংক্রিয়ভাবে <span className="text-rose-400 font-bold uppercase tracking-wide font-mono">streaming</span> মুডে সিঙ্ক হয়ে লাইভ টার্মিনাল ড্যাশবোর্ড আপডেট করবে।
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
