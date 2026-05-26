/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// In-Memory Database for demonstration and sandbox interactivity
interface User {
  id: string;
  email: string;
  streamKey: string;
}

interface Destination {
  id: string;
  platform: string;
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
  status: string;
}

interface Video {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  size: string;
  duration: string;
  createdAt: string;
  status: 'ready' | 'streaming' | 'processing';
}

interface Schedule {
  id: string;
  videoId: string;
  videoTitle: string;
  scheduledTime: string;
  targetDestinations: string[];
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
}

const users: User[] = [
  { id: 'usr_9x7f2', email: 'shahinkhan28c@gmail.com', streamKey: 'live_738192_x8s9f2p01a' }
];

const destinations: Destination[] = [
  {
    id: 'dst_1',
    platform: 'youtube',
    name: 'YouTube Primary Ingest',
    rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2',
    streamKey: 'yt-xxxx-yyyy-zzzz-1234',
    enabled: true,
    status: 'offline'
  },
  {
    id: 'dst_2',
    platform: 'facebook',
    name: 'Facebook Live Relay',
    rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKey: 'fb-xxxx-yyyy-zzzz-5678',
    enabled: false,
    status: 'offline'
  }
];

const videos: Video[] = [
  {
    id: 'vid_1',
    title: 'Cyberpunk esports compilation 2026',
    videoUrl: 'https://storage.googleapis.com/stream-sync-assets/cyperpunk_esports.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670',
    size: '142.4 MB',
    duration: '04:15',
    createdAt: '2026-05-25T14:32:00Z',
    status: 'ready'
  },
  {
    id: 'vid_2',
    title: 'Multi-stream overlay instructions tutorial',
    videoUrl: 'https://storage.googleapis.com/stream-sync-assets/tutorial_overlay.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564',
    size: '89.1 MB',
    duration: '12:40',
    createdAt: '2026-05-26T09:12:00Z',
    status: 'ready'
  }
];

const schedules: Schedule[] = [
  {
    id: 'sch_1',
    videoId: 'vid_1',
    videoTitle: 'Cyberpunk esports compilation 2026',
    scheduledTime: '2026-05-27T18:00:00Z',
    targetDestinations: ['dst_1'],
    status: 'scheduled'
  }
];

