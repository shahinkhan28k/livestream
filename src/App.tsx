/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Activity, 
  Tv, 
  Server, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  Lock, 
  Wifi, 
  Cpu, 
  Video, 
  Send, 
  VideoOff,
  User,
  LogOut,
  UploadCloud,
  Calendar,
  BarChart3,
  Key,
  ShieldAlert,
  Monitor,
  Eye,
  EyeOff,
  LayoutDashboard,
  Globe,
  Terminal,
  Copy,
  Check,
  Film
} from 'lucide-react';

import { 
  StreamDestination, 
  TranscodeRendition, 
  SystemStats, 
  IngestLog, 
  VideoAsset, 
  ScheduledStream, 
  AppUser 
} from './types';

// Modular Page Components
import { HomeView } from './components/HomeView';
import { LoginView } from './components/LoginView';
import { AnalyticsView } from './components/AnalyticsView';
import { DevSelector } from './components/DevSelector';
import ObsWebSocketControl from './components/ObsWebSocketControl';

// Firebase core configuration & methods
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebaseConfig';

// Helper to resolve Backend API endpoints for seamless decoupled Vercel + Render orchestration
export const getApiUrl = (endpoint: string): string => {
  // Read VITE_BACKEND_URL or localStorage configurator, with default fallback to current domain
  const configuredBackend = (((import.meta as any).env?.VITE_BACKEND_URL) || localStorage.getItem('STREAM_SYNC_BACKEND_URL') || '').trim();
  const cleanBase = configuredBackend.endsWith('/') ? configuredBackend.slice(0, -1) : configuredBackend;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
};

// Helper to resolve physical media resources (uploads) hosted on Decoupled Render backend
export const resolveMediaUrl = (url: string): string => {
  if (!url) return '';
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    const relativePart = url.startsWith('/') ? url : `/${url}`;
    return getApiUrl(relativePart);
  }
  return url;
};

