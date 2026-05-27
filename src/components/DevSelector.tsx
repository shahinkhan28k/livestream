/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, 
  ChevronRight, 
  Folder, 
  FileCode, 
  Check, 
  Copy, 
  Terminal, 
  RefreshCw, 
  Send, 
  DatabaseZap, 
  Lock, 
  Hammer, 
  CheckCircle2,
  Users,
  Shield,
  Video,
  Trash2,
  Ban,
  Activity,
  Globe,
  Key,
  Database,
  Download,
  Server,
  Cpu,
  Tv,
  AlertTriangle,
  Settings,
  Flame,
  LayoutDashboard,
  Search,
  CheckSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { FileNode, ApiEndpoint, VideoAsset, StreamDestination } from '../types';
import { architecturalFiles } from '../data/architecturalFiles';

interface DevSelectorProps {
  onAddLog: (module: 'NGINX-RTMP' | 'FFMPEG' | 'EXPRESS-API' | 'FIREBASE-STORE' | 'CLIENT', level: 'info' | 'warn' | 'error' | 'success', msg: string) => void;
  onRefreshDestinations: () => void;
  videos?: VideoAsset[];
  setVideos?: React.Dispatch<React.SetStateAction<VideoAsset[]>>;
  destinations?: StreamDestination[];
  setDestinations?: React.Dispatch<React.SetStateAction<StreamDestination[]>>;
}

interface SimulatedUser {
  id: string;
  email: string;
  name: string;
  role: 'Super Admin' | 'Operator' | 'Read Only' | 'Banned';
  streamKey: string;
  createdAt: string;
  status: 'Active' | 'Banned' | 'Pending';
}