// Helper to generate IDs
const generateId = (prefix: string) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Log middleware for demonstration
  app.use('/api', (req, res, next) => {
    console.log(`[API ${req.method}] ${req.path}`);
    next();
  });

  // REST API: Authentication Simulation
  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user exists
    const existing = users.find(u => u.email === email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser: User = {
      id: generateId('usr'),
      email,
      streamKey: `live_${Math.floor(100000 + Math.random() * 900000)}_${Math.random().toString(36).substring(2, 7)}`
    };

    users.push(newUser);
    res.status(201).json({
      success: true,
      message: 'Account provisioned on Firebase & Auth simulation',
      user: newUser,
      token: `mock_jwt_token_${newUser.id}`
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid user credentials. Register first!' });
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user,
      token: `mock_jwt_token_${user.id}`
    });
  });

  // REST API: Stream Destinations CRUD
  app.get('/api/destinations', (req, res) => {
    res.json(destinations);
  });

  app.post('/api/destinations', (req, res) => {
    const { platform, name, rtmpUrl, streamKey } = req.body;
    if (!platform || !rtmpUrl || !streamKey) {
      return res.status(400).json({ error: 'Missing platform, RTMP URL, or stream key' });
    }

    const newDest: Destination = {
      id: generateId('dst'),
      platform,
      name: name || `${platform.toUpperCase()} Ingress`,
      rtmpUrl,
      streamKey,
      enabled: true,
      status: 'offline'
    };

    destinations.push(newDest);
    res.status(201).json({ success: true, destination: newDest });
  });

  app.put('/api/destinations/:id', (req, res) => {
    const { id } = req.params;
    const { enabled, status } = req.body;
    const dest = destinations.find(d => d.id === id);
    if (!dest) {
      return res.status(404).json({ error: 'Destination not found' });
    }

    if (enabled !== undefined) dest.enabled = !!enabled;
    if (status !== undefined) dest.status = String(status);

    res.json({ success: true, destination: dest });
  });

  app.delete('/api/destinations/:id', (req, res) => {
    const { id } = req.params;
    const index = destinations.findIndex(d => d.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Destination not found' });
    }
    destinations.splice(index, 1);
    res.json({ success: true, message: 'Destination removed' });
  });

  // REST API: Video Assets CRUD
  app.get('/api/videos', (req, res) => {
    res.json(videos);
  });

  app.post('/api/videos', (req, res) => {
    const { title, videoUrl, thumbnailUrl, size, duration } = req.body;
    if (!title || !videoUrl || !thumbnailUrl) {
      return res.status(400).json({ error: 'Missing title, video URL, or thumbnail URL' });
    }

    const newVideo: Video = {
      id: generateId('vid'),
      title,
      videoUrl,
      thumbnailUrl,
      size: size || '45.2 MB',
      duration: duration || '03:30',
      createdAt: new Date().toISOString(),
      status: 'ready'
    };

    videos.push(newVideo);
    res.status(201).json({ success: true, video: newVideo });
  });

  app.delete('/api/videos/:id', (req, res) => {
    const { id } = req.params;
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }
    videos.splice(index, 1);
    res.json({ success: true, message: 'Video asset deleted' });
  });

  // REST API: Stream Scheduling
  app.get('/api/streams/schedule', (req, res) => {
    res.json(schedules);
  });

  app.post('/api/streams/schedule', (req, res) => {
    const { videoId, scheduledTime, targetDestinations } = req.body;
    if (!videoId || !scheduledTime || !targetDestinations) {
      return res.status(400).json({ error: 'Missing videoId, scheduledTime, or targetDestinations' });
    }

    const video = videos.find(v => v.id === videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video asset not found' });
    }

    const newSchedule: Schedule = {
      id: generateId('sch'),
      videoId,
      videoTitle: video.title,
      scheduledTime,
      targetDestinations,
      status: 'scheduled'
    };

    schedules.push(newSchedule);
    res.status(201).json({ success: true, schedule: newSchedule });
  });

  app.post('/api/streams/start-video', (req, res) => {
    const { videoId } = req.body;
    const video = videos.find(v => v.id === videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Mark as streaming
    video.status = 'streaming';
    // Enable active destinations to simulate streaming state
    destinations.forEach(d => {
      if (d.enabled) d.status = 'streaming';
    });

    res.json({ 
      success: true, 
      message: `Dynamic FFmpeg command spawned to stream VOD asset '${video.title}' to active relays.`,
      command: `ffmpeg -re -i ${video.videoUrl} -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -f flv rtmp://127.0.0.1/live/VOD_STREAM`
    });
  });

  app.post('/api/streams/stop', (req, res) => {
    // Stop all streaming
    videos.forEach(v => { v.status = 'ready'; });
    destinations.forEach(d => { d.status = 'offline'; });
    res.json({ success: true, message: 'FFmpeg loops interrupted. Direct video broadcasting halted.' });
  });

  // REST API: User Accounts listing
  app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({ id: u.id, email: u.email, streamKey: u.streamKey })));
  });

  // REST API: Nginx-RTMP rtmp:// Ingestion Hook (on_publish auth check)
  // This webhook is invoked when OBS starts pitching video to RTMP server.
  app.post('/api/streams/auth', (req, res) => {
    const { app: rtmpApp, name: streamKey, swfurl, tcurl, clientid } = req.body;

    // Typically Nginx RTMP sends a POST query string containing the stream key as the "name" parameter
    console.log(`[RTMP AUTH HOOK] Ingest Authenticating: app=${rtmpApp}, streamKey=${streamKey}`);

    if (rtmpApp !== 'live') {
      return res.status(400).send('Invalid RTMP application profile');
    }

    // Verify stream key exists in database
    const validUser = users.find(user => user.streamKey === streamKey);

    if (validUser) {
      console.log(`[RTMP AUTH SUCCESS] Access granted for streamKey. User ID: ${validUser.id}`);
      // Nginx HTTP auth expects 2xx status code to allow stream, or 3xx redirect to modify path.
      return res.status(200).send('OK');
    } else {
      console.log(`[RTMP AUTH DENIED] Invalid streamKey: ${streamKey}`);
      // Return 4xx/5xx to reject stream connection
      return res.status(401).send('Forbidden: Stream key validation failure');
    }
  });

  // REST API: System Transcoder Stats
  app.get('/api/system/stats', (req, res) => {
    // Return fluctuating metrics of ffmpeg / nginx transcoding loads
    const t = Date.now() / 1000;
    const cpuRaw = 45 + Math.sin(t / 10) * 12 + Math.random() * 5;
    const memRaw = 62 + Math.cos(t / 20) * 3 + Math.random() * 0.5;
    
    // Total input/output bandwith
    const activeRelays = destinations.filter(d => d.enabled).length;
    const ingestBandwidthKbps = 4500 + Math.sin(t / 5) * 150 + Math.random() * 50; 
    const egressBandwidthKbps = activeRelays * ingestBandwidthKbps;

    res.json({
      cpuUsage: Math.min(100, Math.max(0, parseFloat(cpuRaw.toFixed(1)))),
      memoryUsage: Math.min(100, Math.max(0, parseFloat(memRaw.toFixed(1)))),
      networkIngestBc: Math.round(ingestBandwidthKbps),
      networkEgressBc: Math.round(egressBandwidthKbps),
      frameDrops: Math.max(0, Math.floor(Math.sin(t / 30) * 4) + (Math.random() > 0.9 ? 1 : 0)),
      ffmpegProcesses: activeRelays + 1 // 1 for master transcode, N for relays
    });
  });

  // REST API: Generate FFmpeg dynamic script
  app.post('/api/streams/transcode', (req, res) => {
    const { renditions, userStreamKey } = req.body;
    
    if (!renditions || !Array.isArray(renditions)) {
      return res.status(400).json({ error: 'Renditions array is required' });
    }

    const key = userStreamKey || 'live_738192_x8s9f2p01a';
    
    // Construct exact shell FFmpeg command payload dynamically
    const inputs = `-i rtmp://127.0.0.1/live/${key}`;
    const activeRenditions = renditions.filter(r => r.enabled);

    if (activeRenditions.length === 0) {
      return res.json({
        command: `ffmpeg ${inputs} -c copy -f flv rtmp://127.0.0.1/relay/youtube && ffmpeg ${inputs} -c copy -f flv rtmp://127.0.0.1/relay/facebook`
      });
    }

    // Dynamic filtering pipelines
    let filterComplex = '';
    let mapsAndOutputs = '';
    
    activeRenditions.forEach((rend, idx) => {
      filterComplex += `[0:v]scale=${rend.resolution} [v_${rend.id}]; `;
      mapsAndOutputs += `-map "[v_${rend.id}]" -c:v:v_${idx} libx264 -b:v:v_${idx} ${rend.videoBitrate} -maxrate:v_${idx} ${rend.videoBitrate} -bufsize:v_${idx} 2M `;
    });

    const outputCommand = `ffmpeg ${inputs} -filter_complex "${filterComplex.trim()}" ${mapsAndOutputs} -c:a aac -b:a 128k -f tee -map 0:a? "[f=flv]rtmp://127.0.0.1/hls/stream"`;

    res.json({
      success: true,
      inputs,
      filters: filterComplex,
      command: outputCommand
    });
  });

  // Vite middleware setup for Development Mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Direct static path resolutions for production distribution
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StreamSync Engine] Full-stack architecture local server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL SERVER BOOT ERROR]:', err);
});