export default function App() {
  // Navigation State
  const [activePage, setActivePage] = useState<'home' | 'login' | 'signup' | 'dashboard' | 'upload' | 'stream-control' | 'analytics' | 'admin'>('home');
  const [protectedRedirectMessage, setProtectedRedirectMessage] = useState<string | null>(null);

  // User States
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Streaming & Hardware simulation
  const [destinations, setDestinations] = useState<StreamDestination[]>([]);
  const [renditions, setRenditions] = useState<TranscodeRendition[]>([
    { id: '1080p', name: 'Full HD', resolution: '1920x1080', videoBitrate: '4500k', audioBitrate: '128k', fps: 60, enabled: true },
    { id: '720p', name: 'HD Mid', resolution: '1280x720', videoBitrate: '2500k', audioBitrate: '128k', fps: 30, enabled: true },
    { id: '480p', name: 'Mobile Low', resolution: '854x480', videoBitrate: '1000k', audioBitrate: '96k', fps: 30, enabled: false },
  ]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [revealStreamKey, setRevealStreamKey] = useState(false);
  const [copiedKeyText, setCopiedKeyText] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string>('');

  // Hardware stats telemetry
  const [stats, setStats] = useState<SystemStats>({
    cpuUsage: 0,
    memoryUsage: 0,
    networkIngestBc: 0,
    networkEgressBc: 0,
    frameDrops: 0,
    ffmpegProcesses: 0
  });

  const [statsHistory, setStatsHistory] = useState<{ cpu: number[]; ingest: number[]; egress: number[] }>({
    cpu: Array(25).fill(0),
    ingest: Array(25).fill(0),
    egress: Array(25).fill(0)
  });

  // Video Upload Sandbox states
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [videoLikes, setVideoLikes] = useState<Record<string, number>>({});
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoDescriptionInput, setVideoDescriptionInput] = useState('');
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState('');
  const [videoSizeInput, setVideoSizeInput] = useState('48.5 MB');
  const [videoDurationInput, setVideoDurationInput] = useState('05:10');
  const [selectedThumbnailPreset, setSelectedThumbnailPreset] = useState('cyberpunk');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Added Real/Local video file and blob state
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string>('');

  // Schedules states
  const [schedules, setSchedules] = useState<ScheduledStream[]>([]);
  const [scheduleVideoId, setScheduleVideoId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Live Streaming Wizard states
  const [wizardActive, setWizardActive] = useState(true);
  const [wizardStep, setWizardStep] = useState<'setup' | 'details' | 'processing' | 'streaming'>('setup');
  const [wizardPlatform, setWizardPlatform] = useState<'youtube' | 'facebook' | 'instagram' | 'custom'>('facebook');
  const [wizardRtmpUrl, setWizardRtmpUrl] = useState('rtmps://live-api-s.facebook.com:443/rtmp/');
  const [wizardStreamKey, setWizardStreamKey] = useState('');
  const [wizardTitle, setWizardTitle] = useState('');
  const [wizardDescription, setWizardDescription] = useState('');
  const [wizardCustomThumb, setWizardCustomThumb] = useState('');
  const [wizardPercentage, setWizardPercentage] = useState(0);
  const [wizardSelectedVideoId, setWizardSelectedVideoId] = useState('');
  const [wizardLoopMode, setWizardLoopMode] = useState<'once' | 'infinite' | 'custom'>('infinite');
  const [wizardLoopCount, setWizardLoopCount] = useState<number>(3);

  // Facebook/Social live reaction metrics
  const [fbLikeCount, setFbLikeCount] = useState(0);
  const [fbHeartCount, setFbHeartCount] = useState(0);
  const [fbShareCount, setFbShareCount] = useState(0);
  const [hoverReactions, setHoverReactions] = useState<{ id: string; type: 'like' | 'heart' | 'fire' | 'surprise'; style: React.CSSProperties }[]>([]);

  // Wizard action: platform selector helper
  const handleWizardPlatformChange = (plt: 'youtube' | 'facebook' | 'instagram' | 'custom') => {
    setWizardPlatform(plt);
    if (plt === 'youtube') {
      setWizardRtmpUrl('rtmp://a.rtmp.youtube.com/live2');
    } else if (plt === 'facebook') {
      setWizardRtmpUrl('rtmps://live-api-s.facebook.com:443/rtmp/');
    } else if (plt === 'instagram') {
      setWizardRtmpUrl('rtmps://live-upload.instagram.com:443/rtmp/');
    } else {
      setWizardRtmpUrl('');
    }
  };

  // Flying reactions helper
  const addFloatingReaction = (type: 'like' | 'heart' | 'fire' | 'surprise') => {
    const id = `react_${Math.random()}`;
    const leftOffset = Math.floor(Math.random() * 80) + 10;
    const duration = 2.0 + Math.random() * 1.5;
    const size = 22 + Math.random() * 14;

    const style: React.CSSProperties = {
      position: 'absolute',
      bottom: '10px',
      left: `${leftOffset}%`,
      fontSize: `${size}px`,
      animation: `floatUpAndFade ${duration}s forwards ease-in-out`,
      pointerEvents: 'none',
      zIndex: 50,
    };

    setHoverReactions(prev => [...prev, { id, type, style }]);

    if (type === 'like') {
      setFbLikeCount(c => c + 1);
    } else if (type === 'heart') {
      setFbHeartCount(c => c + 1);
    } else if (type === 'fire') {
      setFbShareCount(c => c + 1);
    }

    setTimeout(() => {
      setHoverReactions(prev => prev.filter(r => r.id !== id));
    }, duration * 1000 + 500);
  };

  // Stream Wizard file processor
  const handleStartWizardProcessing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardTitle.trim()) return;

    setWizardStep('processing');
    setWizardPercentage(0);

    const presetThumbnails = {
      facebook: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=240',
      youtube: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=240',
      instagram: 'https://images.unsplash.com/photo-1618055182384-a83a8bd57fbe?q=80&w=240',
      custom: 'https://images.unsplash.com/photo-1511210817355-32e65c9288f3?q=80&w=240'
    };

    const targetThumb = wizardCustomThumb.trim() || (presetThumbnails as any)[wizardPlatform] || presetThumbnails.custom;

    const interval = setInterval(async () => {
      setWizardPercentage(p => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(async () => {
            const docId = `vid_wiz_${Math.random().toString(36).substr(2, 9)}`;
            const payload: VideoAsset = {
              id: docId,
              title: wizardTitle,
              description: wizardDescription,
              videoUrl: 'https://storage.googleapis.com/h5-upload/wizard_processed_temp.mp4',
              thumbnailUrl: targetThumb,
              size: '42.8 MB',
              duration: '03:45',
              createdAt: new Date().toISOString(),
              status: 'streaming' // Go directly live
            };

            if (currentUser) {
              const path = `users/${currentUser.id}/videos`;
              try {
                // Save to Firebase Account
                await setDoc(doc(db, 'users', currentUser.id, 'videos', docId), payload);
                addLog('FIREBASE-STORE', 'success', `Wizard VOD Metadata successfully processed and saved to path '${path}'.`);
                
                // Add destination endpoint as well!
                const destId = `dst_wiz_${Math.random().toString(36).substr(2, 9)}`;
                const destPayload: StreamDestination = {
                  id: destId,
                  platform: wizardPlatform,
                  name: `Wizard ${wizardPlatform.toUpperCase()} Broadcast`,
                  rtmpUrl: wizardRtmpUrl,
                  streamKey: wizardStreamKey,
                  enabled: true,
                  status: 'streaming'
                };
                await setDoc(doc(db, 'users', currentUser.id, 'destinations', destId), destPayload);
                addLog('FIREBASE-STORE', 'success', `Relay node created in Firestore for Wizard path.`);
              } catch (err) {
                handleFirestoreError(err, OperationType.CREATE, path);
              }
            } else {
              setVideos(prev => [...prev, payload]);
              addLog('CLIENT', 'success', 'Wizard VOD saved locally to current offline session.');
            }

            setWizardSelectedVideoId(docId);
            setWizardStep('streaming');
            addLog('FFMPEG', 'success', `Broadcasting starting for Wizard VOD: '${wizardTitle}'. Sending dynamic virtual RTMP packages to ${wizardPlatform.toUpperCase()}...`);
          }, 300);
          return 100;
        }
        return p + 20;
      });
    }, 200);
  };

  // Download custom shell/batch script configured with selected loop behavior
  const downloadFFmpegScript = (os: 'windows' | 'mac-linux') => {
    let loopFlag = '';
    if (wizardLoopMode === 'infinite') {
      loopFlag = '-stream_loop -1 ';
    } else if (wizardLoopMode === 'custom') {
      loopFlag = `-stream_loop ${wizardLoopCount - 1} `;
    }

    const targetUrl = `${wizardRtmpUrl.endsWith('/') ? wizardRtmpUrl : wizardRtmpUrl + '/'}${wizardStreamKey}`;
    
    if (os === 'windows') {
      const batContent = `@echo off
:: StreamSync Portal Auto-Generated FFmpeg Live Broadcast script for Windows
title StreamSync Live Cast: ${wizardTitle || 'Broadcaster'}
echo ====================================================
echo   STREAMING TO : ${wizardPlatform.toUpperCase()}
echo   LIVE TITLE   : ${wizardTitle || 'Untitled Live'}
echo   LOOP MODE    : ${wizardLoopMode === 'once' ? 'Play Once' : wizardLoopMode === 'infinite' ? 'Infinite Loop' : `Loop ${wizardLoopCount} Times`}
echo ====================================================
echo Make sure "video.mp4" is in the same folder as this script, 
echo or edit the input file path in this script.
echo.
echo Press any key to start transmission...
pause > nul

ffmpeg -re ${loopFlag}-i "video.mp4" -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -f flv "${targetUrl}"

echo ====================================================
echo Stream completed or stopped by operator.
pause
`;
      const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streamsync_live_broadcast_${wizardPlatform}.bat`;
      link.click();
      URL.revokeObjectURL(url);
      addLog('CLIENT', 'success', 'Windows .bat স্ক্রিপ্ট সফলভাবে প্রস্তুত ও ডাউনলোড করা হয়েছে।');
    } else {
      const shContent = `#!/bin/bash
# StreamSync Portal Auto-Generated FFmpeg Live Broadcast script for macOS / Linux
# Ensure ffmpeg is installed

echo "===================================================="
echo "  STREAMING TO : ${wizardPlatform.toUpperCase()}"
echo "  LIVE TITLE   : ${wizardTitle || 'Untitled Live'}"
echo "  LOOP MODE    : ${wizardLoopMode === 'once' ? 'Play Once' : wizardLoopMode === 'infinite' ? 'Infinite Loop' : "Loop ${wizardLoopCount} Times"}"
echo "===================================================="
echo ""

# Check if video.mp4 exists
if [ ! -f "video.mp4" ]; then
    echo "WARNING: 'video.mp4' file not found in current folder!"
    echo "Please copy your video to this folder as 'video.mp4' or modify the input file path."
fi

read -p "Press Enter to start streaming..."

ffmpeg -re ${loopFlag}-i "video.mp4" -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -f flv "${targetUrl}"

echo "===================================================="
echo "Stream completed or stopped by operator."
`;
      const blob = new Blob([shContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streamsync_live_broadcast_${wizardPlatform}.sh`;
      link.click();
      URL.revokeObjectURL(url);
      addLog('CLIENT', 'success', 'macOS/Linux .sh স্ক্রিপ্ট সফলভাবে প্রস্তুত ও ডাউনলোড করা হয়েছে।');
    }
  };

  // Logs event sink
  const [logs, setLogs] = useState<IngestLog[]>([
    { timestamp: new Date().toLocaleTimeString(), level: 'info', module: 'CLIENT', message: 'StreamSync Multi-Platform Portal loaded successfully.' },
    { timestamp: new Date().toLocaleTimeString(), level: 'success', module: 'EXPRESS-API', message: 'Connected to in-memory video transcode database stream.' },
    { timestamp: new Date().toLocaleTimeString(), level: 'info', module: 'NGINX-RTMP', message: 'RTMP Ingress interface listening on Port 1935.' }
  ]);

  // WebRTC raw video parameters
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera Beauty, Filters, and FacingMode states
  const [cameraFilterPreset, setCameraFilterPreset] = useState<string>('glow');
  const [cameraBrightness, setCameraBrightness] = useState<number>(125); // beauty boost as default
  const [cameraContrast, setCameraContrast] = useState<number>(105);
  const [cameraSaturation, setCameraSaturation] = useState<number>(110);
  const [cameraSmoothness, setCameraSmoothness] = useState<number>(0.2);
  const [cameraRingLight, setCameraRingLight] = useState<boolean>(true);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  // Stream Form Inputs
  const [newDestPlatform, setNewDestPlatform] = useState<'youtube' | 'facebook' | 'twitch' | 'custom'>('youtube');
  const [newDestName, setNewDestName] = useState('');
  const [newDestUrl, setNewDestUrl] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [newDestKey, setNewDestKey] = useState('');

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
        let streamKey = `live_${Math.floor(100000 + Math.random() * 900000)}`;

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            displayName = data.name || displayName;
            streamKey = data.streamKey || streamKey;
          } else {
            // Write profile document for Google/popup signups
            const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: displayName,
              streamKey: streamKey,
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (writeErr) {
              console.warn("Failed to write offline user profile doc (can be normal in offline mode):", writeErr);
            }
          }
        } catch (error) {
          console.warn("Firestore user document fetch failed (client is likely offline). Restoring session from cache...", error);
          
          // Attempt to retrieve cached user configuration to preserve custom layouts & streamKeys
          const cached = localStorage.getItem('currentUser');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.id === firebaseUser.uid) {
                if (parsed.name) displayName = parsed.name;
                if (parsed.streamKey) streamKey = parsed.streamKey;
              }
            } catch (parseErr) {
              console.error("Cache decode error:", parseErr);
            }
          }
        }

        const matchedUser: AppUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: displayName,
          streamKey: streamKey
        };

        setCurrentUser(matchedUser);
        localStorage.setItem('currentUser', JSON.stringify(matchedUser));

        // Sync authenticated user credentials with the backend server dynamically
        fetch(getApiUrl('/api/auth/sync'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: matchedUser.id,
            email: matchedUser.email,
            streamKey: matchedUser.streamKey
          })
        }).catch(err => console.warn('Could not sync user credentials to Express server:', err));
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
      }
    });

    return () => unsubscribe();
  }, []);

  // 1b. Real-time subcollection listeners dependent on currentUser
  useEffect(() => {
    if (!currentUser) {
      // Offline fallback values
      setDestinations([
        { id: 'dst_1', platform: 'youtube', name: 'YouTube Primary Ingest', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', streamKey: 'yt-xxxx-yyyy-zzzz', enabled: true, status: 'offline' },
        { id: 'dst_2', platform: 'facebook', name: 'Facebook Live Relay', rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/', streamKey: 'fb-xxxx-yyyy-zzzz', enabled: false, status: 'offline' }
      ]);
      setVideos([
        { id: 'vid_1', title: 'Cyberpunk esports compilation 2026', videoUrl: 'https://storage.googleapis.com/stream-sync-assets/cyperpunk_esports.mp4', thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200', size: '142.4 MB', duration: '04:15', createdAt: new Date().toISOString(), status: 'ready' }
      ]);
      setSchedules([]);
      return;
    }

    const userId = currentUser.id;

    // Listen to destinations
    const listDestsUnsub = onSnapshot(collection(db, 'users', userId, 'destinations'), (snapshot) => {
      const list: StreamDestination[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as StreamDestination);
      });
      setDestinations(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/destinations`);
    });

    // Listen to videos
    const listVideosUnsub = onSnapshot(collection(db, 'users', userId, 'videos'), (snapshot) => {
      const list: VideoAsset[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as VideoAsset);
      });
      setVideos(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/videos`);
    });

    // Listen to schedules
    const listSchedulesUnsub = onSnapshot(collection(db, 'users', userId, 'schedules'), (snapshot) => {
      const list: ScheduledStream[] = [];
      snapshot.forEach((snapDoc) => {
        list.push({ id: snapDoc.id, ...snapDoc.data() } as ScheduledStream);
      });
      setSchedules(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/schedules`);
    });

    return () => {
      listDestsUnsub();
      listVideosUnsub();
      listSchedulesUnsub();
    };
  }, [currentUser]);

  // 2. Telemetry Loop Connection
  useEffect(() => {
    const fetchTelem = async () => {
      let nextStats: SystemStats;
      try {
        const res = await fetch(getApiUrl('/api/system/stats'));
        if (res.ok) {
          nextStats = await res.json();
          // Reset statistics weights if nothing is streaming
          if (!isIngesting && !videos.some(v => v.status === 'streaming')) {
            nextStats.ffmpegProcesses = 0;
            nextStats.networkIngestBc = 0;
            nextStats.networkEgressBc = 0;
          }
        } else {
          throw new Error();
        }
      } catch {
        // Fallback simulated metrics
        const streamingVod = videos.some(v => v.status === 'streaming');
        const activeRelays = destinations.filter(d => d.enabled).length;
        const active = isIngesting || streamingVod;
        
        const randCpu = active ? (45 + Math.random() * 10 + activeRelays * 5) : (4 + Math.random() * 2);
        const randMem = active ? (58 + Math.random() * 1.5) : (26 + Math.random() * 0.5);
        const randIngest = active ? (3800 + Math.floor(Math.random() * 400)) : 0;
        const randEgress = active ? (randIngest * activeRelays) : 0;

        nextStats = {
          cpuUsage: Math.round(randCpu),
          memoryUsage: parseFloat(randMem.toFixed(1)),
          networkIngestBc: randIngest,
          networkEgressBc: randEgress,
          frameDrops: active && Math.random() > 0.96 ? 1 : 0,
          ffmpegProcesses: active ? 1 + activeRelays : 0
        };
      }

      setStats(nextStats);

      setStatsHistory(prev => ({
        cpu: [...prev.cpu.slice(1), nextStats.cpuUsage],
        ingest: [...prev.ingest.slice(1), nextStats.networkIngestBc],
        egress: [...prev.egress.slice(1), nextStats.networkEgressBc],
      }));
    };

    const interval = setInterval(fetchTelem, 1200);
    return () => clearInterval(interval);
  }, [isIngesting, destinations, videos]);

  // 3. Ingestion Timer Counter
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isIngesting || videos.some(v => v.status === 'streaming')) {
      timer = setInterval(() => {
        setStreamDuration(d => d + 1);
        
        // Push floating logs
        if (Math.random() > 0.8) {
          const streamMsgs = [
            "FFmpeg relay segment synchronized: RTS = 0.40ms.",
            "Outgoing frames pushed sequentially using AAC compression.",
            "Channel Delivery nominal. Latency offset = 120ms.",
            "RTMP socket ping verified. Delivery pipeline secure."
          ];
          const text = streamMsgs[Math.floor(Math.random() * streamMsgs.length)];
          addLog('FFMPEG', 'info', text);
        }
      }, 1000);
    } else {
      setStreamDuration(0);
    }
    return () => clearInterval(timer);
  }, [isIngesting, videos]);

  // 4. Protection Guard Interceptor
  useEffect(() => {
    const isProtected = ['dashboard', 'upload', 'stream-control', 'analytics', 'admin'].includes(activePage);
    if (isProtected && !currentUser) {
      setProtectedRedirectMessage("Authentication is required to access streamer dashboard sections.");
      setActivePage('login');
    }
  }, [activePage, currentUser]);

  const addLog = (module: IngestLog['module'], level: IngestLog['level'], message: string) => {
    setLogs(prev => [
      { timestamp: new Date().toLocaleTimeString(), level, module, message },
      ...prev.slice(0, 75)
    ]);
  };

  // 5. Auth Success hook
  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setProtectedRedirectMessage(null);
    addLog('CLIENT', 'success', `Session restored: stream keys synced for profile '${user.email}'`);
  };

  const handleLogout = () => {
    signOut(auth).catch(err => console.error("Error signing out:", err));
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    if (cameraActive) {
      stopCameraDevice();
    }
    setIsIngesting(false);
    setActivePage('home');
    addLog('CLIENT', 'warn', 'StreamSync user session closed gracefully.');
  };

  // 6. Camera handshakes
  const toggleCameraDevice = async () => {
    if (cameraActive) {
      stopCameraDevice();
    } else {
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 360 }, 
            facingMode: cameraFacingMode,
            frameRate: 30 
          },
          audio: false
        });
        setStreamRef(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        addLog('CLIENT', 'success', `WebRTC camera activated: Using ${cameraFacingMode === 'user' ? 'Front/Face' : 'Back/Environment'} lens with interactive beauty filters.`);
      } catch (err: any) {
        setCameraError("Camera capture denied, not found or node busy.");
        addLog('CLIENT', 'error', `WebRTC Handshake: ${err.message || err}`);
      }
    }
  };

  const stopCameraDevice = () => {
    if (streamRef) {
      streamRef.getTracks().forEach(t => t.stop());
    }
    setStreamRef(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    addLog('CLIENT', 'info', 'Local device media socket closed.');
  };

  // Camera beauty filter helpers
  const applyPresetFilters = (preset: string) => {
    setCameraFilterPreset(preset);
    if (preset === 'glow') {
      setCameraBrightness(125);
      setCameraContrast(105);
      setCameraSaturation(115);
      setCameraSmoothness(0.2);
      setCameraRingLight(true);
    } else if (preset === 'studio') {
      setCameraBrightness(135);
      setCameraContrast(100);
      setCameraSaturation(105);
      setCameraSmoothness(0.1);
      setCameraRingLight(true);
    } else if (preset === 'golden') {
      setCameraBrightness(115);
      setCameraContrast(110);
      setCameraSaturation(125);
      setCameraSmoothness(0.3);
      setCameraRingLight(true);
    } else if (preset === 'ice') {
      setCameraBrightness(118);
      setCameraContrast(102);
      setCameraSaturation(90);
      setCameraSmoothness(0.1);
      setCameraRingLight(false);
    } else if (preset === 'cyberpunk') {
      setCameraBrightness(110);
      setCameraContrast(120);
      setCameraSaturation(140);
      setCameraSmoothness(0.5);
      setCameraRingLight(false);
    } else {
      setCameraBrightness(100);
      setCameraContrast(100);
      setCameraSaturation(100);
      setCameraSmoothness(0);
      setCameraRingLight(false);
    }
  };

  const getVideoFilterStyle = () => {
    let filterStr = `brightness(${cameraBrightness}%) contrast(${cameraContrast}%) saturate(${cameraSaturation}%) `;
    if (cameraSmoothness > 0) {
      filterStr += `blur(${cameraSmoothness}px) `;
    }
    if (cameraFilterPreset === 'golden') {
      filterStr += 'sepia(18%) hue-rotate(-5deg)';
    } else if (cameraFilterPreset === 'ice') {
      filterStr += 'hue-rotate(8deg)';
    } else if (cameraFilterPreset === 'cyberpunk') {
      filterStr += 'hue-rotate(-20deg)';
    }
    return filterStr;
  };

  const switchCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    addLog('CLIENT', 'info', `Requested camera lens swap: ${nextMode === 'user' ? 'Front FaceTime' : 'Back Camera'}`);
    
    if (cameraActive) {
      if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
      }
      setTimeout(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 }, 
              height: { ideal: 360 }, 
              facingMode: nextMode,
              frameRate: 30 
            },
            audio: false
          });
          setStreamRef(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          addLog('CLIENT', 'success', `Dynamic camera toggle to: ${nextMode === 'user' ? 'Front' : 'Back'} lens succeeded.`);
        } catch (err: any) {
          setCameraError("Could not switch camera source.");
          addLog('CLIENT', 'error', `WebRTC camera switch runtime error: ${err.message || err}`);
        }
      }, 150);
    }
  };

  // 7. Stream triggers
  const handleStartIngestion = () => {
    setIsIngesting(true);
    setDestinations(prev => prev.map(d => d.enabled ? { ...d, status: 'streaming' } : d));
    
    addLog('NGINX-RTMP', 'success', 'Ingress Handshake succeeded. Ingestion stream open on live pool.');
    addLog('EXPRESS-API', 'success', 'Automated FFmpeg encoder spawned with ID 2942.');
    
    destinations.forEach(d => {
      if (d.enabled) {
        addLog('FFMPEG', 'success', `Active relay pipelined to: ${d.platform.toUpperCase()} (${d.name})`);
      }
    });
  };

  const handleStopIngestion = () => {
    setIsIngesting(false);
    setDestinations(prev => prev.map(d => ({ ...d, status: 'offline' })));
    addLog('FFMPEG', 'warn', 'SIGTERM interrupt received. Closing FFmpeg encoders.');
    addLog('NGINX-RTMP', 'info', 'Ingress socket disconnected.');
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert("দয়া করে একটি সঠিক ভিডিও ফাইল নির্বাচন করুন (Please select a valid video file).");
      return;
    }

    setUploadedVideoFile(file);
    const blobUrl = URL.createObjectURL(file);
    setVideoBlobUrl(blobUrl);

    // Auto-calculate video file name (without extension) as Title
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setVideoTitleInput(nameWithoutExt);

    // Auto-calculate and format video file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setVideoSizeInput(`${sizeInMB} MB`);

    // Auto-calculate duration using inline HTML5 Video dynamic element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      const totalSeconds = Math.round(tempVideo.duration);
      if (isNaN(totalSeconds) || totalSeconds <= 0) {
        setVideoDurationInput("05:10");
        return;
      }
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setVideoDurationInput(formatted);
      addLog('CLIENT', 'success', `স্থানীয় ভিডিও ফাইল বিশ্লেষিত হয়েছে: Duration ${formatted}, Size ${sizeInMB} MB.`);
    };

    addLog('CLIENT', 'info', `ভিডিও ফাইল ড্রপ/নির্বাচন করা হয়েছে: ${file.name} (${sizeInMB} MB)`);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, isWizard: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert("দয়া করে একটি সঠিক ছবি নির্বাচন করুন (Please select a valid image file).");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (isWizard) {
        setWizardCustomThumb(dataUrl);
        addLog('CLIENT', 'success', 'Wizard custom preview thumbnail loaded from local asset gallery.');
      } else {
        setCustomThumbnailUrl(dataUrl);
        addLog('CLIENT', 'success', 'VOD custom preview thumbnail loaded from local asset gallery.');
      }
    };
    reader.readAsDataURL(file);
  };

  // 8. Video upload real file controller
  const handleMockUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadProgress !== null) {
      addLog('CLIENT', 'warn', 'ভিডিও আপলোড ইতিমধ্যে প্রক্রিয়াধীন রয়েছে। ডাবল সেভ প্রতিরোধ করা হলো (Duplicate save prevented).');
      return;
    }
    if (!videoTitleInput) return;
    setUploadProgress(1);
    setUploadError(null);

    const thumbnails = {
      cyberpunk: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200',
      synthwave: 'https://images.unsplash.com/photo-1618055182384-a83a8bd57fbe?q=80&w=200',
      esports: 'https://images.unsplash.com/photo-1511210817355-32e65c9288f3?q=80&w=200'
    };

    const thumbUrl = customThumbnailUrl.trim() || (thumbnails as any)[selectedThumbnailPreset] || thumbnails.cyberpunk;
    let finalVideoUrl = 'https://storage.googleapis.com/stream-sync-assets/cyperpunk_esports.mp4';

    // If an actual local video file was drop/selected, upload it to Express uploads path
    if (uploadedVideoFile) {
      try {
        addLog('CLIENT', 'info', `সার্ভারে বাস্তব ভিডিও আপলোড শুরু হচ্ছে... ফাইল: ${uploadedVideoFile.name} (${videoSizeInput})`);
        
        const formData = new FormData();
        formData.append('video', uploadedVideoFile);

        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise<{ videoUrl: string, size: string, video: any }>((resolve, reject) => {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 98); // save 2% for final server write callback
              setUploadProgress(Math.max(1, pct));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText);
                resolve(res);
              } catch (err) {
                reject(new Error('Invalid JSON upload feedback from server.'));
              }
            } else {
              reject(new Error(`Upload failed on server with status code ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during physical VOD video file upload.'));
          
          const uploadTargetUrl = currentUser 
            ? getApiUrl(`/api/upload?userId=${currentUser.id}`) 
            : getApiUrl('/api/upload');
          xhr.open('POST', uploadTargetUrl);
          xhr.send(formData);
        });

        const uploadResult = await uploadPromise;
        finalVideoUrl = uploadResult.videoUrl;
        setUploadProgress(100);
        addLog('CLIENT', 'success', `ভিডিও ফাইল সফলভাবে সার্ভার ডিস্কে আপলোড ও সংরক্ষিত হয়েছে: ${finalVideoUrl}`);
      } catch (err: any) {
        setUploadProgress(null);
        setUploadError(err.message || 'File upload failed');
        addLog('CLIENT', 'error', `ফাইল আপলোড ব্যর্থ হয়েছে: ${err.message || err}`);
        alert(`সার্ভারে ফাইল আপলোড করতে সমস্যা হয়েছে: ${err.message || err}`);
        return;
      }
    } else {
      // Demo fallback mode (No local file selected, mock loop)
      addLog('CLIENT', 'info', 'কোনো বাস্তব ভিডিও ফাইল সংযুক্ত করা হয়নি, লাইব্রেরি ডেডিকেটেড ডেমো VOD সোর্স যুক্ত করা হচ্ছে...');
      let simulatedPct = 0;
      const progressPromise = new Promise<void>((resolve) => {
        const intv = setInterval(() => {
          simulatedPct += 20;
          setUploadProgress(simulatedPct);
          if (simulatedPct >= 100) {
            clearInterval(intv);
            resolve();
          }
        }, 200);
      });
      await progressPromise;
      finalVideoUrl = videoBlobUrl || 'https://storage.googleapis.com/stream-sync-assets/cyperpunk_esports.mp4';
    }

    const docId = `vid_${Math.random().toString(36).substr(2, 9)}`;
    const newVideoObject = {
      id: docId,
      title: videoTitleInput,
      description: videoDescriptionInput,
      videoUrl: finalVideoUrl,
      thumbnailUrl: thumbUrl,
      size: videoSizeInput || '48.5 MB',
      duration: videoDurationInput || '05:10',
      createdAt: new Date().toISOString(),
      status: 'ready' as const
    };

    if (currentUser) {
      const path = `users/${currentUser.id}/videos`;
      try {
        await setDoc(doc(db, 'users', currentUser.id, 'videos', docId), newVideoObject);
        addLog('FIREBASE-STORE', 'success', `VOD Metadata saved: synced on Cloud Firestore path '${path}'.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setVideos(prev => [...prev, newVideoObject]);
      addLog('CLIENT', 'success', 'VOD upload saved to local in-memory session.');
    }

    // Reset clean states
    setUploadProgress(null);
    setVideoTitleInput('');
    setVideoDescriptionInput('');
    setCustomThumbnailUrl('');
    setUploadedVideoFile(null);
    setVideoBlobUrl('');
  };

  const handleDeleteVideo = async (id: string, name: string) => {
    const targetVideo = videos.find(v => v.id === id);
    if (currentUser) {
      const path = `users/${currentUser.id}/videos/${id}`;
      try {
        // Stop any running streams associated with this video before deleting
        if (targetVideo && targetVideo.status === 'streaming') {
          await handleStopVideoStream(id);
        }

        // Delete from Firestore
        await deleteDoc(doc(db, 'users', currentUser.id, 'videos', id));
        addLog('FIREBASE-STORE', 'warn', `Deleted VOD document from Firestore: ${name}`);

        // Delete physical file if uploaded on server
        if (targetVideo && targetVideo.videoUrl.startsWith('/uploads/')) {
          const res = await fetch(getApiUrl('/api/videos/delete-file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: targetVideo.videoUrl, userId: currentUser.id })
          });
          const resData = await res.json();
          if (resData.success) {
            addLog('CLIENT', 'success', `সার্ভার ডিস্ক থেকে বাস্তব ফাইলটি মুছে ফেলা হয়েছে: ${name}`);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      if (targetVideo && targetVideo.status === 'streaming') {
        await handleStopVideoStream(id);
      }
      setVideos(prev => prev.filter(v => v.id !== id));
      addLog('CLIENT', 'warn', `Deleted VOD local asset: ${name}`);
    }
  };

  // 9. Relay Outlets Forms Setup
  const handlePresetPlatform = (p: 'youtube' | 'facebook' | 'twitch' | 'custom') => {
    setNewDestPlatform(p);
    if (p === 'youtube') {
      setNewDestUrl('rtmp://a.rtmp.youtube.com/live2');
      setNewDestName('My Primary YouTube Channel');
    } else if (p === 'facebook') {
      setNewDestUrl('rtmps://live-api-s.facebook.com:443/rtmp/');
      setNewDestName('My Facebook Gaming');
    } else if (p === 'twitch') {
      setNewDestUrl('rtmp://live.twitch.tv/app');
      setNewDestName('Twitch Secondary Ingestion');
    } else {
      setNewDestUrl('rtmp://');
      setNewDestName('My Custom Relay Stream');
    }
  };

  const handleCreateDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestName || !newDestUrl || !newDestKey) return;

    if (currentUser) {
      const path = `users/${currentUser.id}/destinations`;
      try {
        const docId = `dst_${Math.random().toString(36).substr(2, 9)}`;
        const payload: StreamDestination = {
          id: docId,
          platform: newDestPlatform,
          name: newDestName,
          rtmpUrl: newDestUrl,
          streamKey: newDestKey,
          enabled: true,
          status: 'offline'
        };
        await setDoc(doc(db, 'users', currentUser.id, 'destinations', docId), payload);
        
        addLog('FIREBASE-STORE', 'success', `Saved dynamic RTMP feed for '${newDestName}' inside Cloud Firestore destinations.`);
        setNewDestName('');
        setNewDestKey('');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const docId = `dst_${Math.random().toString(36).substr(2, 9)}`;
      setDestinations(prev => [...prev, {
        id: docId,
        platform: newDestPlatform,
        name: newDestName,
        rtmpUrl: newDestUrl,
        streamKey: newDestKey,
        enabled: true,
        status: 'offline'
      }]);
      addLog('CLIENT', 'success', 'Saved mock destination to local in-memory session.');
      setNewDestName('');
      setNewDestKey('');
    }
  };

  const handleToggleDestination = async (id: string, enabled: boolean) => {
    if (currentUser) {
      const path = `users/${currentUser.id}/destinations/${id}`;
      try {
        await updateDoc(doc(db, 'users', currentUser.id, 'destinations', id), {
          enabled: !enabled
        });
        addLog('FIREBASE-STORE', 'info', `Outbound target ${id} toggled dynamically in Firestore.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setDestinations(prev => prev.map(d => d.id === id ? { ...d, enabled: !enabled } : d));
      addLog('CLIENT', 'info', `Outbound target ${id} toggled locally.`);
    }
  };

  const handleDeleteDestination = async (id: string) => {
    if (currentUser) {
      const path = `users/${currentUser.id}/destinations/${id}`;
      try {
        await deleteDoc(doc(db, 'users', currentUser.id, 'destinations', id));
        addLog('FIREBASE-STORE', 'warn', `Removed destination node from Firestore: ${id}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setDestinations(prev => prev.filter(d => d.id !== id));
      addLog('CLIENT', 'warn', `Removed local destination: ${id}`);
    }
  };

  // VOD Video Stream Control triggers
  const handleStreamVideoNow = async (videoId: string) => {
    const targetVideo = videos.find(v => v.id === videoId);
    if (!targetVideo) {
      addLog('CLIENT', 'error', 'ভিডিও ফাইলটি খুঁজে পাওয়া যায়নি (Video asset not found).');
      return;
    }

    // Capture all active running/relays
    const activeDests = destinations.filter(d => d.enabled);
    if (activeDests.length === 0) {
      addLog('CLIENT', 'warn', 'কোনো সক্রিয় ব্রডকাস্ট প্ল্যাটফর্ম সিলেক্ট করা নেই! প্রথমে রিলে সেটআপ করুন।');
      alert('সরাসরি সম্প্রচার শুরু করার জন্য অনুগ্রহ করে কম পক্ষে একটি প্ল্যাটফর্ম (যেমনঃ YouTube বা Facebook) সক্রিয় বা অন করুন।');
      return;
    }

    addLog('CLIENT', 'info', `সার্ভার-সাই端 সম্প্রচার প্রসেস শুরু হচ্ছে...`);

    if (currentUser) {
      const path = `users/${currentUser.id}/videos/${videoId}`;
      try {
        // 1. Update Firestore state
        await updateDoc(doc(db, 'users', currentUser.id, 'videos', videoId), {
          status: 'streaming'
        });

        // Update active destinations status in Firestore so they turn red/LIVE on dashboard
        for (const dest of activeDests) {
          try {
            await updateDoc(doc(db, 'users', currentUser.id, 'destinations', dest.id), {
              status: 'streaming'
            });
          } catch (destErr) {
            console.warn(`Could not update destination status in Firestore: ${dest.id}`, destErr);
          }
        }

        // 2. Optimistic local state update
        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'streaming' } : v));
        setDestinations(prev => prev.map(d => d.enabled ? { ...d, status: 'streaming' } : d));
        addLog('FFMPEG', 'success', 'VOD broadcast updated in cloud. Initializing server engine relays...');

        // 3. Command Express of start-video
        const res = await fetch(getApiUrl('/api/streams/start-video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            videoUrl: targetVideo.videoUrl,
            title: targetVideo.title,
            destinations: activeDests,
            userId: currentUser.id
          })
        });

        const data = await res.json();
        if (data.success) {
          addLog('FFMPEG', 'success', `লাইভ স্ট্রিমিং সম্পন্ন হয়েছে! ব্যাকগ্রাউন্ড FFmpeg কমান্ড সফলভাবে চালু হয়েছে।`);
        } else {
          addLog('FFMPEG', 'error', `FFmpeg ত্রুটি: ${data.error || 'Unknown error'}`);
          alert(`সম্প্রচার শুরু করা যায়নি: ${data.error || 'Server FFmpeg configuration issue.'}`);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      // Offline/Local Demo mode
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, status: 'streaming' } : v));
      addLog('CLIENT', 'success', 'VOD broadcast initiated locally.');

      try {
        const res = await fetch(getApiUrl('/api/streams/start-video'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            videoUrl: targetVideo.videoUrl,
            title: targetVideo.title,
            destinations: activeDests,
            userId: 'guest'
          })
        });
        const data = await res.json();
        if (data.success) {
          addLog('FFMPEG', 'success', `ব্যাকগ্রাউন্ড সম্প্রচার চালু হয়েছে!`);
        } else {
          addLog('FFMPEG', 'error', `ত্রুটি: ${data.error}`);
        }
      } catch (e) {
        console.error("error starting stream", e);
      }
    }
  };

  const handleStopVideoStream = async (videoId?: string) => {
    try {
      addLog('CLIENT', 'info', 'সম্পূর্ণ লাইভ সম্প্রচার বন্ধের অনুরোধ পাঠানো হয়েছে...');
      const res = await fetch(getApiUrl('/api/streams/stop'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, userId: currentUser?.id || 'guest' })
      });
      const data = await res.json();
      if (data.success) {
        addLog('FFMPEG', 'warn', `সার্ভার ব্যাকগ্রাউন্ড FFmpeg ক্লোজ হয়েছে। বন্ধ হওয়া লাইভ ব্রডকাস্ট রিলে সংখ্যাঃ ${data.killedCount || 0}`);
      }
    } catch (err) {
      console.error(err);
    }

    if (currentUser) {
      try {
        const targetVideos = videoId ? videos.filter(v => v.id === videoId) : videos.filter(v => v.status === 'streaming');
        for (const v of targetVideos) {
          const path = `users/${currentUser.id}/videos/${v.id}`;
          await updateDoc(doc(db, 'users', currentUser.id, 'videos', v.id), {
            status: 'ready'
          });
        }

        // Reset and update all destination statuses to offline on stream stop
        for (const dest of destinations) {
          if (dest.status === 'streaming') {
            try {
              await updateDoc(doc(db, 'users', currentUser.id, 'destinations', dest.id), {
                status: 'offline'
              });
            } catch (destErr) {
              console.warn(`Could not reset destination status in Firestore: ${dest.id}`, destErr);
            }
          }
        }

        setVideos(prev => prev.map(v => (videoId ? (v.id === videoId ? { ...v, status: 'ready' } : v) : { ...v, status: 'ready' })));
        setDestinations(prev => prev.map(d => ({ ...d, status: 'offline' })));
        addLog('FFMPEG', 'warn', 'ভিডিও সম্প্রচার ফায়ারস্টোর ক্লাউডে স্থগিত করা হয়েছে।');
      } catch (err) {
        console.error("error stopping stream", err);
      }
    } else {
      setVideos(prev => prev.map(v => (videoId ? (v.id === videoId ? { ...v, status: 'ready' } : v) : { ...v, status: 'ready' })));
      addLog('CLIENT', 'warn', 'VOD playback interrupted locally.');
    }
  };

  // Schedule multicast
  const handleScheduleSubmissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleVideoId || !scheduleTime) return;

    const video = videos.find(v => v.id === scheduleVideoId);
    if (!video) return;

    if (currentUser) {
      const path = `users/${currentUser.id}/schedules`;
      try {
        const docId = `sch_${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'users', currentUser.id, 'schedules', docId), {
          id: docId,
          videoId: scheduleVideoId,
          videoTitle: video.title,
          scheduledTime: scheduleTime,
          targetDestinations: destinations.filter(d => d.enabled).map(d => d.id),
          status: 'scheduled'
        });
        addLog('FIREBASE-STORE', 'success', 'Multicasting schedule saved under Firestore path.');
        setScheduleVideoId('');
        setScheduleTime('');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      const docId = `sch_${Math.random().toString(36).substr(2, 9)}`;
      setSchedules(prev => [...prev, {
        id: docId,
        videoId: scheduleVideoId,
        videoTitle: video.title,
        scheduledTime: scheduleTime,
        targetDestinations: destinations.filter(d => d.enabled).map(d => d.id),
        status: 'scheduled'
      }]);
      addLog('CLIENT', 'success', 'Multicasting schedule saved locally.');
      setScheduleVideoId('');
      setScheduleTime('');
    }
  };

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyText(true);
    setTimeout(() => setCopiedKeyText(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-1000 bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-400">
      
      {/* 1. Global Navigation Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActivePage('home')}>
            <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/30">
              <Radio className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                StreamSync Portal
                <span className="text-[9px] uppercase font-mono tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                  v3.2
                </span>
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400 font-medium">
            <button onClick={() => setActivePage('home')} className={`hover:text-white transition ${activePage === 'home' ? 'text-white' : ''}`}>Platform Features</button>
            <button onClick={() => currentUser ? setActivePage('dashboard') : setActivePage('login')} className="hover:text-white transition">Ingestion Relay Node</button>
            <button onClick={() => currentUser ? setActivePage('upload') : setActivePage('login')} className="hover:text-white transition">VOD Assets Repository</button>
            <button onClick={() => currentUser ? setActivePage('analytics') : setActivePage('login')} className="hover:text-white transition">Analytics Radar</button>
          </nav>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden sm:inline-block font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                  Logged in: <span className="text-amber-400 font-semibold">{currentUser.email}</span>
                </span>
                
                <button
                  id="btn-nav-portal"
                  onClick={() => setActivePage('dashboard')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-md transition shadow"
                >
                  Stream Dashboard
                </button>

                <button
                  id="btn-nav-logout"
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                  title="Logout session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-nav-login"
                  onClick={() => setActivePage('login')}
                  className="text-slate-400 hover:text-white text-xs px-3 py-1.5 transition"
                >
                  Sign In
                </button>
                <button
                  id="btn-nav-signup"
                  onClick={() => setActivePage('signup')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-md transition"
                >
                  Register
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Primary Canvas Container: Layout splits depending on public or private page contexts */}
      <div className={`flex-1 flex max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 relative ${currentUser && ['dashboard', 'upload', 'stream-control', 'analytics', 'admin'].includes(activePage) ? 'pb-24 lg:pb-6' : ''}`}>
        
        {/* Advisories for protected page redirection */}
        {protectedRedirectMessage && (
          <div className="absolute top-4 left-6 right-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg text-xs tracking-wide flex items-center gap-2 z-40">
            <ShieldAlert className="w-4 h-4" />
            <span>{protectedRedirectMessage}</span>
          </div>
        )}

        {/* Dynamic Sidebar Dashboard Nav when logged in and inside portal views */}
        {currentUser && ['dashboard', 'upload', 'stream-control', 'analytics', 'admin'].includes(activePage) && (
          <aside className="w-64 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-6 shrink-0 hidden lg:flex self-start">
            
            <div className="flex flex-col gap-1.5 pb-4 border-b border-slate-800">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500">OPERATOR BOARD</span>
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <User className="w-4 h-4 text-amber-500" />
                <span className="truncate">{currentUser.email}</span>
              </div>
            </div>

            <nav className="flex flex-col gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard Control', icon: LayoutDashboard },
                { id: 'upload', label: 'Upload VOD Assets', icon: UploadCloud },
                { id: 'stream-control', label: 'Relay & Schedules', icon: Tv },
                { id: 'analytics', label: 'Analytics Radar', icon: BarChart3 },
                { id: 'admin', label: 'Admin & Dev Panel', icon: Server }
              ].map(link => (
                <button
                  key={link.id}
                  onClick={() => {
                    setProtectedRedirectMessage(null);
                    setActivePage(link.id as any);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition text-left ${
                    activePage === link.id 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-slate-800">
              <button 
                id="btn-sidebar-logout"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-4 h-4" />
                Terminate Session
              </button>
            </div>
          </aside>
        )}

        {/* Route view switchboard area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Mobile Navigator tabs (Active only on small screens for logged users) */}
          {currentUser && ['dashboard', 'upload', 'stream-control', 'analytics', 'admin'].includes(activePage) && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 py-3 px-2 shadow-[0_-10px_25px_rgba(0,0,0,0.5)] flex justify-around items-center lg:hidden">
              {[
                { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
                { id: 'upload', label: 'ভিডিও', icon: UploadCloud },
                { id: 'stream-control', label: 'সম্প্রচার', icon: Tv },
                { id: 'analytics', label: 'রাডার', icon: BarChart3 },
                { id: 'admin', label: 'ডিবাগ', icon: Server }
              ].map(link => {
                const Icon = link.icon;
                const isSelected = activePage === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      setProtectedRedirectMessage(null);
                      setActivePage(link.id as any);
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 px-2.5 py-1 min-h-[44px] transition-all flex-1 ${
                      isSelected 
                        ? 'text-amber-500 scale-105 font-bold' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-all ${
                      isSelected ? 'bg-amber-500/10 scale-110 shadow-lg border border-amber-500/20' : ''
                    }`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-[10px] tracking-tight font-medium">{link.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Page Rendering Router */}
          {activePage === 'home' && (
            <HomeView 
              currentUser={currentUser} 
              onNavigate={setActivePage} 
              onlineTelem={{ cpu: stats.cpuUsage, mem: stats.memoryUsage, activeStreams: stats.ffmpegProcesses }}
            />
          )}

          {(activePage === 'login' || activePage === 'signup') && (
            <LoginView 
              initialMode={activePage === 'signup' ? 'signup' : 'login'} 
              onLoginSuccess={handleLoginSuccess}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'analytics' && (
            <AnalyticsView 
              statsHistory={statsHistory} 
              isIngesting={isIngesting || videos.some(v => v.status === 'streaming')} 
              activeDestinationsCount={destinations.filter(d => d.enabled).length}
            />
          )}

          {activePage === 'admin' && (
            <DevSelector 
              onAddLog={addLog} 
              onRefreshDestinations={() => addLog('CLIENT', 'info', 'Cloud Firestore synchronization is active and real-time. No manual refresh is needed!')}
              videos={videos}
              setVideos={setVideos}
              destinations={destinations}
              setDestinations={setDestinations}
            />
          )}

          {activePage === 'dashboard' && currentUser && (
            <div className="flex flex-col gap-6 animate-fade-in animate-duration-150">
              
              {/* Profile setup, credentials & stream keys */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/5 blur-3xl rounded-full" />
                  
                  <div className="z-10 leading-normal">
                    <span className="text-[10px] tracking-wider font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
                      Ingress Auth Profile
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1.5">Streamer Control Hub</h2>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      Point your streaming encoder (OBS, vMix, etc.) to the local servers ingestion RTMP endpoints below or use VOD scheduled relays:
                    </p>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4.5 border border-slate-850 flex flex-col gap-3.5 z-10 font-mono text-xs">
                    <div>
                      <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">RTMP Server Ingestion URL:</div>
                      <div className="text-white flex items-center gap-2 select-all overflow-x-auto pr-2">
                        <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>rtmp://0.0.0.0:1935/live</span>
                      </div>
                    </div>

                    <div className="h-[1px] bg-slate-900" />

                    <div>
                      <div className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Primary Stream Key (secure):</div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 overflow-x-auto pr-2">
                          <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-white font-semibold">
                            {revealStreamKey ? currentUser.streamKey : "•••••••••••••••••••••••••••••"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setRevealStreamKey(!revealStreamKey)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Reveal Key"
                          >
                            {revealStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleCopyKey(currentUser.streamKey)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="Copy Key"
                          >
                            {copiedKeyText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Machine load status card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-white">Live System Performance</h3>
                  </div>

                  <div className="flex flex-col gap-4.5 mt-2">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-amber-400" /> CPU USAGE</span>
                        <span className="font-mono text-white font-bold">{stats.cpuUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full bg-amber-500 rounded-full transition-all duration-300`} style={{ width: `${stats.cpuUsage}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-blue-400" /> MEMORY ALLOC</span>
                        <span className="font-mono text-white font-bold">{stats.memoryUsage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full bg-blue-500 rounded-full transition-all duration-300`} style={{ width: `${stats.memoryUsage}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-emerald-400" /> TOTAL IO SPAN</span>
                        <span className="font-mono text-white font-bold">{isIngesting || videos.some(v => v.status === 'streaming') ? `${(stats.networkEgressBc / 1000).toFixed(1)} Mbps` : "0 Mbps"}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono leading-none">Dynamic multiplexer output relays rate</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ingress live sandbox broadcast engine */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col xl:flex-row gap-6 relative">
                
                {/* Simulated Webcam player left */}
                <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-850 h-[300px] flex flex-col justify-between relative group shadow-inner">
                  
                  {cameraActive ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover transform scale-x-[-1] transition-all duration-300"
                      style={{ filter: getVideoFilterStyle() }}
                    />
                  ) : (
                    <div className="flex bg-slate-950 h-full flex-col justify-center items-center gap-3 text-center p-6 text-slate-500">
                      <div className="w-16 h-16 rounded-full bg-slate-900/60 flex items-center justify-center border border-slate-800/80 animate-pulse">
                        <VideoOff className="w-7 h-7 text-amber-500" />
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-slate-200 text-sm">ক্যামেরা ফিড অফলাইন (Feed Offline)</p>
                        <p className="text-[10px] mt-1 leading-relaxed max-w-xs text-slate-500">
                          লাইভ স্ট্রিমিং ও বিউটি ফিল্টার পরীক্ষা করতে নিচে থেকে ক্যামেরা অনুমতি মঞ্জুর করুন।
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Absolute active warm facial glow blend ring overlay */}
                  {cameraActive && cameraRingLight && (
                    <div 
                      className="absolute inset-0 pointer-events-none mix-blend-color-dodge transition-opacity duration-300 z-10" 
                      style={{
                        background: 'radial-gradient(circle, rgba(255,232,220,0.22) 0%, rgba(0,0,0,0) 75%)',
                      }}
                    />
                  )}

                  {/* Simulated screen status overlay bar */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
                    {isIngesting ? (
                      <span className="bg-rose-500 px-2.5 py-1 rounded-lg text-[9px] uppercase font-mono tracking-widest text-white font-bold animate-pulse flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block" /> FB / YT LIVE SYNCED
                      </span>
                    ) : (
                      <span className="bg-slate-950/80 backdrop-blur border border-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] uppercase font-mono tracking-wider font-semibold">
                        LOCAL FEED PREVIEW
                      </span>
                    )}

                    {cameraActive && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] uppercase font-mono tracking-wider font-semibold">
                        {cameraFacingMode === 'user' ? "FRONT LENS (FACE CAM)" : "BACK CAMERA LENS"}
                      </span>
                    )}
                  </div>

                  {/* Active Preset Overlay label */}
                  {cameraActive && (
                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[9px] font-mono text-amber-400 z-20 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-amber-500" />
                      <span>ফিল্টার আভা: {
                        cameraFilterPreset === 'glow' ? 'অটো গ্লো বিউটি (Glow Preset)' :
                        cameraFilterPreset === 'studio' ? 'ঝকঝকে স্টুডিও (Studio Preset)' :
                        cameraFilterPreset === 'golden' ? 'সোনালী হাসি (Golden Sunset)' :
                        cameraFilterPreset === 'ice' ? 'ঠান্ডা পরিষ্কার (Ice Cool)' :
                        cameraFilterPreset === 'cyberpunk' ? 'সাইবার গ্লো (Cyber Hype)' : 'স্বাভাবিক অরিজিনাল'
                      }</span>
                    </div>
                  )}
                  
                </div>

                {/* Interactive controller sidebar with gorgeous beauty preset filters and sliders */}
                <div className="xl:w-[420px] flex flex-col justify-between gap-5 bg-slate-950/60 p-5 rounded-2xl border border-slate-850">
                  
                  {/* Title and Bangla context summary */}
                  <div className="flex flex-col gap-1 border-b border-slate-900 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span className="text-amber-500">✨</span> 
                        স্মার্ট ক্যামেরা বিউটি ফিল্টার (Live Beauty System)
                      </h3>
                      <span className="text-[10px] font-mono bg-amber-500/15 border border-amber-500/10 rounded px-1.5 py-0.5 text-amber-400 font-bold">
                        H.264 Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                      চেহারার উজ্জলতা মডিফায়ার, ফেস ক্ল্যারিটি এবং পিয়ারলেস ত্বক স্মুথনার ফিল্টার। যেকোনো কালো বা আবছা আলোয় উজ্জ্বল সুদৃশ্য লাইভ আউটপুট প্রদান করে।
                    </p>
                  </div>

                  {/* 1. Emojis-Style Preset Filter Swipe-Bar (TikTok/Insta Stream view) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Presets Select (সোয়াইপ করে ফিল্টার সিলেক্ট করুন)</span>
                    </label>
                    
                    {/* Horizontal scrollable preset buttons for easy touch interaction */}
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 snap-x scrollbar-thin scrollbar-track-slate-950 scrollbar-thumb-slate-800">
                      {[
                        { id: 'glow', label: 'Glow Beauty', bangla: 'উজ্জ্বল আভা ✨', emoji: '✨' },
                        { id: 'studio', label: 'Studio Light', bangla: 'ঝকঝকে সাদা 💡', emoji: '💡' },
                        { id: 'golden', label: 'Golden Hour', bangla: 'সোনালী আভা ☀️', emoji: '☀️' },
                        { id: 'ice', label: 'Ice Cool', bangla: 'ঠান্ডা ফ্রেশ ❄️', emoji: '❄️' },
                        { id: 'cyberpunk', label: 'Cyber Hype', bangla: 'সাইবার গ্লো 🌆', emoji: '🌆' },
                        { id: 'none', label: 'No Filter', bangla: 'স্বাভাবিক অরিজিনাল', emoji: '🔮' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => applyPresetFilters(p.id)}
                          className={`snap-center flex flex-col items-center justify-center gap-1 px-3.5 py-2.5 border rounded-xl shrink-0 transition-all duration-200 w-[100px] text-center ${
                            cameraFilterPreset === p.id 
                              ? 'bg-amber-500/15 border-amber-400 text-amber-400 scale-[1.03] ring-2 ring-amber-500/20' 
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-white'
                          }`}
                        >
                          <span className="text-xl">{p.emoji}</span>
                          <span className="text-[10px] font-bold block truncate w-full text-slate-100">{p.label}</span>
                          <span className="text-[8px] text-slate-500 block truncate w-full font-mono">{p.bangla}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Manual Fine-Tuning Interactive Range Sliders (Mobile Comfort) */}
                  <div className="flex flex-col gap-3.5 bg-slate-900/40 p-3.5 rounded-xl border border-slate-900">
                    <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                      Fine-Tuning Controls (ম্যানুয়াল অ্যাডজাস্টমেন্ট)
                    </span>

                    {/* Brightness Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center gap-1">☀Brighten (উজ্জ্বলতা বৃদ্ধি)</span>
                        <span className="font-mono text-amber-400 font-bold">{cameraBrightness}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="100" 
                        max="180" 
                        value={cameraBrightness} 
                        onChange={(e) => {
                          setCameraFilterPreset('none');
                          setCameraBrightness(Number(e.target.value));
                        }}
                        className="h-1.5 w-full bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-[8px] text-slate-500 leading-none">কালো বা অন্ধকার ব্যাকগ্রাউন্ডের চেহারা ফর্সা ও ক্লিয়ার করার জন্য</span>
                    </div>

                    {/* Skin Smoothness Blur Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center gap-1">✨Smooth Skin (ত্বক মসৃণকরণ)</span>
                        <span className="font-mono text-amber-400 font-bold">{cameraSmoothness}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1"
                        value={cameraSmoothness} 
                        onChange={(e) => {
                          setCameraFilterPreset('none');
                          setCameraSmoothness(Number(e.target.value));
                        }}
                        className="h-1.5 w-full bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-[8px] text-slate-500 leading-none">চোখের বা মুখের দাগ লুকিয়ে মসৃণ ডিজিটাল মেকআপ পিক্সেল প্রয়োগ করে</span>
                    </div>

                    {/* Contrast Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center gap-1">◑Contrast (চেহারার স্পষ্টতা)</span>
                        <span className="font-mono text-amber-400 font-bold">{cameraContrast}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="80" 
                        max="140" 
                        value={cameraContrast} 
                        onChange={(e) => {
                          setCameraFilterPreset('none');
                          setCameraContrast(Number(e.target.value));
                        }}
                        className="h-1.5 w-full bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Saturation Slider */}
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span className="font-semibold flex items-center gap-1">🎨Saturation (রোজ ও কালার লিপস্টিক আভা)</span>
                        <span className="font-mono text-amber-400 font-bold">{cameraSaturation}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="70" 
                        max="160" 
                        value={cameraSaturation} 
                        onChange={(e) => {
                          setCameraFilterPreset('none');
                          setCameraSaturation(Number(e.target.value));
                        }}
                        className="h-1.5 w-full bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Ring-light glow toggle */}
                    <label className="flex items-center gap-2 mt-1 py-1 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={cameraRingLight}
                        onChange={(e) => setCameraRingLight(e.target.checked)}
                        className="rounded border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-300">অ্যাঞ্জেলিক রিং লাইট আভা সক্রিয় করুন (Dynamic Ring Light Overlay)</span>
                    </label>
                  </div>

                  {/* 3. Action Handshake Controls for Mobile lens swapper & Cam Enable */}
                  <div className="flex flex-col gap-2.5 mt-2">
                    
                    {/* Switch Front/Back Facing Modes Camera */}
                    <button
                      type="button"
                      onClick={switchCameraFacingMode}
                      className="w-full text-xs font-semibold py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 hover:bg-slate-900 transition flex items-center justify-center gap-2 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-[spin_10s_linear_infinite]" />
                      <span>ক্যামেরা পরিবর্তন করুন (Front ↔ Back Camera)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-3.5">
                      <button
                        onClick={toggleCameraDevice}
                        className={`text-xs font-semibold py-3.5 px-4 rounded-xl border flex items-center justify-center gap-2 transition active:scale-95 duration-150 ${
                          cameraActive 
                            ? 'bg-slate-850 border-slate-700 text-rose-450 hover:bg-slate-800 shadow' 
                            : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-850'
                        }`}
                      >
                        {cameraActive ? <VideoOff className="w-4 h-4 text-rose-500" /> : <Video className="w-4 h-4 text-emerald-500" />}
                        {cameraActive ? "ক্যামেরা অফ করুন" : "ক্যামেরা অন করুন"}
                      </button>

                      <button
                        onClick={isIngesting ? handleStopIngestion : handleStartIngestion}
                        disabled={!cameraActive}
                        className={`text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95 duration-150 ${
                          isIngesting 
                            ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg' 
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg'
                        }`}
                      >
                        {isIngesting ? <Square className="w-4 h-4 fill-white shrink-0" /> : <Play className="w-4 h-4 fill-slate-950 shrink-0" />}
                        {isIngesting ? "ব্রডকাস্ট স্টপ" : "লাইভ পাবলিশ"}
                      </button>
                    </div>

                    {cameraError && (
                      <span className="bg-rose-500/15 text-rose-400 text-center px-3 py-2 rounded-xl text-[10px] border border-rose-500/10 font-mono mt-1">
                        {cameraError}
                      </span>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

          {activePage === 'upload' && currentUser && (
            <div className="flex flex-col gap-6 animate-fade-in animate-duration-150">
              
              <div>
                <span className="text-[10px] tracking-widest font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
                  Video Management (ভিডিও ব্যবস্থাপনা)
                </span>
                <h2 className="text-xl font-bold text-white mt-1 border-b border-slate-800 pb-3">Cloud Storage VOD Uploader (ভিডিও আপলোড ও স্টোরেজ)</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Config dropzone uploader */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-white">Upload New Asset (নতুন ভিডিও যোগ করুন)</h3>
                  </div>

                  <form onSubmit={handleMockUpload} className="flex flex-col gap-4">
                    
                    {/* Direct Video File Uploader */}
                    <div className="flex flex-col gap-1.5 bg-slate-950/40 p-3 rounded-xl border border-dashed border-slate-800 hover:border-amber-500/50 transition duration-150">
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Select Video File (ভিডিও ফাইল সিলেক্ট করুন)</span>
                        <span className="text-amber-500 font-extrabold text-[9px]">no limits / কোনো লিমিট নেই</span>
                      </span>
                      <label className="flex flex-col items-center justify-center gap-2 py-5 px-3 bg-slate-950 rounded-lg cursor-pointer hover:bg-slate-900 border border-slate-850/80 transition-all text-center relative">
                        <input 
                          type="file" 
                          accept="video/*" 
                          className="hidden" 
                          onChange={handleVideoFileChange}
                          disabled={uploadProgress !== null}
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800">
                          <Film className="w-5 h-5 text-amber-500 animate-pulse" />
                        </div>
                        <div className="text-xs">
                          {uploadedVideoFile ? (
                            <span className="text-emerald-400 font-bold block truncate max-w-[210px]">{uploadedVideoFile.name}</span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">গ্যালারি/ফাইল থেকে সরাসরি ভিডিও দিন</span>
                          )}
                          <p className="text-[9px] text-slate-500 mt-0.5 font-mono">Any size is supported without limit</p>
                        </div>
                      </label>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-slate-500">Asset Title (ভিডিও শিরোনাম)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. My Esports Relays Compilation" 
                        value={videoTitleInput}
                        onChange={e => setVideoTitleInput(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                        required
                        disabled={uploadProgress !== null}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-slate-500">Description (ভিডিওর বর্ণনা)</label>
                      <textarea 
                        placeholder="এই ভিডিওর বিস্তারিত বর্ণনা লিখুন..." 
                        value={videoDescriptionInput}
                        onChange={e => setVideoDescriptionInput(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 min-h-[85px] resize-none"
                        disabled={uploadProgress !== null}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-slate-500 flex justify-between items-center">
                        <span>Custom Thumbnail Image (থাম্বনেইল ইমেজ)</span>
                        <span className="text-slate-400 font-normal">URL অথবা ফাইল দিন</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="থাম্বনেইল ইমেজ লিংক (https://...)" 
                        value={customThumbnailUrl}
                        onChange={e => setCustomThumbnailUrl(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/40 font-mono"
                        disabled={uploadProgress !== null}
                      />
                      
                      <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-950 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-800 hover:border-slate-750 cursor-pointer transition select-none">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageFileChange(e, false)}
                          disabled={uploadProgress !== null}
                        />
                        <span>🖼️ সরাসরি গ্যালারি থেকে পিকচার যোগ করুন</span>
                      </label>
                      
                      {customThumbnailUrl && (
                        <div className="mt-1 flex items-center gap-3 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                          <img 
                            src={customThumbnailUrl} 
                            alt="Custom thumbnail preview" 
                            className="w-12 h-9 object-cover rounded border border-slate-800 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] text-slate-500 block">থাম্বনেইল প্রাকদর্শন (Preview)</span>
                            <span className="text-[10px] text-emerald-400 truncate block font-mono">
                              {customThumbnailUrl.startsWith('data:') ? 'স্থানীয় পিকচার লোড করা হয়েছে' : customThumbnailUrl}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomThumbnailUrl('')}
                            className="text-[10px] font-bold text-rose-500 hover:underline px-1.5"
                          >
                            মুছুন
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase text-slate-500">OR Use Preset Cover (অথবা প্রি-সেট কভার নির্বাচন করুন)</label>
                      <select 
                        value={selectedThumbnailPreset}
                        onChange={e => setSelectedThumbnailPreset(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
                        disabled={uploadProgress !== null || !!customThumbnailUrl}
                      >
                        <option value="cyberpunk">Cyberpunk Esports Cover</option>
                        <option value="synthwave">Retro Synthwave Art</option>
                        <option value="esports">Interactive Overlay Covers</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500">Video Size (সাইজ)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 48.5 MB" 
                          value={videoSizeInput}
                          onChange={e => setVideoSizeInput(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 font-mono"
                          disabled={uploadProgress !== null}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500">Duration (দৈর্ঘ্য)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 05:10" 
                          value={videoDurationInput}
                          onChange={e => setVideoDurationInput(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 font-mono"
                          disabled={uploadProgress !== null}
                        />
                      </div>
                    </div>

                    {uploadProgress !== null && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-amber-500 font-bold">
                          <span>PROCESSING & SYNCING ASSET...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploadProgress !== null || !videoTitleInput}
                      className="w-full bg-amber-500 font-bold text-slate-950 text-xs py-3 rounded-lg hover:bg-amber-400 mt-2 hover:shadow transition disabled:opacity-50"
                    >
                      {uploadProgress !== null ? "Transmitting Blocks..." : "Save VOD to Firebase Account"}
                    </button>
                  </form>
                </div>

                {/* VOD grid listing outputs */}
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold text-white">Registered Media VOD Files (আপলোড করা ভিডিওসমূহ)</h3>
                  
                  {videos.length === 0 ? (
                    <div className="flex h-48 justify-center items-center rounded-xl bg-slate-950/40 border border-slate-900 text-slate-500 text-xs text-center p-6">
                      No video assets synchronized under profile. Use left uploader tool to sync dummy data files.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {videos.map(vod => (
                        <div key={vod.id} className="bg-slate-950/60 rounded-xl border border-slate-850 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <img 
                              src={resolveMediaUrl(vod.thumbnailUrl)} 
                              alt="Thumbnail cover" 
                              className="w-20 h-14 object-cover rounded-lg border border-slate-800 shrink-0 shadow-md"
                              referrerPolicy="no-referrer"
                            />
                            <div className="leading-snug">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {vod.title}
                                {vod.status === 'streaming' && (
                                  <span className="bg-rose-500 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                                    LIVE STREAMING
                                  </span>
                                )}
                              </h4>
                              {vod.description && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 max-w-lg leading-relaxed">
                                  {vod.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-3">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                                  <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">Size: {vod.size}</span>
                                  <span>|</span>
                                  <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">Duration: {vod.duration}</span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isLiked = likedVideos[vod.id];
                                    setLikedVideos(prev => ({ ...prev, [vod.id]: !isLiked }));
                                    setVideoLikes(prev => ({ ...prev, [vod.id]: (prev[vod.id] || 0) + (isLiked ? -1 : 1) }));
                                    addLog('CLIENT', 'success', `${isLiked ? 'Removed Facebook Like from' : 'Liked video on'} simulated social hub for "${vod.title}"`);
                                  }}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all duration-200 ${
                                    likedVideos[vod.id]
                                      ? 'bg-blue-600/20 border-blue-500 text-blue-450 font-extrabold scale-102 ring-2 ring-blue-500/10'
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                                  }`}
                                  title="Like simulated stream on Facebook feed"
                                >
                                  <span>👍</span>
                                  <span>{likedVideos[vod.id] ? "ফেসবুকে লাইক করা হয়েছে" : "Like on Facebook (ফেসবুকে লাইক)"}</span>
                                  <span className="bg-slate-950 px-1.5 py-0.2 rounded-full font-mono text-[9px] text-blue-400 ml-1">
                                    {(videoLikes[vod.id] || 0) + (vod.title.charCodeAt(0) % 15) + 12}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                            {vod.status === 'streaming' ? (
                              <button
                                onClick={handleStopVideoStream}
                                className="bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/20 px-3.5 py-1.5 text-xs rounded-lg font-bold font-mono tracking-wider transition uppercase"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleStreamVideoNow(vod.id);
                                  addLog('CLIENT', 'success', `Broadcasting starting for VOD: '${vod.title}'. Sending RTMP packages to destinations...`);
                                }}
                                className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 px-3.5 py-1.5 text-xs rounded-lg font-bold tracking-wider transition uppercase"
                              >
                                Go Live
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDeleteVideo(vod.id, vod.title)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition"
                              title="Delete VOD asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {activePage === 'stream-control' && currentUser && (
            <div className="flex flex-col gap-6 animate-fade-in animate-duration-150">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] tracking-widest font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
                    Relay & Broadcast Wizard (লাইভ স্ট্রিম উইজার্ড)
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">Multi-Destination Relay Outlets (রিলে সম্প্রচার নিয়ন্ত্রণ)</h2>
                </div>

                {/* Wizard or Standard toggle buttons */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setWizardActive(false)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${!wizardActive ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Custom Relays (সাধারণ রিলে)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setWizardActive(true)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${wizardActive ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Auto Wizard 🚀 (অটো লাইভ উইজার্ড)
                  </button>
                </div>
              </div>

              {/* FLOATING KEYFRAMES STYLE SHEET */}
              <style>{`
                @keyframes floatUpAndFade {
                  0% {
                    transform: translateY(0) scale(0.5);
                    opacity: 0;
                  }
                  12% {
                    opacity: 1;
                    transform: translateY(-20px) scale(1.1) rotate(5deg);
                  }
                  50% {
                    transform: translateY(-110px) scale(1) rotate(-10deg);
                  }
                  100% {
                    transform: translateY(-270px) scale(0.8) rotate(15deg);
                    opacity: 0;
                  }
                }
              `}</style>

              {wizardActive ? (
                /* =================== STREAM SYNC AUTOMATED LIVE WIZARD =================== */
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-6">
                  
                  {/* Step status bar */}
                  <div className="grid grid-cols-4 gap-2 border-b border-slate-800/60 pb-5 text-center">
                    {[
                      { step: 'setup', label: '1. Target Setup', bangla: 'প্ল্যাটফর্ম সেটআপ' },
                      { step: 'details', label: '2. Metadata', bangla: 'ভিডিও টাইটেল' },
                      { step: 'processing', label: '3. Processing', bangla: 'প্রসেসিং হচ্ছে' },
                      { step: 'streaming', label: '4. Live Social Sync', bangla: 'ফেসবুকে লাইভ' }
                    ].map((item, index) => {
                      const isActive = wizardStep === item.step;
                      const isProcessed = 
                        (wizardStep === 'details' && index < 1) ||
                        (wizardStep === 'processing' && index < 2) ||
                        (wizardStep === 'streaming' && index < 3);
                      return (
                        <div key={item.step} className="flex flex-col gap-1 items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all duration-300 ${
                            isActive ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20' : 
                            isProcessed ? 'bg-emerald-500 text-white' : 'bg-slate-950 text-slate-650'
                          }`}>
                            {isProcessed ? "✓" : index + 1}
                          </div>
                          <span className={`text-[10px] font-bold hidden md:inline transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                            {item.label}
                          </span>
                          <span className="text-[9px] text-slate-550 font-mono scale-90">{item.bangla}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Step 1: Platforms RTMP Setup */}
                  {wizardStep === 'setup' && (
                    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full py-2">
                      <div className="text-center">
                        <h3 className="text-base font-bold text-white">Select Live Destination (লাইভ প্ল্যাটফর্ম সিলেক্ট করুন)</h3>
                        <p className="text-xs text-slate-400 mt-1">ফেসবুক, ইউটিউব অথবা ইনস্টাগ্রামে লাইভ শুরু করতে সাহায্যকারী উইজার্ড সিলেক্ট করুন</p>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {(['facebook', 'youtube', 'instagram', 'custom'] as const).map(plt => (
                          <button
                            key={plt}
                            type="button"
                            onClick={() => handleWizardPlatformChange(plt)}
                            className={`flex flex-col items-center gap-1.5 py-3 border rounded-xl transition ${
                              wizardPlatform === plt ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
                            }`}
                          >
                            <span className="text-xs uppercase font-bold font-mono">{plt}</span>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-slate-400">RTMP Live Feed Target Server URL (আরটিএমপি ইউআরএল)</label>
                          <input 
                            type="text" 
                            value={wizardRtmpUrl}
                            onChange={e => setWizardRtmpUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                            placeholder="rtmp://server.url/path"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-slate-400">Secret Stream Key (সিক্রেট স্ট্রিম কী)</label>
                          <input 
                            type="password" 
                            value={wizardStreamKey}
                            onChange={e => setWizardStreamKey(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                            placeholder="fb-stream-key-xyz-..."
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!wizardStreamKey.trim()}
                        onClick={() => {
                          setWizardStep('details');
                        }}
                        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold py-3 px-6 rounded-xl text-xs flex items-center justify-center gap-2 mt-2 transition shadow-lg"
                      >
                        {!wizardStreamKey.trim() ? "Provide Stream Key to continue" : "Next: Metadata Setup (পরবর্তী ধাপে যান) →"}
                      </button>
                    </div>
                  )}

                  {/* Step 2: Custom Metadata Inputs */}
                  {wizardStep === 'details' && (
                    <div className="flex flex-col gap-5 max-w-xl mx-auto w-full py-2">
                      <div className="text-center">
                        <h3 className="text-base font-bold text-white">Video Asset Configuration (ভিডিওর শিরোনাম ও থাম্বনেইল)</h3>
                        <p className="text-xs text-slate-400 mt-1">সার্ভারে পাঠানোর পূর্বে ভিডিও কাস্টমাইজেশন সম্পন্ন করুন</p>
                      </div>

                      <div className="flex flex-col gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                        
                        {/* Saved VOD select panel */}
                        <div className="flex flex-col gap-2 border-b border-slate-900 pb-4 mb-1">
                          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
                            <span>সেভ করা ভিডিও তালিকা (Select Saved VOD Video)</span>
                            <span className="text-amber-500 text-[9px] font-extrabold font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">
                              {videos.length} VOD Assets
                            </span>
                          </label>
                          
                          {videos.length === 0 ? (
                            <div className="bg-slate-900/40 p-3.5 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500 leading-relaxed">
                              কোনো সেভ করা ভিডিও পাওয়া যায়নি। <br />
                              প্রথমে ওপরে থাকা <span className="text-amber-500 font-bold">"Upload VOD Assets"</span> মেনু থেকে ভিডিও আপলোড ও সেভ করে নিন।
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] text-slate-400">এই উইজার্ডের মাধ্যমে স্ট্রিম করার জন্য একটি সেভ করা ভিডিও নির্বাচন করুন (এটি সিলেক্ট করলে টাইটেল স্বয়ংক্রিয়ভাবে লোড হবে):</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                                {videos.map(v => {
                                  const isSelected = wizardSelectedVideoId === v.id;
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      onClick={() => {
                                        setWizardSelectedVideoId(v.id);
                                        setWizardTitle(v.title);
                                        if (v.description) setWizardDescription(v.description);
                                        if (v.thumbnailUrl) setWizardCustomThumb(v.thumbnailUrl);
                                        addLog('CLIENT', 'success', `উইজার্ডে সেভ করা ভিডিও "${v.title}" সিলেক্ট করা হয়েছে। টাইটেল ও থাম্বনেইল লোড করা হলো।`);
                                      }}
                                      className={`text-left p-2.5 rounded-xl border transition flex items-center gap-2.5 ${
                                        isSelected 
                                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 scale-[1.01] ring-1 ring-amber-500/20' 
                                          : 'bg-slate-900 border-slate-800/85 text-slate-455 hover:bg-slate-850 hover:text-white'
                                      }`}
                                    >
                                      <img 
                                        src={v.thumbnailUrl} 
                                        alt="Thumbnail preview" 
                                        className="w-12 h-9 object-cover rounded border border-slate-800 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="flex-1 min-w-0 leading-tight">
                                        <p className="text-[11px] font-bold truncate text-slate-100">{v.title}</p>
                                        <div className="flex gap-1.5 text-[8px] text-slate-500 font-mono mt-0.5">
                                          <span>{v.size}</span>
                                          <span>•</span>
                                          <span>{v.duration}</span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-slate-400">Stream Title (লাইভ ভিডিওর শিরোনাম)</label>
                          <input 
                            type="text" 
                            value={wizardTitle}
                            onChange={e => setWizardTitle(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40"
                            placeholder="e.g. Bangladesh Esports Live Tournament 2026"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-slate-400">Video Description (বর্ণনা)</label>
                          <textarea 
                            value={wizardDescription}
                            onChange={e => setWizardDescription(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 min-h-[75px] resize-none"
                            placeholder="এই সম্প্রচারের বিস্তারিত বিবরণ লিখুন..."
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-mono uppercase text-slate-400 flex justify-between items-center">
                            <span>Custom Thumbnail Thumbnail (থাম্বনেইল ইমেজ লিংক - optional)</span>
                            <span className="text-slate-500 text-[9px]">লিংক বা গ্যালারি থেকে পিকচার</span>
                          </label>
                          <input 
                            type="text" 
                            value={wizardCustomThumb}
                            onChange={e => setWizardCustomThumb(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/40 font-mono"
                            placeholder="https://images.unsplash.com/... (blank for preset)"
                          />
                          
                          <label className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-900 text-[11px] font-bold text-slate-300 rounded-lg border border-slate-800 hover:border-slate-750 cursor-pointer transition select-none">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handleImageFileChange(e, true)}
                            />
                            <span>🖼️ গ্যালারি থেকে সরাসরি পিকচার যোগ করুন</span>
                          </label>

                          {wizardCustomThumb && (
                            <div className="mt-1 flex items-center gap-3 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                              <img 
                                src={wizardCustomThumb} 
                                alt="Wizard custom preview" 
                                className="w-12 h-9 object-cover rounded border border-slate-700 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0">
                                <span className="text-[9px] text-slate-500 block">থাম্বনেইল প্রাকদর্শন (Preview)</span>
                                <span className="text-[10px] text-emerald-400 truncate block font-mono">
                                  {wizardCustomThumb.startsWith('data:') ? 'স্থানীয় পিকচার লোড করা হয়েছে' : wizardCustomThumb}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setWizardCustomThumb('')}
                                className="text-[10px] font-bold text-rose-500 hover:underline px-1.5"
                              >
                                মুছুন
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Playback repetition loop config controls */}
                        <div className="flex flex-col gap-2.5 border-t border-slate-900 pt-4 mt-2">
                          <label className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider flex justify-between items-center">
                            <span>প্লেব্যাক লুপ কনফিগারেশন (Repetition & Loop Mode)</span>
                            <span className="text-amber-500 text-[9px] font-bold font-mono">Stream repetition config</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setWizardLoopMode('once')}
                              className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold transition ${
                                wizardLoopMode === 'once'
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                                  : 'bg-slate-900 border-slate-850/80 text-slate-500 hover:text-white'
                              }`}
                            >
                              <span className="block text-[11px]">১ বার চলবে</span>
                              <span className="text-[8px] font-normal opacity-70 block mt-0.5">(Play once & end)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setWizardLoopMode('infinite')}
                              className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold transition ${
                                wizardLoopMode === 'infinite'
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                                  : 'bg-slate-900 border-slate-850/80 text-slate-500 hover:text-white'
                              }`}
                            >
                              <span className="block text-[11px]">অবিরাম লুপ</span>
                              <span className="text-[8px] font-normal opacity-70 block mt-0.5">(Infinite Loop)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setWizardLoopMode('custom')}
                              className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold transition ${
                                wizardLoopMode === 'custom'
                                  ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                                  : 'bg-slate-900 border-slate-850/80 text-slate-500 hover:text-white'
                              }`}
                            >
                              <span className="block text-[11px]">সসীম লুপ</span>
                              <span className="text-[8px] font-normal opacity-70 block mt-0.5">(Custom repeats)</span>
                            </button>
                          </div>

                          {wizardLoopMode === 'custom' && (
                            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-850 p-2 rounded-lg mt-1 justify-between">
                              <span className="text-[10px] text-slate-450 font-medium font-sans">কয়বার ভিডিওটি একাধারে বাজবে নির্ধারণ করুন:</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setWizardLoopCount(Math.max(2, wizardLoopCount - 1))}
                                  className="w-6 h-6 rounded bg-slate-800 border border-slate-700 font-mono text-xs flex items-center justify-center hover:bg-slate-700 text-white select-none"
                                >
                                  -
                                </button>
                                <span className="w-12 text-center font-mono font-bold text-xs text-amber-400 bg-slate-950 py-0.5 rounded border border-slate-800 select-none">
                                  {wizardLoopCount} বার
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setWizardLoopCount(wizardLoopCount + 1)}
                                  className="w-6 h-6 rounded bg-slate-800 border border-slate-700 font-mono text-xs flex items-center justify-center hover:bg-slate-700 text-white select-none"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setWizardStep('setup')}
                          className="bg-slate-800 hover:bg-slate-750 text-white font-bold py-3 rounded-xl text-xs transition"
                        >
                          ← Back (পূর্ববর্তী ধাপ)
                        </button>
                        <button
                          type="button"
                          disabled={!wizardTitle.trim()}
                          onClick={handleStartWizardProcessing}
                          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg"
                        >
                          Process & Go Live (প্রসেস ও লাইভ শুরু করুন) ⚙️
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Processing simulation */}
                  {wizardStep === 'processing' && (
                    <div className="flex flex-col gap-5 max-w-md mx-auto w-full py-8 text-center">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 animate-pulse" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-amber-500">
                          {wizardPercentage}%
                        </div>
                      </div>

                      <div>
                        <h4 className="text-white font-bold text-sm">Processing & Syncing Video to Firebase (ভিডিও প্রসেস করা হচ্ছে)</h4>
                        <p className="text-xs text-slate-500 mt-1">FFmpeg is encoding H.264 video feed & multiplexing AAC audio channels...</p>
                      </div>

                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-200" style={{ width: `${wizardPercentage}%` }} />
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl font-mono text-[9px] text-slate-400 text-left flex flex-col gap-1 mx-auto w-full max-w-sm h-24 overflow-y-auto">
                        <span>[FFmpeg] frame= 240 fps=29.4 q=28.0 size= 128kB time=00:00:08.50 bitrate= 123.6kbits/s</span>
                        {wizardPercentage > 30 && <span>[FFmpeg] Stream sync metadata loaded from Firestore Account successfully.</span>}
                        {wizardPercentage > 60 && <span>[FFmpeg] Building progressive multiplexing block array...</span>}
                        {wizardPercentage > 90 && <span>[FFmpeg] Sending headers: metadata packet size synced.</span>}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Actively Streaming & Facebook Interaction Arena */}
                  {wizardStep === 'streaming' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                      
                      {/* Left: Active Stream Monitor */}
                      <div className="lg:col-span-3 flex flex-col gap-4">
                        <div className="relative bg-black aspect-video rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between p-4 group">
                          {/* Top row status */}
                          <div className="z-10 flex items-center justify-between">
                            <span className="bg-rose-500 text-white text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-md animate-pulse flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white block" /> BROADCAST LIVE
                            </span>
                            <span className="bg-slate-900/80 backdrop-blur border border-slate-700/50 text-white font-mono text-[9px] px-2 py-0.5 rounded-md font-bold uppercase">
                              {wizardPlatform} Target
                            </span>
                          </div>

                          {/* Interactive floating reaction arena overlay overlaying player! */}
                          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
                            {hoverReactions.map(react => {
                              const emojis = { like: '👍', heart: '❤️', fire: '🔥', surprise: '😮' };
                              return (
                                <span key={react.id} style={react.style}>
                                  {emojis[react.type]}
                                </span>
                              );
                            })}
                          </div>

                          {/* Placeholder image or actual playing VOD video of active stream */}
                          <div className="absolute inset-0 select-none">
                            <div className="absolute inset-0 bg-slate-950/40 mix-blend-multiply z-10" />
                            {(() => {
                              const activeWizardVideo = videos.find(v => v.id === wizardSelectedVideoId);
                              if (activeWizardVideo && activeWizardVideo.videoUrl && (activeWizardVideo.videoUrl.startsWith('blob:') || activeWizardVideo.videoUrl.length > 30)) {
                                return (
                                  <video 
                                    src={resolveMediaUrl(activeWizardVideo.videoUrl)} 
                                    autoPlay 
                                    loop 
                                    muted 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                  />
                                );
                              }
                              return (
                                <img 
                                  src={
                                    wizardCustomThumb || 
                                    (wizardPlatform === 'facebook' ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=640' : 'https://images.unsplash.com/photo-1618055182384-a83a8bd57fbe?q=80&w=640')
                                  } 
                                  alt="Active stream" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              );
                            })()}
                            {/* Simulated equalizer waves */}
                            <div className="absolute bottom-4 left-4 z-20 flex items-end gap-1 font-mono text-[10px] text-amber-500 font-bold">
                              <div className="flex gap-0.5 h-6 items-end">
                                <span className="w-1 bg-amber-500 animate-pulse" style={{ height: '70%', animationDelay: '0.1s' }} />
                                <span className="w-1 bg-amber-500 animate-pulse" style={{ height: '30%', animationDelay: '0.3s' }} />
                                <span className="w-1 bg-amber-500 animate-pulse" style={{ height: '90%', animationDelay: '0.2s' }} />
                                <span className="w-1 bg-amber-500 animate-pulse" style={{ height: '50%', animationDelay: '0.4s' }} />
                              </div>
                              <span className="ml-1 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                                SENDER: virtual_rtmp_1935
                              </span>
                            </div>
                          </div>

                          {/* Hover action overlay info */}
                          <div className="z-10 flex justify-end">
                            <span className="bg-slate-950/85 backdrop-blur px-2 py-1 text-[9px] font-mono text-slate-400 rounded-md border border-slate-800">
                              Bitrate: 1.08 Mbps (AAC Over RTMP)
                            </span>
                          </div>
                        </div>

                        {/* Title and stats bar */}
                        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                          <h4 className="text-sm font-bold text-white uppercase">{wizardTitle}</h4>
                          {wizardDescription && (
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {wizardDescription}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-900/60 text-xs text-slate-400">
                            <div>
                              <span className="text-slate-500 uppercase text-[9px] font-mono font-semibold block">Server End Path</span>
                              <span className="text-white font-mono text-[10px] break-all select-all">{wizardRtmpUrl}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase text-[9px] font-mono font-semibold block">Virtual Transcoder</span>
                              <span className="text-white font-mono text-[10px]">Active (PID: {Math.floor(Math.random() * 5000 + 4000)})</span>
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Local FFmpeg Commands for Real Streaming */}
                        <div className="bg-slate-950/80 p-4 rounded-xl border border-dashed border-amber-500/30 mt-4 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] tracking-wider font-bold text-amber-500 uppercase flex items-center gap-1 font-mono">
                              <span>🔴 রিয়েল লাইভ সম্প্রচার গাইড (Real Live Stream Engine)</span>
                            </span>
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/15">Active Sync Ingestion</span>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            উইজার্ডে ভিডিও ও ডেসটিনেশন সিলেক্ট করা হয়ে গেছে! ব্রাউজার সিকিউরিটি সীমার কারণে সরাসরি ব্রাউজার থেকে আরটিএমপি (RTMP) লাইভ প্রোটোকল সম্প্রচার করা যায় না। আপনার কম্পিউটারের আসল ভিডিও ফাইলটি দিয়ে লাইভ চালু করতে নিচের প্রস্তুতকৃত স্ক্রিপ্ট ডাউনলোড অথবা FFmpeg কমান্ডটি ব্যবহার করুন:
                          </p>

                          <div className="bg-slate-900 rounded-lg p-2.5 mt-1 border border-slate-800">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                              <p className="text-[10px] font-bold text-slate-200">১-ক্লিক কাস্টম স্ক্রিপ্ট টেমপ্লেট ডাউনলোড (Download One-Click Scripts):</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => downloadFFmpegScript('windows')}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-[10px] text-slate-300 hover:text-white rounded-lg font-bold transition select-none active:scale-95"
                              >
                                💻 Windows Batch (.bat) ডাউনলোড
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFFmpegScript('mac-linux')}
                                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-[10px] text-slate-300 hover:text-white rounded-lg font-bold transition select-none active:scale-95"
                              >
                                🍏 macOS / Linux (.sh) ডাউনলোড
                              </button>
                            </div>
                            <p className="text-[8.5px] text-slate-500 mt-2 italic font-sans">
                              *নোট: ডাউনলোডকৃত ফাইলটি আপনার কম্পিউটারে যেখানে আপনার কাস্টম ভিডিওটি রাখা আছে সেখানে নিয়ে কোড ফাইলে আপনার ভিডিওর নাম <strong>"video.mp4"</strong> করে রান বা ডাবল-ক্লিক করলেই লাইভ শুরু হয়ে যাবে।*
                            </p>
                          </div>

                          <div className="bg-slate-900 rounded-lg p-2.5 mt-1 border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-200">অথবা পিসি লাইভ টার্মিনাল কমান্ড কপি করুন (FFmpeg Run Command):</p>
                            
                            <div className="relative mt-2 bg-slate-950 rounded p-2.5 border border-slate-800 flex flex-col gap-1 font-mono text-[9px] text-emerald-450 leading-normal">
                              <span className="text-slate-500 text-[8px] uppercase select-none font-bold">FFmpeg Live Command (Ready for Copy):</span>
                              {(() => {
                                let loopOption = '';
                                if (wizardLoopMode === 'infinite') {
                                  loopOption = '-stream_loop -1 ';
                                } else if (wizardLoopMode === 'custom') {
                                  loopOption = `-stream_loop ${wizardLoopCount - 1} `;
                                }
                                return (
                                  <code className="break-all select-all text-amber-450 font-bold bg-slate-950/90 p-1.5 rounded border border-slate-900 block my-1">
                                    {`ffmpeg -re ${loopOption}-i "C:/path/to/your/video.mp4" -c:v libx264 -preset veryfast -b:v 2500k -maxrate 2500k -bufsize 5000k -pix_fmt yuv420p -g 60 -c:a aac -b:a 128k -f flv "${wizardRtmpUrl.endsWith('/') ? wizardRtmpUrl : wizardRtmpUrl + '/'}${wizardStreamKey}"`}
                                  </code>
                                );
                              })()}
                              <p className="text-[8.5px] text-slate-500 mt-1 uppercase select-none italic font-sans font-normal leading-tight">
                                *নোট: <code className="text-amber-500">"C:/path/to/your/video.mp4"</code> অংশটির জায়গায় আপনার কম্পিউটারে সেভ থাকা ভিডিও ফাইলের আসল লোকেশন বা নাম রিপ্লেস করে এন্টার দিন।*
                              </p>
                            </div>
                          </div>

                          <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-200">পদ্ধতি ২: ওবিএস স্টুডিও (OBS Studio) ইন্টিগ্রেশন</p>
                            <p className="text-[9px] text-slate-400 mt-1 leading-snug font-sans">
                              ১. ওবিএস স্টুডিও ওপেন করুন। <br />
                              ২. Settings &gt; Stream অপশনে যান। <br />
                              ৩. Service থেকে "Custom..." সিলেক্ট করুন। <br />
                              ৪. Server এর ঘরে দিন: <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded text-[8px] font-mono">{wizardRtmpUrl}</code> <br />
                              ৫. Stream Key এর ঘরে আপনার নিচের গোপন কী-টি পেস্ট করুন: <br />
                              <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded text-[8px] font-mono block w-fit mt-1">{wizardStreamKey}</code> <br />
                              ৬. এবার OBS-এ <strong>"Start Streaming"</strong> এ ক্লিক করুন—পোর্টালে রিয়েল-টাইম লাইভ সম্প্রচার সোর্স কানেক্ট হয়ে যাবে।
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Interactive Control Room */}
                      <div className="lg:col-span-2 bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col gap-4">
                        <div className="border-b border-slate-900 pb-3">
                          <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold font-mono px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                            Simulator Controller
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1">Facebook Live Sync Interaction (ফেসবুক লাইভ প্রতিক্রিয়া)</h4>
                        </div>

                        {/* Social scores matrix */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                          <div className="bg-slate-905 border border-slate-800 rounded-xl p-3">
                            <span>👍 Likes</span>
                            <h5 className="text-lg font-bold text-white mt-1 font-mono">{fbLikeCount}</h5>
                          </div>
                          <div className="bg-slate-905 border border-slate-800 rounded-xl p-3">
                            <span>❤️ Hearts</span>
                            <h5 className="text-lg font-bold text-white mt-1 font-mono">{fbHeartCount}</h5>
                          </div>
                          <div className="bg-slate-905 border border-slate-800 rounded-xl p-3">
                            <span>🔥 Shares</span>
                            <h5 className="text-lg font-bold text-white mt-1 font-mono">{fbShareCount}</h5>
                          </div>
                        </div>

                        {/* Social send triggers */}
                        <div className="flex flex-col gap-2 mt-2">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-bold mb-1 block">Simulate Outbound Reactions (প্রতিক্রিয়া পাঠান):</span>
                          
                          <button
                            type="button"
                            onClick={() => addFloatingReaction('like')}
                            className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                          >
                            👍 Simulate Facebook Like (লাইক পাঠান)
                          </button>

                          <button
                            type="button"
                            onClick={() => addFloatingReaction('heart')}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                          >
                            ❤️ Simulate Love Reaction (লাভ রিঅ্যাকশন)
                          </button>

                          <button
                            type="button"
                            onClick={() => addFloatingReaction('fire')}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                          >
                            🔥 Simulate Hype Share (শেয়ার / ফায়ার)
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500 font-mono mt-auto text-center leading-relaxed">
                          *ফেসবুক সার্ভারে লাইক ও লাভ রিয়েকশন যাচাইকৃত। বাটন প্রেস করলে আপনার ফেসবুক লাইভ উইজেটে লাইভ এনিমেশন ভাসবে এবং এনজিনক্স লগে রিয়েল-টাইম প্রতিক্রিয়া যুক্ত হবে।*
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setWizardStep('setup');
                            setWizardStreamKey('');
                            setWizardTitle('');
                            setWizardDescription('');
                            setWizardCustomThumb('');
                            setFbLikeCount(0);
                            setFbHeartCount(0);
                            setFbShareCount(0);
                            addLog('CLIENT', 'warn', 'Stream sync loop stopped. Resetting simulation Wizard parameters.');
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-2 px-4 rounded-lg text-xs mt-3 transition"
                        >
                          Stop Stream & Reset Wizard (লাইভ বন্ধ করতে ক্লিক করুন)
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              ) : (
                /* =================== STANDARD RELAY CONFIGURATION PANELS =================== */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Platform relay setups */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-white">Add Dynamic Outbound Relay</h3>
                    
                    <div className="grid grid-cols-4 gap-1.5">
                      {['youtube', 'facebook', 'twitch', 'custom'].map(plt => (
                        <button
                          key={plt}
                          type="button"
                          onClick={() => handlePresetPlatform(plt as any)}
                          className={`text-[9px] uppercase tracking-wide py-1 border rounded-md font-bold font-mono transition ${
                            newDestPlatform === plt ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-950 border-slate-850 text-slate-500 hover:bg-slate-900'
                          }`}
                        >
                          {plt}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleCreateDestination} className="flex flex-col gap-3.5 mt-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500">Relay Name</label>
                        <input 
                          type="text" 
                          placeholder="YouTube Gaming Target" 
                          value={newDestName}
                          onChange={e => setNewDestName(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500">Outward RTMP server URL</label>
                        <input 
                          type="text" 
                          value={newDestUrl}
                          onChange={e => setNewDestUrl(e.target.value)}
                          className="bg-slate-950 border border-slate-aa0 border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500/40"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-mono uppercase text-slate-500">Social Outbound Stream Key</label>
                        <input 
                          type="password" 
                          placeholder="yt-9a8x-w7b2-..." 
                          value={newDestKey}
                          onChange={e => setNewDestKey(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500/40"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs py-2.5 border border-slate-700 rounded-lg transition"
                      >
                        Save & Sync Destination
                      </button>
                    </form>
                  </div>

                  {/* Relays targets overview list */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
                    <h3 className="text-sm font-semibold text-white">Stream Sync Relay Channels</h3>
                    
                    {destinations.length === 0 ? (
                      <div className="flex h-48 justify-center items-center text-center p-6 text-slate-500 bg-slate-950/40 border border-slate-900 rounded-xl">
                        No relay endpoints registered yet. Formulate and save paths configurations left.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {destinations.map(dest => (
                          <div key={dest.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${dest.status === 'streaming' ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
                              <div className="leading-snug">
                                <h4 className="text-xs font-semibold text-white">{dest.name}</h4>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">{dest.rtmpUrl}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleToggleDestination(dest.id, dest.enabled)}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold transition ${
                                  dest.enabled ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-500 border border-slate-750'
                                }`}
                              >
                                {dest.enabled ? "ACTIVE" : "BYPASSED"}
                              </button>

                              <button
                                onClick={() => handleDeleteDestination(dest.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scheduled stream multicasts */}
                    <div className="border-t border-slate-800/80 pt-5 mt-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        <h3 className="text-sm font-semibold text-white">Schedule Future Transcodes</h3>
                      </div>

                      <form onSubmit={handleScheduleSubmissions} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <select 
                          value={scheduleVideoId}
                          onChange={e => setScheduleVideoId(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
                          required
                        >
                          <option value="">Select VOD File...</option>
                          {videos.map(v => (
                            <option key={v.id} value={v.id}>{v.title}</option>
                          ))}
                        </select>

                        <input 
                          type="datetime-local" 
                          value={scheduleTime}
                          onChange={e => setScheduleTime(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none font-mono"
                          required
                        />

                        <button
                          type="submit"
                          className="bg-amber-500 text-slate-950 font-bold px-4 rounded-lg hover:bg-amber-400 transition text-xs py-2.5"
                        >
                          Schedule Multicast
                        </button>
                      </form>

                      {schedules.length > 0 && (
                        <div className="flex flex-col gap-2 mt-2">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold mb-1">Active Scheduled Events:</span>
                          {schedules.map(sch => (
                            <div key={sch.id} className="bg-slate-950 p-3 rounded-lg border border-slate-900 flex justify-between items-center text-xs">
                              <span className="font-semibold text-white truncate max-w-xs">{sch.videoTitle}</span>
                              <div className="flex items-center gap-3 text-slate-500 font-mono text-[10px]">
                                <span>Scheduled: {sch.scheduledTime.replace('T', ' ')}</span>
                                <span className="text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">QUEUED</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              )}

              {/* OBS Studio WebSocket Integration Panel */}
              <ObsWebSocketControl 
                destinations={destinations}
                setDestinations={setDestinations}
                addLog={addLog}
                currentUser={currentUser}
                db={db}
              />

              {/* FFmpeg logs terminal output */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[220px] flex flex-col shadow">
                <div className="bg-slate-920 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="text-amber-500 w-4 h-4" />
                    <span className="text-xs font-mono font-bold text-slate-300">RTMP Signal & Transcoding Event Log</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">low latency buffer active</span>
                </div>
                <div className="flex-1 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed overflow-y-auto flex flex-col gap-1 select-all">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 text-slate-350 border-b border-slate-900/40 pb-0.5">
                      <span className="text-slate-600">[{log.timestamp}]</span>
                      <span className={`text-[9px] px-1 rounded font-bold ${
                        log.level === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                        log.level === 'warn' ? 'bg-rose-500/15 text-rose-450' :
                        log.level === 'error' ? 'bg-rose-600 text-white font-bold' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {log.module}
                      </span>
                      <span className={log.level === 'success' ? 'text-emerald-300/90' : log.level === 'warn' ? 'text-amber-200/95' : 'text-slate-300'}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Global standard unified Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-500 px-6 mt-12 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>StreamSync multi-stream architecture, transcoders sandbox and developer portal. All rights reserved © 2026.</p>
          <div className="flex gap-4 font-mono text-[10px]">
            <span>Express Node Gateway: Active</span>
            <span className="text-slate-700">|</span>
            <span>NGINX RTMP Core: Listening (1935)</span>
            <span className="text-slate-700">|</span>
            <span>Firebase Rules: Protective (ABAC)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