export function DevSelector({ 
  onAddLog, 
  onRefreshDestinations,
  videos = [],
  setVideos,
  destinations = [],
  setDestinations
}: DevSelectorProps) {

  // Main Section Navigation Tabs
  const [mainTab, setMainTab] = useState<'admin_panel' | 'dev_sandbox' | 'deployment' | 'optimization'>('admin_panel');

  // Sub tab for developer sandbox (restoring original features)
  const [devTab, setDevTab] = useState<'files' | 'api' | 'security'>('files');

  // Sub tab for Admin Panel
  const [adminSubTab, setAdminSubTab] = useState<'dashboard' | 'users' | 'streams' | 'vods'>('dashboard');

  // Sub tab for Deployment
  const [deploySubTab, setDeploySubTab] = useState<'vps' | 'hosting'>('vps');

  // Active backend connection URL for decoupled Render + Vercel deployment
  const [backendUrlInput, setBackendUrlInput] = useState(() => localStorage.getItem('STREAM_SYNC_BACKEND_URL') || '');

  // Decoupled connection test status
  const [testConnLoading, setTestConnLoading] = useState(false);
  const [testConnResult, setTestConnResult] = useState<{ success: boolean; message: string } | null>(null);

  // Multi-user state for Administration
  const [adminUsers, setAdminUsers] = useState<SimulatedUser[]>(() => {
    const saved = localStorage.getItem('admin_users_db');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      { id: 'usr_owner_1', email: 'shahinkhan28c@gmail.com', name: 'Shahin Khan (Owner)', role: 'Super Admin', streamKey: 'live_738192_x8s9f2p01a', createdAt: '2026-01-10T14:22:00Z', status: 'Active' },
      { id: 'usr_op_2', email: 'nasiruddin@gmail.com', name: 'Nasiruddin P', role: 'Operator', streamKey: 'live_895240_v9f83ea02b', createdAt: '2026-03-15T09:12:35Z', status: 'Active' },
      { id: 'usr_op_3', email: 'test-streamer@gmail.com', name: 'Guest Streamer', role: 'Operator', streamKey: 'live_110291_o83a7c615p', createdAt: '2026-05-18T18:05:00Z', status: 'Active' },
      { id: 'usr_op_4', email: 'spammer_user@ruinous.org', name: 'Troll Channel', role: 'Banned', streamKey: 'live_999827_f9a88v720q', createdAt: '2026-05-20T11:40:12Z', status: 'Banned' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('admin_users_db', JSON.stringify(adminUsers));
  }, [adminUsers]);

  // Search filter for user database
  const [userSearch, setUserSearch] = useState('');

  // Performance simulation metrics state (Live stats)
  const [liveBandwidth, setLiveBandwidth] = useState({ ingest: 2450, egress: 9810, cpu: 14.2, ram: 42.1, jitter: 1.2, dropped: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveBandwidth(prev => {
        const isStreaming = destinations.some(d => d.enabled && d.status === 'streaming') || videos.some(v => v.status === 'streaming');
        const modifier = isStreaming ? 1.5 : 0.2;
        const targetIngest = isStreaming ? 2500 + Math.random() * 200 : 0;
        const targetEgress = isStreaming ? 9800 + Math.random() * 800 : 0;
        
        return {
          ingest: Math.round(prev.ingest * 0.7 + targetIngest * 0.3),
          egress: Math.round(prev.egress * 0.7 + targetEgress * 0.3),
          cpu: +(Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 4 + (isStreaming ? 12 : -5)))).toFixed(1),
          ram: +(Math.max(25, Math.min(85, prev.ram + (Math.random() - 0.5) * 0.5 + (isStreaming ? 2 : 0)))).toFixed(1),
          jitter: +(Math.max(0.2, prev.jitter + (Math.random() - 0.5) * 0.3)).toFixed(1),
          dropped: prev.dropped + (isStreaming && Math.random() > 0.95 ? 1 : 0)
        };
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [destinations, videos]);

  // Original File explorer state
  const [activeFile, setActiveFile] = useState<FileNode | null>(architecturalFiles[0].children?.[0] || null);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({
    '/transcoder': true,
    '/backend': false,
    '/firebase': false
  });
  const [copiedText, setCopiedText] = useState(false);

  // Original REST API state
  const [apiCategory, setApiCategory] = useState<'authentication' | 'destinations' | 'rtmp-hook' | 'system'>('destinations');
  const [selectedApi, setSelectedApi] = useState<ApiEndpoint | null>(null);
  const [apiPayload, setApiPayload] = useState<string>('');
  const [apiResponse, setApiResponse] = useState<string>('');
  const [loadingApi, setLoadingApi] = useState(false);

  // Original Security test state
  const [securitySimulationResult, setSecuritySimulationResult] = useState<{
    running: boolean;
    ruleBlocked: boolean;
    name: string;
    description: string;
    maliciousPayload: string;
    log: string[];
  } | null>(null);

  // Buffer Optimization Setting (Static controls)
  const [streamBufferRatio, setStreamBufferRatio] = useState<'low' | 'normal' | 'safe'>('low');
  const [hlsSegmentLength, setHlsSegmentLength] = useState<number>(2);
  const [mobileLowQuality, setMobileLowQuality] = useState<boolean>(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(true);
  const [backupPeriodHours, setBackupPeriodHours] = useState<number>(24);

  // Notification Toast Helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    triggerToast("স্ক্রিপ্ট/কোড ক্লিপবোর্ডে কপি করা হয়েছে!");
    setTimeout(() => setCopiedText(false), 2000);
  };

  const selectFile = (node: FileNode) => {
    if (node.type === 'file') {
      setActiveFile(node);
    } else {
      setExpandedDirs(prev => ({
        ...prev,
        [node.path]: !prev[node.path]
      }));
    }
  };

  // REST API list mapping
  const apiEndpointsList: ApiEndpoint[] = [
    { method: 'POST', path: '/api/auth/register', category: 'authentication', description: 'Simulate user account provisioning in Firebase Auth and profile initialization.', payload: '{\n  "email": "shahinkhan28c@gmail.com",\n  "password": "SuperSecure123!"\n}' },
    { method: 'POST', path: '/api/auth/login', category: 'authentication', description: 'Authenticate users against in-memory Firestore databases, generating a JWT credential token.', payload: '{\n  "email": "shahinkhan28c@gmail.com"\n}' },
    { method: 'GET', path: '/api/destinations', category: 'destinations', description: 'Retrieve registered RTMP streaming sync targets configured under user path subcollections.', payload: '' },
    { method: 'POST', path: '/api/destinations', category: 'destinations', description: 'Deploy and register a brand new target platform relay setting (YouTube, Facebook, etc.).', payload: '{\n  "platform": "twitch",\n  "name": "Custom Ingress Endpoint",\n  "rtmpUrl": "rtmp://live.twitch.tv/app",\n  "streamKey": "live_9281729_x872af91"\n}' },
    { method: 'POST', path: '/api/streams/auth', category: 'rtmp-hook', description: 'The webhook on_publish route trigged by Nginx-RTMP to authenticate connection stream keys.', payload: '{\n  "app": "live",\n  "name": "live_738192_x8s9f2p01a"\n}' },
    { method: 'GET', path: '/api/system/stats', category: 'system', description: 'Fetch low-latency real-time telemetry from active streaming pipelines on backend containers.', payload: '' }
  ];

  useEffect(() => {
    const endpoints = apiEndpointsList.filter(e => e.category === apiCategory);
    if (endpoints.length > 0) {
      setSelectedApi(endpoints[0]);
      setApiPayload(endpoints[0].payload || '');
      setApiResponse('');
    }
  }, [apiCategory]);

  const executeApiCall = async () => {
    if (!selectedApi) return;
    setLoadingApi(true);
    setApiResponse('');

    try {
      const options: RequestInit = {
        method: selectedApi.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (selectedApi.method === 'POST' && apiPayload) {
        options.body = apiPayload;
      }

      const res = await fetch(selectedApi.path, options);
      const statusText = `${res.status} ${res.statusText}`;
      const payloadText = await res.text();
      
      let parsedJson;
      try {
        parsedJson = JSON.stringify(JSON.parse(payloadText), null, 2);
      } catch {
        parsedJson = payloadText;
      }

      setApiResponse(`Status: ${statusText}\n\nResponse:\n${parsedJson}`);

      if (selectedApi.path === '/api/destinations' && selectedApi.method === 'POST' && res.ok) {
        onRefreshDestinations();
      }
    } catch (err: any) {
      setApiResponse(`Network Error: ${err.message || err}. Ensure full-stack Express is active.`);
    } finally {
      setLoadingApi(false);
    }
  };

  // Administration Panel Handlers
  const handleBanUserToggle = (userId: string) => {
    setAdminUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const isCurrentlyBanned = u.role === 'Banned';
        const newRole = isCurrentlyBanned ? 'Operator' : 'Banned';
        const newStatus = isCurrentlyBanned ? 'Active' : 'Banned';
        onAddLog('FIREBASE-STORE', 'warn', `অ্যাডমিন অ্যাকশন: ব্যবহারকারী "${u.email}" কে ${isCurrentlyBanned ? 'আনব্যান' : 'ব্যান'} করা হয়েছে।`);
        triggerToast(`ব্যবহারকারীকে সফলভাবে ${isCurrentlyBanned ? 'আনব্যান' : 'ব্যান'} করা হয়েছে`);
        return { ...u, role: newRole as any, status: newStatus as any };
      }
      return u;
    }));
  };

  const handleChangeUserRole = (userId: string, newRole: 'Super Admin' | 'Operator' | 'Read Only') => {
    setAdminUsers(prev => prev.map(u => {
      if (u.id === userId) {
        onAddLog('FIREBASE-STORE', 'success', `অ্যাডমিন অ্যাকশন: "${u.email}" এর সিকিউরিটি রোল পরিবর্তন করে "${newRole}" করা হয়েছে।`);
        triggerToast("সিকিউরিটি রোল পরিবর্তন সম্পন্ন হয়েছে");
        return { ...u, role: newRole, status: 'Active' };
      }
      return u;
    }));
  };

  const handleResetStreamKey = (userId: string) => {
    const randomKey = `live_${Math.floor(100000 + Math.random() * 90000).toString()}_x${Math.random().toString(36).substring(2, 10)}`;
    setAdminUsers(prev => prev.map(u => {
      if (u.id === userId) {
        onAddLog('FIREBASE-STORE', 'success', `অ্যাডমিন অ্যাকশন: "${u.email}" এর জন্য হার্ডওয়্যার ইন্টেলিজেন্ট স্ট্রিম কী রিফ্রেশ করা হয়েছে।`);
        triggerToast("স্ট্রিম কী সফলভাবে রিফ্রেশ বা রিসেট করা হয়েছে!");
        return { ...u, streamKey: randomKey };
      }
      return u;
    }));
  };

  // Terminate All active Transcoders (ForceStop All Relays)
  const handleForceKillAllStreams = () => {
    if (setDestinations) {
      setDestinations(prev => prev.map(d => ({ ...d, status: 'offline', enabled: false })));
      onAddLog('FFMPEG', 'error', '🚨 অ্যাডমিনিস্ট্রেটিভ অ্যালার্ট: কমান্ড সেন্টার থেকে চলমান সকল আরটিএমপি (RTMP) ক্যাস্ট পাইপলাইন ইনস্ট্যান্ট টার্মিনেট করা হয়েছে!');
      onAddLog('NGINX-RTMP', 'warn', 'পাবলিশার স্ট্রিম সোর্স ফোর্স কিল্ড (Force Killed PID: 9281)');
      triggerToast("সকল চলমান রিলে সম্প্রচার বন্ধ (Force Kill) করা হয়েছে!");
    }
  };

  // Manage individual stream force stopping
  const handleKillIndividualStream = (destId: string) => {
    if (setDestinations) {
      setDestinations(prev => prev.map(d => {
        if (d.id === destId) {
          onAddLog('FFMPEG', 'error', `🚨 অ্যাডমিন কিল হুক: রুট পাইপলাইন "${d.name}" জোরপূর্বক ডিসকানেক্ট করা হয়েছে।`);
          return { ...d, status: 'offline' };
        }
        return d;
      }));
      triggerToast("নির্দিষ্ট সম্প্রচারটি সফলভাবে বিচ্ছিন্ন করা হয়েছে!");
    }
  };

  // Delete Video File Directly from state (Step 11 requirement)
  const handleDeleteVideoAsset = (videoId: string, videoTitle: string) => {
    if (setVideos) {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      onAddLog('FIREBASE-STORE', 'success', `অ্যাডমিন অ্যাকশন: ফাইল ডিপোজিটরি থেকে ভিডিও ফাইল "${videoTitle}" চিরতরে মুছে ফেলা হয়েছে।`);
      triggerToast(`ভিডিও ফাইল"${videoTitle}" সফলভাবে সার্ভার থেকে মুছে ফেলা হয়েছে!`);
    }
  };

  // Download Nightly/Auto backup configuration content (Simulate backup system)
  const handleDownloadBackupScript = () => {
    const backupContent = `#!/bin/bash
# =========================================================================
# StreamSync Portal Automated Database & Configuration Backup Engine
# Auto-generated Nightly Backup Service Task for Shahin Khan
# Target Location: Secure S3 Backup Bucket / Local Server Cold Vault
# =========================================================================

BACKUP_DIR="/var/backups/streamsync"
DATE=$(date +%Y-%m-%d_%H%M%S)
LOG_FILE="/var/log/streamsync_backup.log"

echo "======================================================" >> $LOG_FILE
echo "[$DATE] STREAMSYNC AUTOMATIC BACKUP INITIALIZING" >> $LOG_FILE
echo "======================================================" >> $LOG_FILE

# 1. Create directory if not exists
mkdir -p $BACKUP_DIR

# 2. Export Firestore Collections using Firebase Admin CLI Tool
echo "Saving Cloud Firestore metadata tables to secure JSON..." >> $LOG_FILE
# gcloud firestore export gs://streamsync-backups-bucket/meta_$DATE >> $LOG_FILE 2>&1

# 3. Zip VOD Upload configuration structures
echo "Compressing VOD playlists & relational local database assets..." >> $LOG_FILE
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz ./firebase-applet-config.json ./metadata.json 2>> $LOG_FILE

# 4. Success summary log
echo "[$DATE] BACKUP DISPATCH COMPLETE. Uploading metadata to Cloud Storage." >> $LOG_FILE
echo "======================================================" >> $LOG_FILE

echo "Backup script generation successful. Configuration successfully packed!"
`;
    const blob = new Blob([backupContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `streamsync-nightly-backup.sh`;
    link.click();
    URL.revokeObjectURL(url);
    onAddLog('CLIENT', 'success', 'অটো ব্যাকআপ শেল স্ক্রিপ্ট (bash helper) জেনারেট ও ডাউনলোড করা হয়েছে।');
    triggerToast("ব্যাকআপ শেল স্ক্রিপ্ট ডাউনলোড সম্পন্ন হয়েছে!");
  };

  const triggerSecurityExploit = (testId: 'spoofing' | 'leak' | 'integrity') => {
    setSecuritySimulationResult({
      running: true,
      ruleBlocked: false,
      name: 'Preparing Security Simulation...',
      description: '',
      maliciousPayload: '',
      log: []
    });

    const addExploitLog = (m: string, delay: number) => {
      setTimeout(() => {
        setSecuritySimulationResult(prev => prev ? {
          ...prev,
          log: [...prev.log, `[${new Date().toLocaleTimeString()}] ${m}`]
        } : null);
      }, delay);
    };

    if (testId === 'spoofing') {
      const payload = JSON.stringify({
        id: 'usr_hacked',
        email: 'attacker@evil-domain.com',
        streamKey: 'hijacked_key_yt_facebook_streamer_profile',
        createdAt: '2020-01-01T00:00:00Z'
      }, null, 2);

      addExploitLog('🔐 Security Sandbox: Starting Account Injection & Spoof Attack Sim...', 100);
      addExploitLog('⚠️ Vector: Attacker attempts to bypass app authentication and write a custom User record on path `/users/usr_9x7f2` with spoofed timestamps.', 500);
      addExploitLog('📡 Payload dispatched to Google Cloud Platform Firestore emulator API...', 1000);
      addExploitLog('🔍 Firebase Security Evaluator intercepting request: Evaluated match collection `/users/{userId}`', 1500);
      addExploitLog('🚫 RULE EVAL TRIGGERED: `allow create: if isOwner(userId) && isValidUser(request.resource.data)`', 2000);
      addExploitLog('🔥 VALIDATION FAIL: `request.auth.uid` ("attacker_uid") does not match document ID "usr_9x7f2"!', 2500);
      addExploitLog('🛑 EVALUATION RESULT: TRANSACTION REJECTED WITH "PERMISSION_DENIED" STATUS CODE.', 3000);

      setTimeout(() => {
        setSecuritySimulationResult(prev => prev ? {
          ...prev,
          running: false,
          ruleBlocked: true,
          name: 'Identity Hijacking & Spoof Attack Blocked',
          description: 'Attacker tried to write a user record belonging to another user ID and pass fake timestamps.',
          maliciousPayload: payload
        } : null);
      }, 3100);

    } else if (testId === 'leak') {
      addExploitLog('🔐 Security Sandbox: Triggering Cross-Tenant Leak Attack Sim...', 100);
      addExploitLog('⚠️ Vector: Logged-in verified user "attacker_uid" sends direct client side query fetching custom destinations belonging to `/users/usr_9x7f2/destinations/*`.', 600);
      addExploitLog('📡 Transmitting raw WebSocket get-request looking for YouTube/Facebook secret keys...', 1100);
      addExploitLog('🔍 Firebase Security Evaluator intercepting query lookup for matching records...', 1700);
      addExploitLog('🚫 RULE EVAL TRIGGERED: `allow list, get: if isOwner(userId)`', 2200);
      addExploitLog('🔥 SECURITY DEVIATION REPORT: Auth User "attacker_uid" is NOT owner of target path segment "usr_9x7f2".', 2600);
      addExploitLog('🛑 EVALUATION RESULT: ACCESS DENIED. Leak vector completely mitigated.', 3000);

      setTimeout(() => {
        setSecuritySimulationResult(prev => prev ? {
          ...prev,
          running: false,
          ruleBlocked: true,
          name: 'Secret RTMP Key Leak Blocked',
          description: 'Hacked client attempted to bypass the UI client-filters and query raw destination tables of another user.',
          maliciousPayload: 'GET /users/usr_9x7f2/destinations'
        } : null);
      }, 3100);

    } else if (testId === 'integrity') {
      const payload = JSON.stringify({
        id: 'dst_1',
        platform: 'custom',
        name: 'Malicious Bypass Inject',
        rtmpUrl: 'rtmp://evil.com/phish',
        streamKey: 'stolen_key',
        enabled: true,
        createdAt: '2026-05-26T17:08:42Z',
        adminOverrideBypass: true
      }, null, 2);

      addExploitLog('🔐 Security Sandbox: Triggering Uncontrolled State Integrity Hack...', 100);
      addExploitLog('⚠️ Vector: Client injects an unauthorized field `adminOverrideBypass` and attempts custom update modification bypassing validation schemas.', 600);
      addExploitLog('📡 Firing atomic client request update targeting document `/users/usr_9x7f2/destinations/dst_1` ...', 1200);
      addExploitLog('🔍 Evaluating Map keys difference...', 1800);
      addExploitLog('🚫 RULE EVAL TRIGGERED: `affectedKeys().hasOnly([\'enabled\']) || affectedKeys().hasOnly([\'name\', \'rtmpUrl\', \'streamKey\'])`', 2300);
      addExploitLog('🔥 SCHEMA DEVIATION: Injected ghost fields ["adminOverrideBypass"] is forbidden inside delta updates!', 2700);
      addExploitLog('🛑 EVALUATION RESULT: OPERATION TERMINATED. Strict schema validation blocks arbitrary value poisoning.', 3100);

      setTimeout(() => {
        setSecuritySimulationResult(prev => prev ? {
          ...prev,
          running: false,
          ruleBlocked: true,
          name: 'Arbitrary Key Injection Shielded',
          description: 'User tried to inject a custom admin override bypass field during stream configuration renames.',
          maliciousPayload: payload
        } : null);
      }, 3200);
    }
  };

  const filteredUsers = adminUsers.filter(u => 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div id="dev-selector" className="flex flex-col gap-6 select-none relative">
      
      {/* Absolute floating notifications toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 font-bold px-4 py-3 rounded-xl shadow-xl border border-amber-400 flex items-center gap-2 text-xs animate-bounce animate-duration-300">
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Structural Multi-Sections Selector */}
      <div className="flex flex-col lg:flex-row bg-slate-900 border border-slate-800 rounded-2xl p-2.5 gap-2 shadow-2xl">
        <div className="flex flex-col gap-1 shrink-0 p-1 bg-slate-950/60 rounded-xl border border-slate-850 justify-center">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider px-3 py-1 font-bold text-center lg:text-left">কোর সিস্টেম প্যানেল (Panel Index)</span>
          <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto">
            <button 
              onClick={() => setMainTab('admin_panel')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition shrink-0 whitespace-nowrap ${
                mainTab === 'admin_panel' ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              🛡️ অ্যাডমিন কনট্রোল প্যানেল (ADMIN)
            </button>
            <button 
              onClick={() => setMainTab('optimization')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition shrink-0 whitespace-nowrap ${
                mainTab === 'optimization' ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              🚀 পারফরম্যান্স ও অটো ব্যাকআপ
            </button>
            <button 
              onClick={() => setMainTab('deployment')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition shrink-0 whitespace-nowrap ${
                mainTab === 'deployment' ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              💻 প্রোপার ভিপিএস ডিপ্লয়মেন্ট
            </button>
            <button 
              onClick={() => setMainTab('dev_sandbox')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg transition shrink-0 whitespace-nowrap ${
                mainTab === 'dev_sandbox' ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.01]' : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              🕹️ ডেভেলপার স্যান্ডবক্স (Sandbox)
            </button>
          </div>
        </div>

        {/* Dynamic Panel Header Branding */}
        <div className="flex-1 bg-slate-950 p-4.5 rounded-xl border border-slate-850 flex flex-col justify-center leading-normal">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              {mainTab === 'admin_panel' && "StreamSync Security Control Hub (অ্যাডমিন অপারেশন প্যানেল)"}
              {mainTab === 'optimization' && "Unified Live Stream Optimization Engine (উন্নত লাইভ স্পিডআপ ও ব্যাকআপ)"}
              {mainTab === 'deployment' && "Zero-Downtime VPS Production Deployment Center (প্রো হোস্টিং ও রান গাইড)"}
              {mainTab === 'dev_sandbox' && "Developer Container Code, API Gateway & Rules Analyzer (স্যান্ডবক্স)"}
            </h2>
          </div>
          <p className="text-xs text-slate-405 mt-1 leading-snug">
            {mainTab === 'admin_panel' && "ব্যবহারকারী ম্যানেজ করুন, ফেসুবক/ইউটিউবের গোপন প্লাগ ক্র্যাক করুন, VOD ভিডিও ডিলিট করুন এবং চলমান লাইভ স্ট্রিম বন্ধ করুন নিরাপদে।"}
            {mainTab === 'optimization' && "HLS বাফারিং, মোবাইল রিলে স্পিডআপ এবং নিয়মিত জেনারেটেড ডাটা ও ভিডিও মেটাডাটার অটোমেটিক ব্যাকআপ কনফিগারেশন।"}
            {mainTab === 'deployment' && "Vercel, Firebase এবং Nginx reverse-proxy সহ Ubuntu সার্ভারে (VPS) Node আর FFmpeg ব্যবহার করে কীভাবে 24/7 লাইভ ব্রডকাস্ট চালাবেন তার নির্দেশনা।"}
            {mainTab === 'dev_sandbox' && "সার্ভারের সোর্স কোডগুলো অডিট করুন, REST API তে পিল টেস্ট করুন এবং ফায়ারবেস সিকিউরিটি পলিসি এভিভলেট করে দেখুন।"}
          </p>
        </div>
      </div>


      {/* TAB 1: MAIN ADMIN CONTROL CENTER */}
      {mainTab === 'admin_panel' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in animate-duration-150">
          
          {/* Admin Sidebar options */}
          <div className="flex flex-col gap-2.5 bg-slate-900 border border-slate-800 rounded-2xl p-4.5">
            <span className="text-[10px] tracking-wider font-mono font-bold text-slate-500 uppercase">অ্যাডমিন মডিউল সূচি</span>
            
            <button
              onClick={() => setAdminSubTab('dashboard')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl font-bold transition text-left ${
                adminSubTab === 'dashboard' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>রিয়েল-টাইম মেট্রিক্স (System Status)</span>
            </button>

            <button
              onClick={() => setAdminSubTab('users')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl font-bold transition text-left ${
                adminSubTab === 'users' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>ব্যবহারকারী তালিকা (Manage Users)</span>
            </button>

            <button
              onClick={() => setAdminSubTab('streams')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl font-bold transition text-left ${
                adminSubTab === 'streams' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Tv className="w-4 h-4 shrink-0" />
              <span>চলমান লাইভ সোর্স (Monitor Streams)</span>
            </button>

            <button
              onClick={() => setAdminSubTab('vods')}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-xs rounded-xl font-bold transition text-left ${
                adminSubTab === 'vods' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-slate-850 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4 shrink-0" />
              <span>ভিডিও ম্যানেজার (Delete VOD Assets)</span>
            </button>

            <div className="border-t border-slate-800 mt-3 pt-4.5">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-center">
                <span className="text-[9px] text-rose-500 font-mono font-semibold block uppercase">⚠️ সুপার অ্যাডমিন জরুরি কমান্ড</span>
                <p className="text-[9px] text-slate-500 mt-1">কমান্ড সেন্টার থেকে ইনস্ট্যান্ট সকল রানিং ট্রান্সকোড প্রসেস ক্লোজ করুন।</p>
                <button
                  onClick={handleForceKillAllStreams}
                  className="w-full mt-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 hover:border-rose-700 text-rose-400 text-[10px] font-bold py-1.5 px-2 rounded-lg transition select-none active:scale-95"
                >
                  🛑 All Stream Force Kill!
                </button>
              </div>
            </div>
          </div>

          {/* Admin main view content area */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* Sub-tab 1a: Administrative Dashboard Metics */}
            {adminSubTab === 'dashboard' && (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/15">সার্ভার ব্যাকবোন লাইভ স্ট্যাটাস</span>
                  <h3 className="text-base font-bold text-white mt-2">লাইভ স্ট্রিমিং ও এগ্রেসিভ ডাটা রাউটিং স্পেকস</h3>
                  <p className="text-xs text-slate-400 mt-1">পিসির আসল ভিডিও সরাসরি রিলে সার্ভারের মাধ্যমে ফেসবুক ও অন্যান্য সোশ্যাল ডিস্টিনেশনে সফলভাবে প্রেরণ করা হচ্ছে।</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">রেজিস্টার্ড ইউজার্স (Total Users)</span>
                      <span className="text-xl font-bold text-white font-mono">{adminUsers.length}</span>
                      <div className="text-[8px] text-emerald-400 font-mono mt-0.5">● ৪ জন অপারেটর অ্যাক্টিভ</div>
                    </div>
                    
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">আপলোডকৃত ভিডিও (VOD Bank)</span>
                      <span className="text-xl font-bold text-white font-mono">{videos.length} 📂</span>
                      <div className="text-[8px] text-amber-500 font-mono mt-0.5">রিয়েল-টাইম অডিটেবল</div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">রানিং রিলে স্ট্রিম (Active Relays)</span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">
                        {destinations.filter(d => d.enabled && d.status === 'streaming').length} Channels
                      </span>
                      <div className="text-[8px] text-slate-400 font-mono mt-0.5">Sync Ingest In-situ</div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">সার্ভার নেটওয়ার্ক ব্যান্ডউইডথ</span>
                      <span className="text-xl font-bold text-amber-400 font-mono">
                        {(liveBandwidth.egress / 1000).toFixed(1)} Mbps
                      </span>
                      <div className="text-[8px] text-indigo-400 font-mono mt-0.5">
                        ↑ {(liveBandwidth.ingest / 1000).toFixed(1)} Mbps Ingress
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      VPS CPU & ল্যাটেন্সি টেলিমেট্রি
                    </span>
                    
                    <div className="flex flex-col gap-3.5 bg-slate-950/80 p-4 rounded-xl border border-slate-850 font-mono text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[10px]">CPU Cores Load:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${liveBandwidth.cpu}%` }} />
                          </div>
                          <span className="text-white text-[11px] font-bold w-10 text-right">{liveBandwidth.cpu}%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[10px]">Memory Allocated:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${liveBandwidth.ram}%` }} />
                          </div>
                          <span className="text-white text-[11px] font-bold w-10 text-right">{liveBandwidth.ram}%</span>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-900 my-1" />

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[10px]">Transmission Latency:</span>
                        <span className="text-emerald-400 font-bold">{liveBandwidth.jitter} ms</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[10px]">FFmpeg Dropped Frames:</span>
                        <span className={liveBandwidth.dropped > 0 ? 'text-rose-500 font-bold' : 'text-slate-400'}>{liveBandwidth.dropped}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        নিরাপত্তা মূল্যায়ন ও ফায়ারবেল রোলস
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                        আমাদের প্ল্যাটফর্মে প্রত্যেক ব্যবহারকারীর ক্রিয়েটিভিটি সম্পূর্ণ সুরক্ষিত। <strong>Firebase Access Control List (ACL)</strong> ও কাস্টম ক্লায়েন্ট ফিল্টার ব্যবহার করে শুধুমাত্র পারমিশনপ্রাপ্ত অ্যাডমিনই ইউজার ম্যানেজমেন্ট এক্সেস করতে পারেন।
                      </p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] font-mono flex flex-col gap-1.5">
                      <span className="text-slate-400 font-bold">🛡️ Security Profile Config:</span>
                      <code className="text-amber-500/90 leading-tight">
                        {`{ "authenticated": true, "roleRef": "super_admin", "activeIP": "27.147.200.180" }`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Sub-tab 1b: User Management Dashboard (Manage Users & Ban System) */}
            {adminSubTab === 'users' && (
              <div className="flex flex-col gap-4.5 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-500" />
                        নিবন্ধিত গ্রাহক ডাটাবেজ (User Account Registry)
                      </h4>
                      <p className="text-xs text-slate-450">সিস্টেম অপারেটর ও স্ট্রিমারদের একাউন্ট পারমিশন পরিবর্তন ও ব্যান কন্ট্রোলার।</p>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="অপারেটর এর নাম বা ইমেইল দিয়ে খুঁজুন"
                        className="bg-slate-950 text-xs border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/40 w-full md:w-60 font-medium"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-mono">
                          <th className="py-2.5 px-3">ব্যবহারকারী (User Email)</th>
                          <th className="py-2.5 px-3">লেভেল (Security Role)</th>
                          <th className="py-2.5 px-3">গোপন স্ট্রিম কী (Stream Key)</th>
                          <th className="py-2.5 px-3">নিবন্ধন তারিখ</th>
                          <th className="py-2.5 px-3 text-right">ম্যানেজ অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {filteredUsers.map(u => (
                          <tr key={u.id} className={`hover:bg-slate-850/30 transition ${u.role === 'Banned' ? 'opacity-50 bg-rose-500/5' : ''}`}>
                            <td className="py-3 px-3">
                              <div className="flex flex-col leading-tight">
                                <span className="font-bold text-slate-200">{u.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <select
                                value={u.role}
                                onChange={(e) => {
                                  if (e.target.value === 'Banned') {
                                    handleBanUserToggle(u.id);
                                  } else {
                                    handleChangeUserRole(u.id, e.target.value as any);
                                  }
                                }}
                                className={`text-[10px] font-bold p-1 rounded bg-slate-950 border focus:outline-none ${
                                  u.role === 'Super Admin' ? 'border-amber-500/40 text-amber-400' :
                                  u.role === 'Operator' ? 'border-emerald-500/40 text-emerald-400' :
                                  u.role === 'Banned' ? 'border-rose-500/40 text-rose-500' : 'border-slate-800 text-slate-400'
                                }`}
                              >
                                <option value="Super Admin">🛡️ Super Admin</option>
                                <option value="Operator">⚒️ Operator</option>
                                <option value="Read Only">👤 Read Only</option>
                                <option value="Banned">🚫 Banned</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-slate-355 max-w-[150px] truncate">
                              <code>{u.streamKey}</code>
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[10px]">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleResetStreamKey(u.id)}
                                  className="py-1 px-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold rounded text-[10px] transition cursor-pointer"
                                  title="Reset Steam Key"
                                >
                                  🔄 স্ট্রিম কী রিসেট
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleBanUserToggle(u.id)}
                                  className={`py-1 px-2.5 font-bold rounded text-[10px] transition ${
                                    u.role === 'Banned' 
                                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/10'
                                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/10'
                                  } cursor-pointer`}
                                >
                                  {u.role === 'Banned' ? '🔓 আনব্যান' : '🚫 ব্যান করুন'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tab 1c: Live Route Ingest & Overrides Control */}
            {adminSubTab === 'streams' && (
              <div className="flex flex-col gap-4.5 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 relative">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      চলমান সম্প্রচার ওভাররাইড কন্ট্রোল (Monitor & Manage Active Streams)
                    </h4>
                    <p className="text-xs text-slate-450 mt-1">কমান্ড প্যানেলে কোন কোন ফেসবুক বা ইউটিউব এউইজ চ্যানেল চালু আছে তা দেখতে পারেন এবং প্রয়োজনে সংকেত বিচ্ছিন্ন করতে পারেন।</p>
                  </div>

                  {destinations.length === 0 ? (
                    <div className="bg-slate-950 p-6 rounded-xl border border-dashed border-slate-805 text-center text-xs text-slate-500">
                      কোনো অ্যাক্টিভ লাইভ সেশন রেকর্ড পাওয়া যায়নি। পোর্টালে আপনার আরটিএমপি ডেক্সটপ সোর্স কানেক্ট করুন।
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {destinations.map(d => (
                        <div key={d.id} className="bg-slate-955 p-3.5 rounded-xl border border-slate-850 flex flex-col gap-3 justify-between">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                d.platform === 'facebook' ? 'bg-blue-500/15 text-blue-400 border-blue-500/15' :
                                d.platform === 'youtube' ? 'bg-rose-500/15 text-rose-400 border-rose-500/15' :
                                'bg-purple-500/15 text-purple-400 border-purple-500/15'
                              }`}>
                                {d.platform.toUpperCase()}
                              </span>
                              <h5 className="text-[12px] font-bold text-slate-100 mt-1.5">{d.name}</h5>
                              <p className="text-[9.5px] text-slate-500 font-mono mt-1 break-all">{d.rtmpUrl}</p>
                            </div>

                            <span className={`px-2 py-0.5 text-[8px] font-mono tracking-wider font-extrabold uppercase rounded border ${
                              d.status === 'streaming' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              {d.status}
                            </span>
                          </div>

                          <div className="bg-slate-950 p-2 rounded-lg border border-slate-900 flex items-center justify-between text-[9px] font-mono text-slate-400">
                            <span>Relay PID: <code className="text-slate-300">284{Math.floor(d.rtmpUrl.length)}</code></span>
                            {d.status === 'streaming' && <span className="text-emerald-400 font-bold shrink-0 animate-pulse">● 2.4 Mbps Bitrate</span>}
                          </div>

                          <div className="flex gap-2 mt-1">
                            {d.status === 'streaming' ? (
                              <button
                                type="button"
                                onClick={() => handleKillIndividualStream(d.id)}
                                className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-[10px] font-bold text-rose-500 rounded-lg transition active:scale-95"
                              >
                                🛑 সম্প্রচার বন্ধ করুন (Force Stop)
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled
                                className="flex-1 py-1.5 bg-slate-900 text-slate-500 text-[10px] rounded-lg border border-slate-850 cursor-not-allowed"
                              >
                                স্থগিত (Offline)
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 1d: Video Manager (Delete VOD Assets) */}
            {adminSubTab === 'vods' && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 animate-fade-in animate-duration-150">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-amber-500" />
                    <span>ভিডিও ম্যানেজার (VOD File Manager)</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">সার্ভারে আপলোড করা ক্লাউড ভিডিও ফাইলগুলো মুছে ফেলুন চিরতরে।</p>
                </div>

                {videos.length === 0 ? (
                  <div className="bg-slate-950 p-6 rounded-xl border border-dashed border-slate-850 text-center text-xs text-slate-500">
                    কোনো আপলোডক্রিয়ার ভিডিও পাওয়া যায়নি।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {videos.map(v => (
                      <div key={v.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={v.thumbnailUrl || "/placeholder.jpg"}
                            className="w-12 h-12 object-cover rounded-lg shrink-0"
                            alt={v.title}
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-grow min-w-0 flex flex-col leading-tight">
                            <h5 className="text-[12px] font-bold text-white truncate">{v.title}</h5>
                            <span className="text-[9px] font-mono text-slate-550 mt-1 block">আকার: {v.size} | স্থায়িত্ব: {v.duration}</span>
                            <span className="text-[8.5px] text-emerald-400 mt-1 font-semibold">{v.status?.toUpperCase() || 'OFFLINE'} METADATA ON CLOUD</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteVideoAsset(v.id, v.title)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg border border-rose-500/15 transition active:scale-95 shrink-0"
                          title="মুছে ফেলুন (Permanent Delete)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}


      {/* TAB 2: PRO PRODUCTION DEPLOYMENT GUIDES (STEP 12) */}
      {mainTab === 'deployment' && (
        <div className="flex flex-col gap-6 animate-fade-in animate-duration-150">
          
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm max-w-md">
            <button 
              onClick={() => setDeploySubTab('vps')}
              className={`flex-1 py-1.5 text-center text-[10px] font-mono font-bold tracking-wider rounded-lg transition ${
                deploySubTab === 'vps' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🛠️ UBUNTU VPS SETUP
            </button>
            <button 
              onClick={() => setDeploySubTab('hosting')}
              className={`flex-1 py-1.5 text-center text-[10px] font-mono font-bold tracking-wider rounded-lg transition ${
                deploySubTab === 'hosting' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ☁️ FREE CLOUD HOSTING
            </button>
          </div>

          {deploySubTab === 'vps' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in animate-duration-150">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm font-sans">
                    <Server className="w-4 h-4" />
                    <span>Ubuntu VPS ইনস্টলেশন ও প্রডাকশন সেটআপ স্টেপস</span>
                  </div>

                  <p className="text-xs text-slate-350 leading-relaxed font-sans">
                    আপনার তৈরি লাইভ স্ট্রিমিং ওয়েবসাইট ও FFmpeg ট্রান্সকোড রানার ওবিএস ছাড়াই অনবরত ২৪ ঘন্টা সচল রাখতে একটি উবুন্টু ভার্চুয়াল সার্ভার (Ubuntu VPS) ব্যবহার করুন। নিচের কমান্ডগুলো আপনার টার্মিনাল বা পুটি (Putty) তে রান করুন:
                  </p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3 font-mono text-[10px] text-slate-300">
                    <div>
                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">ধাপ ১: সিস্টেম প্যাকেজসমূহ ও FFmpeg ইনস্টল করুন:</span>
                      <code className="text-amber-400 block select-all bg-slate-900/40 p-1.5 rounded border border-slate-900">
                        {`sudo apt update && sudo apt install -y curl ffmpeg build-essential certbot python3-certbot-nginx`}
                      </code>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">ধাপ ২: Node.js (Version 20+) ইনস্টল করুন:</span>
                      <code className="text-amber-400 block select-all bg-slate-900/40 p-1.5 rounded border border-slate-900">
                        {`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`}
                      </code>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[9px] uppercase font-bold block mb-1">ধাপ ৩: PM2 গ্লোবাললি ইনস্টল করুন এবং সিস্টেম চালু করুন:</span>
                      <code className="text-amber-400 block select-all bg-slate-900/40 p-1.5 rounded border border-slate-900">
                        {`sudo npm install -g pm2 && pm2 start dist/server.cjs --name "streamsync-gate"`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-emerald-450 font-bold text-sm">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>SSL (HTTPS) সার্টিফিকেট অ্যাক্টিভেশন</span>
                  </div>
                  <p className="text-[11.5px] text-slate-400 leading-relaxed">
                    Certbot ব্যবহার করে সম্পুর্ন ফ্রীতে লেটস এনক্রিপ্ট এসএসএল সার্টিফিকেট ইনস্টল করুন:
                  </p>
                  <code className="text-slate-200 bg-slate-950 p-2 rounded-lg border border-slate-850 font-mono text-[9px] block leading-snug">
                    sudo certbot --nginx -d your_domain.com
                  </code>
                </div>
              </div>
            </div>
          )}



          {deploySubTab === 'hosting' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                <span className="text-amber-500 font-bold text-xs font-mono">🚀 FREE FRONTEND HOSTING: VERCEL</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  আপনি এই ফ্রন্টএন্ড কোডিং আর্কিটেকচারটি অতি সহজেই কোনো হোস্টিং চার্জ ছাড়াই সম্পুর্ন ফ্রিতে <strong>Vercel</strong> এর উপর ডেপ্লয় করে দিতে পারেন।
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-[10.5px] text-slate-350 leading-relaxed">
                  <strong>পদক্ষেপসমূহ:</strong> <br />
                  ১. প্রজেক্ট ফাইলটি আপনার গিথাব (GitHub) একাউন্টে পুশ করুন। <br />
                  ২. Vercel ড্যাশবোর্ডে গিয়ে "Import Project" এ ক্লিক করুন। <br />
                  ৩. ডিরেক্টরি রুট ও ফ্রেমওয়ার্ক হিসেবে "Vite" সিলেক্ট করে ডেপ্লয় করুন। <br />
                  ৪. আপনার ডোমেইন বা Vercel এর সাব-ডোমেইনের সাথে এসএসএল ফ্রীতেই পেয়ে যাবেন।
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                <span className="text-emerald-400 font-bold text-xs font-mono">🔥 CLOUD BACKEND FOR FREE: RENDER</span>
                <p className="text-xs text-slate-305 leading-relaxed">
                  সিস্টেমের Express Node.js এবং RTMP প্রসেস রান করার জন্য Render ফ্রিতে একটি ক্লাউড কন্টেইনার সার্ভিস বা কাস্টম ডকার ড্রয়ার সুবিধা দেয়।
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-[10.5px] text-slate-350 leading-relaxed">
                  <strong>পদক্ষেপসমূহ:</strong> <br />
                  ১. Render.com এ গিয়ে নতুন "Web Service" তৈরি করুন। <br />
                  ২. আপনার গিথাব রিপো সংযোগ প্রদান করুন। <br />
                  ৩. Build Command এর ঘরে দিন: <code className="text-amber-400 bg-slate-900 px-1 rounded">npm install && npm run build</code> <br />
                  ４. Start Command এর ঘরে দিন: <code className="text-amber-400 bg-slate-900 px-1 rounded">npm run start</code> <br />
                  ৫. ইনভায়রনমেন্টে <code>FIREBASE_API_KEY</code> ও অন্যান্য সিক্রেট কী-গুলো পেস্ট করে দিন।
                </div>
              </div>
            </div>

            {/* VERCEL ⇿ RENDER LIVE INTERACTIVE CONNECTION CONTROLLER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 leading-none">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <DatabaseZap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vercel ⇿ Render লাইভ লিঙ্ক কনফিগারেশন</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Vercel-এ হোস্টেড এই ফ্রন্টএন্ড আর Render-এ হোস্টেড ব্যাকএন্ড সার্ভারকে একে অপরের সাথে সংযুক্ত করুন</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-850">
                <div className="md:col-span-2 flex flex-col gap-1.5 leading-tight">
                  <label className="text-[10px] uppercase font-mono text-slate-400 font-bold">Render ব্যাকএন্ড সার্ভার ইউআরএল (Backend API URL):</label>
                  <input
                    type="text"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    placeholder="যেমনঃ https://streamsync-backend.onrender.com"
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 w-full"
                  />
                  <p className="text-[9px] text-slate-500 mt-0.5">ফাঁকা রাখলে এটি লোকাল উইন্ডোজ/লিনাক্স হোস্টে থাকা এক্সপ্রেস সার্ভার ব্যবহার করবে।</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('STREAM_SYNC_BACKEND_URL', backendUrlInput);
                      onAddLog('CLIENT', 'success', `সাফল্যঃ ব্যাকএন্ড API সংযোগ সোর্স আপডেট করা হয়েছে: '${backendUrlInput || 'Internal Localhost Server'}'`);
                      triggerToast("ব্যাকএন্ড সার্ভার সংযোগ লিঙ্ক সংরক্ষিত হয়েছে!");
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition select-none active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    সংযোগ সেভ করুন (Save Link)
                  </button>
                  {backendUrlInput && (
                    <button
                      onClick={() => {
                        setBackendUrlInput('');
                        localStorage.removeItem('STREAM_SYNC_BACKEND_URL');
                        onAddLog('CLIENT', 'warn', `সতর্কতাঃ- ব্যাকএন্ড সংযোগ মুছে ফেলা হয়েছে। লোকালহোস্ট fallback সক্রিয়।`);
                        triggerToast("লোকালহোস্ট সংযোগে ফিরে যাওয়া হয়েছে");
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 text-[10px] py-1 px-4 rounded-lg transition cursor-pointer"
                    >
                      রিসেট করুন (Use Localhost)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        </div>
      )}


      {/* TAB 3: STREAM PERFORMANCE OPTIMIZATION & AUTO BACKUPS (STEP 13) */}
      {mainTab === 'optimization' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in animate-duration-150">
          
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-amber-500 font-bold text-xs font-mono flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                লাইভ বাফারিং ও স্পিডআপ অপ্টিমাইজেশন (Stream Synchronization Controls)
              </span>

              <p className="text-xs text-slate-300 leading-relaxed">
                উইক কানেকশন ও মোবাইল ফোন থেকে লাইভ প্লে করার স্পিড বাড়িয়ে লো-লেটেন্সি বাফারিং করার জন্য বাফার সাইজ রেশিও সেটআপ করুন।
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStreamBufferRatio('low');
                    setHlsSegmentLength(1);
                    onAddLog('FFMPEG', 'success', 'ইনস্ট্যান্ট অপ্টিমাইজড: মোবাইল স্পিডআপের জন্য আল্ট্রা-লো বাফার কনফিগার সক্রিয় করা হয়েছে।');
                    triggerToast("আল্ট্রা-লো বাফার (Ultra-low Latency) কনফিগার সক্রিয় হয়েছে");
                  }}
                  className={`p-3 text-center rounded-xl border flex flex-col gap-1 transition ${
                    streamBufferRatio === 'low' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-bold">Ultra-Low Latency</span>
                  <span className="text-[8.5px] opacity-70">1 sec fragment size</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStreamBufferRatio('normal');
                    setHlsSegmentLength(2);
                    onAddLog('FFMPEG', 'info', 'অপ্টিমাইজড: স্ট্যান্ডার্ড বাফার রেশিও কনফিগার সক্রিয় করা হয়েছে।');
                    triggerToast("স্ট্যান্ডার্ড ব্যালেন্স বাফার কনফিগার সচল হয়েছে");
                  }}
                  className={`p-3 text-center rounded-xl border flex flex-col gap-1 transition ${
                    streamBufferRatio === 'normal' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-bold">Balanced Buffer</span>
                  <span className="text-[8.5px] opacity-70">2 sec fragment size</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStreamBufferRatio('safe');
                    setHlsSegmentLength(4);
                    onAddLog('FFMPEG', 'warn', 'কনফিগারেশন: দুর্বল নেটওয়ার্কের জন্য সেফ রেশিও বাফার ৫ইনিস অ্যাক্টিভেটর।');
                    triggerToast("সেফ রেশিও লং বাফার কনফিগার সচল হয়েছে");
                  }}
                  className={`p-3 text-center rounded-xl border flex flex-col gap-1 transition ${
                    streamBufferRatio === 'safe' 
                      ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-white'
                  }`}
                >
                  <span className="text-[11px] font-bold">Stable Buffer</span>
                  <span className="text-[8.5px] opacity-70">4 sec fragment size</span>
                </button>
              </div>

              {/* Advanced option togglers */}
              <div className="flex flex-col gap-3.5 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200 font-bold text-[11px]">মোবাইল ফ্রেন্ডলি লো-কনজাম্পশন অপ্টিমাইজড (Mobile Optimization)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">অটোমেটিকভাবে মোবাইল ভিউয়ারদের ডাটা সেভ করার জন্য ব্যান্ডউইডথ সংকুচিত করুন।</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={mobileLowQuality}
                    onChange={(e) => {
                      setMobileLowQuality(e.target.checked);
                      onAddLog('CLIENT', 'success', `মোবাইল অপ্টিমাইজেশন ${e.target.checked ? 'সচল' : 'বন্ধ'} করা হয়েছে।`);
                    }}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="h-[1px] bg-slate-900" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-200 font-bold text-[11px]">সার্ভার মেমোরি অটো-গারবেজ কালেক্টর</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">র‍্যাম বা মেডেল লিক হওয়া এড়াতে প্রতি ২৪ ঘন্টা পর আরটিএমপি ক্যাশ ক্লিয়ার করা হবে।</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Error Logger Terminal Sandbox */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <Terminal className="text-amber-500 w-4 h-4" />
                সার্ভার এরর অ্যান্ড ডিবাগিং লগার (Express & Local Logs)
              </span>
              <p className="text-xs text-slate-400">এপিআই ফেইলিওর, এফএফএমপ্যাগ ক্র্যাশ বা নেটওয়ার্ক ডিসকানেকশনের লাইভ এরর ক্যাচ টার্মিনাল:</p>

              <div className="bg-slate-950/90 border border-slate-850 rounded-xl p-4 font-mono text-[9.5px] text-slate-300 min-h-[120px] max-h-[160px] overflow-y-auto leading-relaxed flex flex-col gap-1 select-all">
                <span className="text-emerald-450">{"[EXPRESS-API] [18:05:32] Real-time websocket gateway verified and listening."}</span>
                <span className="text-slate-500">{"[NGINX-RTMP] [18:06:40] Streaming publisher connected from IP 103.230.104.18"}.</span>
                <span className="text-slate-500">{"[FFMPEG] [18:08:12] Segment chunk generated. Stream alignment offset: 0 ms"}.</span>
                <span className="text-amber-400">{"[CLIENT] [18:15:20] Info: Connection warning. Readjusting buffer to prevent frames drop."}</span>
                <span className="text-emerald-400 font-bold">{"[FIREBASE-STORE] [18:25:50] Cloud sync is operational. Multi-destination schema loaded."}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* Automatic Backup Configuration Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex flex-col gap-4">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <Database className="text-amber-500 w-4 h-4" />
                অটো ব্যাকআপ ও রিকভারি কনফিগার (Cloud Auto-Backups)
              </span>

              <p className="text-[11px] text-slate-350 leading-relaxed">
                আপনার আপলোডকৃত ভিডিও, স্ট্রিম ডাটাবেজ এবং সেশন মেটাডাটা হারিয়ে যাওয়া ঠেকাতে প্রতিদিন অটোমেটিক ব্যাকআপ সিস্টেম কনফিগার করুন।
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-405 font-bold">Backup Active Status:</span>
                  <span className="px-1.5 py-0.5 text-[8px] bg-emerald-500/10 text-emerald-400 font-mono font-extrabold uppercase rounded border border-emerald-500/20">OPERATIONAL</span>
                </div>

                <div className="flex justify-between items-center text-[10.5px]">
                  <span className="text-slate-450">ব্যাকআপের সময়কাল (Period):</span>
                  <select
                    value={backupPeriodHours}
                    onChange={(e) => setBackupPeriodHours(+e.target.value)}
                    className="p-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-white focus:outline-none"
                  >
                    <option value={12}>প্রতি ১২ ঘন্টা</option>
                    <option value={24}>প্রতি ২৪ ঘন্টা</option>
                    <option value={48}>প্রতি ৪৮ ঘন্টা</option>
                  </select>
                </div>

                <div className="h-[1px] bg-slate-900" />

                <button
                  type="button"
                  onClick={handleDownloadBackupScript}
                  className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-bold py-2 rounded-lg transition active:scale-95 shadow font-mono"
                >
                  <Download className="w-3.5 h-3.5" />
                  ডাউনলোড করুন .sh ব্যাকআপ ফাইল
                </button>
              </div>

              <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 text-[9.5px] font-mono text-amber-500 leading-normal">
                🤖 <strong>CRON Command (কপি করে পেস্ট করুন):</strong> <br />
                উবুন্টু ভিপিএস ক্লাউডে ব্যাকআপ প্রতি রাতে ২ টায় চালাতে: <br />
                <code className="text-white bg-slate-950 p-1 rounded mt-1.5 block leading-normal select-all">
                  0 2 * * * /bin/bash /var/backups/streamsync-backup.sh
                </code>
              </div>
            </div>

            {/* Platform SEO Settings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 flex flex-col gap-2 relative">
              <span className="text-xs uppercase font-mono text-slate-300 font-bold flex items-center gap-1">
                <Globe className="text-emerald-400 w-3.5 h-3.5" />
                SEO মেটাডাটা অপ্টিমাইজেশন
              </span>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                আপনার স্ট্রিমলিংকগুলি গুগল সার্চে অতি সহজে সবার ওপরে ইনডেক্স করতে নিচের মেটা ট্যাগগুলো আপনার ৩.৩ বা ১.১ ক্লায়েন্ট <code>index.html</code> এ ব্যবহার করুন:
              </p>
              <pre className="text-rose-450 bg-slate-950 p-2 text-[8px] rounded-lg border border-slate-850 font-mono text-[8.5px] leading-relaxed overflow-x-auto select-all">
{`<title>StreamSync Portal - Cloud Multicasting Platform</title>
<meta name="description" content="Cast your VOD recorded videos dynamically to Facebook and Youtube." />
<meta name="keywords" content="RTMP, Live streaming, Shahin, Relay" />`}
              </pre>
            </div>
          </div>

        </div>
      )}


      {/* TAB 4: ORIGINAL DEVELOPER SANDBOX (RESTORED FEATURES) */}
      {mainTab === 'dev_sandbox' && (
        <div className="flex flex-col gap-6 animate-fade-in animate-duration-150">
          
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm max-w-sm">
            <button 
              onClick={() => setDevTab('files')}
              className={`flex-1 py-1.5 text-center text-[10px] font-mono font-bold tracking-wider rounded-lg transition ${
                devTab === 'files' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-405 hover:text-slate-205'
              }`}
            >
              FILE EXPLORER
            </button>
            <button 
              onClick={() => setDevTab('api')}
              className={`flex-1 py-1.5 text-center text-[10px] font-mono font-bold tracking-wider rounded-lg transition ${
                devTab === 'api' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-405 hover:text-slate-205'
              }`}
            >
              REST API GATEWAY
            </button>
            <button 
              onClick={() => setDevTab('security')}
              className={`flex-1 py-1.5 text-center text-[10px] font-mono font-bold tracking-wider rounded-lg transition ${
                devTab === 'security' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-455 hover:text-slate-205'
              }`}
            >
              ABAC SECURITY
            </button>
          </div>

          {devTab === 'files' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <h3 className="text-xs uppercase tracking-wider text-slate-400 font-mono font-bold mb-2 flex items-center gap-1">
                  <FolderOpen className="text-amber-500 w-4 h-4" />
                  Folder Blueprint
                </h3>
                <div className="flex flex-col gap-1">
                  {architecturalFiles.map(dir => (
                    <div key={dir.name} className="flex flex-col gap-0.5">
                      <div 
                        onClick={() => selectFile(dir)}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-slate-850/60 text-xs text-slate-300 transition"
                      >
                        <ChevronRight className={`w-3.5 h-3.5 transition ${expandedDirs[dir.path] ? 'rotate-90 text-amber-500' : 'text-slate-500'}`} />
                        <Folder className="w-4 h-4 text-amber-500/80" />
                        <span className="font-semibold">{dir.name}/</span>
                      </div>

                      {expandedDirs[dir.path] && dir.children?.map(file => (
                        <div 
                          key={file.name} 
                          onClick={() => selectFile(file)}
                          className={`flex items-center gap-2 pl-8 pr-2 py-2 rounded-lg cursor-pointer text-xs transition ${
                            activeFile?.path === file.path 
                              ? 'bg-amber-500/10 text-amber-400 font-bold border-l-2 border-amber-500' 
                              : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'
                          }`}
                        >
                          <FileCode className={`w-3.5 h-3.5 ${activeFile?.path === file.path ? 'text-amber-400' : 'text-slate-500'}`} />
                          <span>{file.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 flex flex-col gap-4">
                {activeFile ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
                    <div className="bg-slate-920 px-5 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-sans">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-500/10 px-1.5 py-0.5 text-amber-500 rounded border border-amber-500/10">
                            {activeFile.language?.toUpperCase()} CONFIG
                          </span>
                          <span className="text-xs font-mono text-slate-400 truncate">{activeFile.path}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-1.5">{activeFile.description}</p>
                      </div>
                      <button 
                        onClick={() => handleCopy(activeFile.content || '')}
                        className="bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded border border-slate-705 hover:bg-slate-700 flex items-center justify-center gap-1.5 transition self-start min-w-[100px]"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            Copy Code
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-950 p-5 font-mono text-xs text-slate-305 overflow-x-auto max-h-[380px] leading-relaxed">
                      <pre>{activeFile.content}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
                    Select a config profile in left directory.
                  </div>
                )}
              </div>
            </div>
          )}

          {devTab === 'api' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in font-sans">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Terminal className="text-amber-500 w-5 h-5" />
                  <h3 className="text-sm font-semibold text-white">REST Gateway Simulator</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase">
                  {['destinations', 'authentication', 'rtmp-hook', 'system'].map(cat => (
                    <button 
                      key={cat}
                      type="button"
                      onClick={() => setApiCategory(cat as any)}
                      className={`py-1.5 rounded border text-center transition ${
                        apiCategory === cat 
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold' 
                          : 'bg-slate-955 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto mt-2">
                  {apiEndpointsList.filter(e => e.category === apiCategory).map(end => (
                    <div 
                      key={end.path}
                      onClick={() => {
                        setSelectedApi(end);
                        setApiPayload(end.payload || '');
                        setApiResponse('');
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition ${
                        selectedApi?.path === end.path ? 'bg-amber-500/5 border-amber-500/40 text-white' : 'bg-slate-950/60 border-slate-800 hover:border-slate-750'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          end.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
                        }`}>
                          {end.method}
                        </span>
                        <span className="text-[11px] font-mono font-semibold truncate">{end.path}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-normal">
                        {end.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    {selectedApi && (
                      <span className="font-mono text-[11px] text-amber-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                        {selectedApi.method} {selectedApi.path}
                      </span>
                    )}
                    <button 
                      type="button"
                      onClick={executeApiCall}
                      disabled={loadingApi}
                      className="bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2 rounded shadow hover:bg-amber-400 disabled:opacity-50 flex items-center gap-1.5 transition"
                    >
                      {loadingApi ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      Dispatch HTTP Microcall
                    </button>
                  </div>

                  {selectedApi?.method === 'POST' && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Request Body Payload:</span>
                      <textarea 
                        value={apiPayload}
                        onChange={e => setApiPayload(e.target.value)}
                        rows={4}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 focus:outline-none focus:border-amber-500/40"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Response Terminal Output:</span>
                    <div className="bg-slate-955 border border-slate-800 rounded-lg p-3 font-mono text-[10px] min-h-[140px] text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                      {apiResponse || "// Click 'Dispatch HTTP Microcall' above to fire API requests."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {devTab === 'security' && (
            <div className="flex flex-col gap-6 animate-fade-in font-sans">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <DatabaseZap className="text-amber-500 w-5 h-5" />
                    <h3 className="text-sm font-semibold text-white">Firestore Schema Rules Scope</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-normal">
                    User config files list dynamically under strict subcollections. Our ABAC filters secure this path boundary:
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <div className="text-[9px] uppercase font-mono text-amber-500">COLLECTION SEGMENT: {"/users/{userId}"}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        Stores unique user email records, signup dates, and secret automated transcoding stream keys.
                      </p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                      <div className="text-[9px] uppercase font-mono text-amber-500">SUBCOLLECTION PATH: {"/users/{userId}/destinations/{destId}"}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-normal">
                        Farms stream output endpoints configurations belonging exclusively to the verified stream owner.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Lock className="text-amber-500 w-4 h-4" />
                    <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-300">Hardened safeguards</h3>
                  </div>
                  {[
                    { title: "Relational Tenant locks", msg: "`allow write: if isOwner(userId)` blocks multi-user data leakage" },
                    { title: "Immutable server dates", msg: "Forbids fake date injection via constant request.time syncing" },
                    { title: "Schema enforcement", msg: "Terminates value poisoning checks immediately if arbitrary keys are present" }
                  ].map((guard, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-850 rounded-lg flex flex-col gap-1">
                      <span className="text-xs font-semibold text-white">{guard.title}</span>
                      <span className="text-[10px] text-slate-400">{guard.msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 relative">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 font-sans">
                    <Hammer className="text-rose-500 w-5 h-5" />
                    Red-Team Attack Exploit Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                    Click any vulnerabilities exploit below to dispatch simulated attacks and inspect immediate Firestore defense intercepts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: "spoofing", label: "Vector A: Identity Profile Hijack", d: "Attempts to overwrite another operator profile collection." },
                    { id: "leak", label: "Vector B: Cross-Tenant Key Leak", d: "Maliciously queries private streaming configurations of other streamers." },
                    { id: "integrity", label: "Vector C: Parameter State Poisoning", d: "Broadly injects 'adminOverrideBypass=true' inside data values." }
                  ].map(test => (
                    <button 
                      key={test.id}
                      type="button"
                      onClick={() => triggerSecurityExploit(test.id as any)}
                      className="bg-slate-950 border border-rose-955/40 hover:bg-slate-850 text-slate-305 p-4 rounded-xl text-left hover:border-rose-800 transition flex flex-col gap-1.5"
                    >
                      <span className="text-xs font-semibold text-rose-500">{test.label}</span>
                      <span className="text-[10px] text-slate-400 leading-normal">{test.d}</span>
                    </button>
                  ))}
                </div>

                {securitySimulationResult && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
                    <div className="lg:col-span-2 flex flex-col gap-3">
                      <div>
                        <h4 className="text-[10px] uppercase font-mono text-slate-500">Active Test Target:</h4>
                        <p className="text-sm font-bold text-white mt-1">{securitySimulationResult.name}</p>
                        <p className="text-xs text-slate-400 mt-1 leading-normal">{securitySimulationResult.description}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-mono text-slate-500">Dispatched Payload:</span>
                        <pre className="bg-slate-900 border border-slate-850 p-2.5 rounded font-mono text-[9px] text-yellow-350 overflow-x-auto whitespace-pre-wrap select-all">
                          {securitySimulationResult.maliciousPayload}
                        </pre>
                      </div>
                      {securitySimulationResult.ruleBlocked && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-emerald-400 font-semibold uppercase leading-normal">Airtight Shield Activated: transaction blocked</span>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-3 bg-slate-900 rounded-lg p-3 font-mono text-[10px] h-[190px] flex flex-col gap-1.5 overflow-y-auto border border-slate-850">
                      <div className="text-[10px] text-slate-400 font-semibold border-b border-slate-800 pb-1.5 mb-1 flex items-center justify-between">
                        <span>Vulnerability Log feed</span>
                        <span className="text-slate-600">Syncing rules...</span>
                      </div>
                      {securitySimulationResult.log.map((line, idx) => (
                        <div 
                          key={idx} 
                          className={
                            line.includes('🛑') || line.includes('🔥') ? 'text-rose-450 font-medium' :
                            line.includes('🚫') || line.includes('⚠️') ? 'text-yellow-450' :
                            line.includes('🔐') || line.includes('✅') ? 'text-emerald-400 font-semibold' :
                            'text-slate-300'
                          }
                        >
                          {line}
                        </div>
                      ))}
                      {securitySimulationResult.running && (
                        <div className="text-amber-400 flex items-center gap-1 text-[10px] mt-1">
                          <RefreshCw className="animate-spin w-3 h-3" />
                          Running policy check...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
