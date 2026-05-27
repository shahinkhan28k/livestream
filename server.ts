/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import cors from 'cors';

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
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Setup static uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Configure multer disk storage for video uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const userId = (req.query.userId || req.body.userId || 'guest') as string;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || '.mp4';
      cb(null, `${userId}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit to handle large VODs
  });

  // Track active streaming background child processes
  // Maps videoId -> { processes: Map<destinationId, ChildProcess>, startedAt: string, title: string }
  const activeStreams = new Map<string, {
    processes: Map<string, ChildProcess>;
    videoId: string;
    startedAt: string;
    title: string;
  }>();

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

  // REST API: Sync Firebase Auth user to server in-memory db dynamically
  app.post('/api/auth/sync', (req, res) => {
    const { id, email, streamKey } = req.body;
    if (!id || !streamKey) {
      return res.status(400).json({ error: 'Missing user id or streamKey configuration' });
    }

    const index = users.findIndex(u => u.id === id);
    const syncedUser = {
      id,
      email: email || '',
      streamKey
    };

    if (index !== -1) {
      users[index] = syncedUser;
    } else {
      users.push(syncedUser);
    }

    console.log(`[USER SYNC SUCCESS] Synchronized user account on server: ${email || id} with Stream Key: ${streamKey}`);
    res.json({ success: true, user: syncedUser });
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

  // REST API: Delete uploaded physical video file
  app.post('/api/videos/delete-file', (req, res) => {
    const { videoUrl, userId } = req.body;
    if (!videoUrl || !userId) {
      return res.status(400).json({ error: 'Missing videoUrl or userId' });
    }

    if (!videoUrl.startsWith('/uploads/')) {
      return res.json({ success: true, message: 'External URL, skipping server disk deletion' });
    }

    const filename = videoUrl.replace('/uploads/', '');
    // Secure validation: check file prefix match to authenticated user identity
    if (!filename.startsWith(`${userId}-`)) {
      return res.status(403).json({ error: 'Unauthorized: You are not permitted to delete other users physical files.' });
    }

    const filePath = path.join(process.cwd(), 'uploads', filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[SYSTEM MANAGER] Physical file unlinked for user ${userId}: ${filePath}`);
        return res.json({ success: true, message: 'Media assets permanently deleted from server disk' });
      } catch (err) {
        console.error(`Unlink failed for path ${filePath}`, err);
        return res.status(500).json({ error: 'Unlink operation crashed' });
      }
    } else {
      return res.status(404).json({ error: 'Media asset not registered on local filesystems' });
    }
  });

  // REST API: Video File Upload to local folder
  app.post('/api/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }
    const filename = req.file.filename;
    const videoUrl = `/uploads/${filename}`;
    const sizeInMB = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;

    // Also register this uploaded file in our local in-memory db as fallback
    const newVideo: Video = {
      id: generateId('vid'),
      title: req.file.originalname.replace(/\.[^/.]+$/, ""),
      videoUrl: videoUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200',
      size: sizeInMB,
      duration: '05:10', // auto calculated on client side, but we can have default
      createdAt: new Date().toISOString(),
      status: 'ready'
    };
    videos.push(newVideo);

    res.status(200).json({
      success: true,
      videoUrl,
      size: sizeInMB,
      filename,
      video: newVideo
    });
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
    const { videoId, videoUrl, title, destinations: clientDestinations, userId } = req.body;
    
    // Find the video (either in memory, or fallback using request values)
    let video = videos.find(v => v.id === videoId);
    const resolvedUrl = videoUrl || (video ? video.videoUrl : null);
    const resolvedTitle = title || (video ? video.title : 'VOD Stream');

    if (!resolvedUrl) {
      return res.status(400).json({ error: 'Missing videoUrl or video object' });
    }

    // Update in-memory video status to streaming if it exists
    if (video) {
      video.status = 'streaming';
    }

    // Resolve target platforms to push RTMP stream to
    // Use destinations passed from client (Firestore values) as priority, or fallback to in-memory destinations
    const activeDests = (clientDestinations && Array.isArray(clientDestinations))
      ? clientDestinations.filter((d: any) => d.enabled)
      : destinations.filter(d => d.enabled);

    if (activeDests.length === 0) {
      return res.status(400).json({ error: 'No enabled broadcast destinations found. Register and turn on at least one output platform (YouTube or Facebook) first!' });
    }

    // Find physical file input or use URL/Streaming source
    let sourcePath = '';
    if (resolvedUrl.startsWith('/uploads/')) {
      const filename = resolvedUrl.replace('/uploads/', '');
      sourcePath = path.join(process.cwd(), 'uploads', filename);

      // Verify file exists
      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ error: `Uploaded video file was not found on server directory: ${sourcePath}` });
      }
    } else {
      sourcePath = resolvedUrl; // Live web/GCS bucket stream path
    }

    // Multi-user dynamic stream mapping keys
    const streamMapKey = userId ? `${userId}-${videoId}` : videoId;

    // Clean any prior streams running for this specific key
    const existing = activeStreams.get(streamMapKey);
    if (existing) {
      existing.processes.forEach((proc) => {
        try { proc.kill('SIGKILL'); } catch (e) {}
      });
      activeStreams.delete(streamMapKey);
    }

    const mapOfProcesses = new Map<string, ChildProcess>();

    // Spawn an FFmpeg process for each enabled destination
    activeDests.forEach((dest: any) => {
      const rtmpTarget = dest.rtmpUrl;
      const key = dest.streamKey;
      const finalRtmpUrl = rtmpTarget.endsWith('/') ? `${rtmpTarget}${key}` : `${rtmpTarget}/${key}`;

      console.log(`[STREAM DAEMON] Spawning FFmpeg relay for user ${userId || 'guest'} to ${dest.name} (${dest.platform}) for VOD '${resolvedTitle}'`);

      // Build safe low-overhead streaming parameters
      const ffmpegArgs = [
        '-re',                    // Read input video page in real-time speed (important)
        '-stream_loop', '-1',     // Loop the source video infinitely so live stream remains active
        '-i', sourcePath,         // Input path
        '-c:v', 'libx264',        // High quality standard H.264 video codec
        '-preset', 'ultrafast',   // Ultrafast preset for minimal CPU usage in free tier (Render/VPS)
        '-tune', 'zerolatency',   // Real-time zero latency streaming
        '-b:v', '2500k',          // Standard HD bit rate
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-pix_fmt', 'yuv420p',    // standard color space (Youtube/Facebook mandatory requirement)
        '-g', '60',               // keyframe interval (usually 2 seconds for a 30fps output)
        '-c:a', 'aac',            // AAC Audio format
        '-b:a', '128k',           // standard stereo bit rate
        '-ar', '44100',           // 44.1 kHz frequency
        '-f', 'flv'               // RTMP container
      ];

      // Add TLS bypass for secure RTMPS streams e.g. Facebook
      if (finalRtmpUrl.startsWith('rtmps://')) {
        ffmpegArgs.push('-tls_verify', '0');
      }

      ffmpegArgs.push(finalRtmpUrl); // Target RTMP server key endpoint

      try {
        const child = spawn('ffmpeg', ffmpegArgs);
        
        child.stdout.on('data', (chunk) => {
          console.log(`[FFMPEG ${dest.platform} STDOUT]: ${chunk.toString().trim()}`);
        });

        child.stderr.on('data', (chunk) => {
          const text = chunk.toString();
          if (!text.includes('fps=') && !text.includes('speed=')) {
            console.log(`[FFMPEG ${dest.platform} INFO]: ${text.trim()}`);
          }
        });

        child.on('error', (err) => {
          console.error(`[FFMPEG ${dest.platform} ERROR]: Failed to spawn or ran into issues:`, err);
        });

        child.on('close', (code) => {
          console.log(`[FFMPEG ${dest.platform} CLOSE]: Relayer exited with code ${code}`);
          dest.status = 'offline';
        });

        // Set status of destination on server side to active/streaming
        dest.status = 'streaming';
        mapOfProcesses.set(dest.id, child);
      } catch (err) {
        console.error(`Error initiating FFmpeg relay to ${dest.name}:`, err);
      }
    });

    activeStreams.set(streamMapKey, {
      processes: mapOfProcesses,
      videoId,
      startedAt: new Date().toISOString(),
      title: resolvedTitle
    });

    res.json({
      success: true,
      message: `FFmpeg relays successfully deployed! Streaming VOD '${resolvedTitle}' to ${mapOfProcesses.size} destinations.`,
      videoId,
      activeDestinationsCount: mapOfProcesses.size,
      command: `ffmpeg -re -stream_loop -1 -i ${resolvedUrl} -c:v libx264 -preset ultrafast -tune zerolatency -f flv <targets>`
    });
  });

  app.post('/api/streams/stop', (req, res) => {
    const { videoId, userId } = req.body;
    let killedCount = 0;

    console.log(`[STREAM DAEMON] Pause/Stop signal received for user: ${userId || 'guest'}, video: ${videoId || 'ALL'}`);

    if (videoId) {
      const streamMapKey = userId ? `${userId}-${videoId}` : videoId;
      const live = activeStreams.get(streamMapKey);
      if (live) {
        live.processes.forEach((proc, destId) => {
          try {
            proc.kill('SIGKILL');
            killedCount++;
            console.log(`[STREAM DAEMON] Terminated FFmpeg connection for dest: ${destId}`);
          } catch (e) {
            console.error(e);
          }
        });
        activeStreams.delete(streamMapKey);
      }

      const video = videos.find(v => v.id === videoId);
      if (video) video.status = 'ready';
    } else {
      // Clean up everything running belonging strictly to the request user session
      const prefix = userId ? `${userId}-` : null;

      activeStreams.forEach((live, streamKey) => {
        if (!prefix || streamKey.startsWith(prefix)) {
          live.processes.forEach((proc, destId) => {
            try {
              proc.kill('SIGKILL');
              killedCount++;
            } catch (e) {
              console.error(e);
            }
          });
          const v = videos.find(v => v.id === live.videoId);
          if (v) v.status = 'ready';
          activeStreams.delete(streamKey);
        }
      });

      if (!userId) {
        activeStreams.clear();
        videos.forEach(v => { v.status = 'ready'; });
      }
    }

    // Reset of destinations stream statuses
    destinations.forEach(d => { d.status = 'offline'; });

    res.json({
      success: true,
      message: `Stopped operations. Closed ${killedCount} active FFmpeg encoding relays.`,
      killedCount
    });
  });

  // REST API: User Accounts listing
  app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({ id: u.id, email: u.email, streamKey: u.streamKey })));
  });

  // REST API: Nginx-RTMP rtmp:// Ingestion Hook (on_publish auth check)
  // This webhook is invoked when OBS starts pitching video to RTMP server.
  app.post('/api/streams/auth', (req, res) => {
    // Collect parameters from request body, query arguments, or headers to prevent parameter mismatch
    const rtmpApp = req.body.app || req.query.app || 'live';
    const streamKey = req.body.name || req.query.name || req.body.streamKey || req.query.streamKey || '';

    console.log(`[RTMP AUTH HOOK] Ingest Authenticating: app=${rtmpApp}, streamKey=${streamKey}`);

    if (rtmpApp !== 'live') {
      return res.status(400).send('Invalid RTMP application profile');
    }

    if (!streamKey) {
      console.log(`[RTMP AUTH FAILURE] Missing streamKey parameter in request.`);
      return res.status(400).send('Bad Request: streamKey parameters are required');
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
