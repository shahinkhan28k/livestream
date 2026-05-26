/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileNode } from '../types';

export const architecturalFiles: FileNode[] = [
  {
    name: 'transcoder',
    type: 'directory',
    path: '/transcoder',
    children: [
      {
        name: 'nginx.conf',
        type: 'file',
        path: '/transcoder/nginx.conf',
        language: 'nginx',
        description: 'Low-latency RTMP ingestion daemon configured to trigger webhook authentication on Express and handle RTMP relays.',
        content: `# NGINX RTMP Configuration (Relay & Transcode Engine)
user nginx;
worker_processes auto;
rtmp_auto_push on;
events {
    worker_connections 1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # Low latency HTTP-FLV & HLS player support endpoints
    server {
        listen 8080;

        # Serve low latency HLS playlists (.m3u8)
        location /hls {
            types {
                application/vnd.apple.mpegurl m3u8;
                video/mp2t ts;
            }
            root /tmp;
            add_header Cache-Control no-cache;
            add_header Access-Control-Allow-Origin *;
        }

        # Status monitoring
        location /stat {
            rtmp_stat all;
            rtmp_stat_stylesheet stat.xsl;
        }
    }
}

rtmp {
    server {
        listen 1935;
        chunk_size 4000;

        # Primary entry point: OBS/vMix connect to rtmp://<server-ip>/live/<stream-key>
        application live {
            live on;
            record off;

            # 1. AUTHENTICATION WEBHOOK
            # Invoked by Nginx whenever a client connects to stream.
            # Sends a POST query with string 'name' (containing the stream_key).
            # If 200 OK is returned, stream continues. If 4xx is returned, stream disconnects.
            on_publish http://api-server:3000/api/streams/auth;

            # 2. HLS CO-PROCESSING PIPELINE
            # Create HLS TS fragments on disk for dashboard player previews
            hls on;
            hls_path /tmp/hls;
            hls_fragment 2s;
            hls_playlist_length 10s;

            # 3. TRANSCODING SPOK_PIPE (Optional)
            # If standard un-transcoded relay is needed, you can push directly.
            # Usually, you will delegate the relaying to FFmpeg which reads from this RTMP stream.
        }
    }
}
`
      },
      {
        name: 'docker-compose.yml',
        type: 'file',
        path: '/transcoder/docker-compose.yml',
        language: 'yaml',
        description: 'Production orchestrations managing Nginx RTMP container, Transcoding processes, Redis cache, and Node server.',
        content: `version: '3.8'

services:
  # 1. Node/Express REST & Ingest Hook API
  api-server:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - FIREBASE_SERVICE_ACCOUNT=/app/firebase-credential.json
    volumes:
      - shared-data:/tmp/hls
    restart: always

  # 2. Nginx RTMP Server (Direct Ingestion)
  nginx-rtmp:
    image: tiangolo/nginx-rtmp
    ports:
      - "1935:1935" # RTMP Ingress (OBS Port)
      - "8080:8080" # HLS Preview Ports
    volumes:
      - ./transcoder/nginx.conf:/etc/nginx/nginx.conf:ro
      - shared-data:/tmp/hls
    depends_on:
      - api-server
    restart: always

  # 3. Dynamic Trancoder Worker (FFmpeg Core)
  # This container has FFmpeg pre-installed and listens for transcode commands.
  # Express launches transcoding micro-processes within this context.
  rtmp-transcoder:
    build:
      context: ./transcoder
      dockerfile: Dockerfile.ffmpeg
    volumes:
      - shared-data:/tmp/hls
    environment:
      - API_URL=http://api-server:3000
    restart: always

volumes:
  shared-data: {}
`
      },
      {
        name: 'Dockerfile.ffmpeg',
        type: 'file',
        path: '/transcoder/Dockerfile.ffmpeg',
        language: 'dockerfile',
        description: 'Hardened Alpine Linux custom environment containing full-spec FFmpeg binaries with optimized h264/aac codecs.',
        content: `# High-Performance FFmpeg Multi-Relay Base Dockerfile
FROM alpine:3.18

# Install base dependencies and optimized FFmpeg libraries
RUN apk add --no-cache \\
    bash \\
    curl \\
    ffmpeg \\
    tzdata

# Create working directories
WORKDIR /transcoder

# Siphon standard environment variables
ENV NODE_ENV=production

# Provide a shell script to hook and monitor incoming streams
COPY start-worker.sh /transcoder/start-worker.sh
RUN chmod +x /transcoder/start-worker.sh

ENTRYPOINT ["/bin/bash", "/transcoder/start-worker.sh"]
`
      }
    ]
  },
  {
    name: 'backend',
    type: 'directory',
    path: '/backend',
    children: [
      {
        name: 'stream-manager.ts',
        type: 'file',
        path: '/backend/stream-manager.ts',
        language: 'typescript',
        description: 'The controller running node child-processes (`spawn`) to boot physical FFmpeg stream pipelines on-demand.',
        content: `import { spawn, ChildProcess } from 'child_process';
import { db } from './firebase-admin';

// Keep track of active transcoding processes in memory
const activeProcesses = new Map<string, ChildProcess>();

export interface Destination {
  platform: string;
  rtmpUrl: string;
  streamKey: string;
}

/**
 * Spawns an FFmpeg process to consume an incoming RTMP stream and relay it to multiple targets
 * @param userId - Unique streamer identifier
 * @param streamKey - Original Ingest Key
 * @param destinations - Array of target platforms and URLs
 */
export async function spawnTranscodeAndRelay(
  userId: string,
  streamKey: string,
  destinations: Destination[]
) {
  if (activeProcesses.has(userId)) {
    console.log(\`[STREAM-MANAGER] Process already active for user \${userId}. Restarting...\`);
    await stopStreamRelay(userId);
  }

  // Raw RTMP Source
  const sourceUrl = \`rtmp://127.0.0.1/live/\${streamKey}\`;

  // Start building the FFmpeg argument pipeline
  // Simple Relaying (H264 pass-through / Copy codecs to minimize CPU usage)
  const args: string[] = [
    '-loglevel', 'warning',
    '-i', sourceUrl, // Input Source
  ];

  // Map each destination into the stream pipeline using the RTMP FLV format
  destinations.forEach((dest) => {
    const targetUrl = \`\${dest.rtmpUrl}/\${dest.streamKey}\`;
    args.push(
      '-c:v', 'copy',      // Pass-through H264
      '-c:a', 'aac',       // Standard Audio codec
      '-f', 'flv',         // RTMP container
      targetUrl            // Relay Target
    );
  });

  console.log(\`[STREAM-MANAGER] Spawning FFmpeg command: ffmpeg \${args.join(' ')}\`);

  const ffmpegProcess = spawn('ffmpeg', args);

  // Monitor stdout/stderr logs
  ffmpegProcess.stderr?.on('data', (data) => {
    console.warn(\`[FFMPEG USER \${userId}]: \${data.toString().trim()}\`);
  });

  ffmpegProcess.on('exit', (code, signal) => {
    console.log(\`[STREAM-MANAGER] FFmpeg process for \${userId} exited with code \${code} and signal \${signal}\`);
    activeProcesses.delete(userId);
    
    // Update Firebase session status
    db.collection('streams').doc(userId).update({
      active: false,
      endedAt: new Date()
    }).catch(console.error);
  });

  activeProcesses.set(userId, ffmpegProcess);

  // Update Firebase stream status to streaming
  await db.collection('streams').doc(userId).set({
    active: true,
    startedAt: new Date(),
    destinationsCount: destinations.length
  }, { merge: true });
}

/**
 * Forcefully terminates an active stream relay process
 */
export async function stopStreamRelay(userId: string): Promise<boolean> {
  const proc = activeProcesses.get(userId);
  if (!proc) return false;

  console.log(\`[STREAM-MANAGER] Terminating FFmpeg relay process for \${userId}\`);
  const killed = proc.kill('SIGINT'); // Send elegant interrupt (closes streams gracefully)
  activeProcesses.delete(userId);
  return killed;
}
`
      },
      {
        name: 'routes.ts',
        type: 'file',
        path: '/backend/routes.ts',
        language: 'typescript',
        description: 'Routing definitions linking client configuration payloads into Firebase updates.',
        content: `import { Router } from 'express';
import { db } from './firebase-admin';
import { spawnTranscodeAndRelay, stopStreamRelay } from './stream-manager';

const router = Router();

// Hook for adding streaming target destination
router.post('/destinations', async (req, res) => {
  try {
    const { userId, platform, rtmpUrl, streamKey, name } = req.body;
    
    if (!userId || !platform || !rtmpUrl || !streamKey) {
      return res.status(400).json({ error: 'Missing properties in destination payload' });
    }

    const docRef = db.collection('users').doc(userId).collection('destinations').doc();
    const newDest = {
      id: docRef.id,
      platform,
      name: name || \`\${platform} Ingress\`,
      rtmpUrl,
      streamKey,
      enabled: true,
      status: 'offline',
      createdAt: new Date()
    };

    await docRef.set(newDest);
    return res.status(201).json({ success: true, destination: newDest });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// on_publish authorization hook invoked by Nginx
router.post('/streams/auth', async (req, res) => {
  const { name: streamKey } = req.body;

  try {
    // Look up the user owns this stream key in Firestore
    const userSnap = await db.collection('users').where('streamKey', '==', streamKey).get();

    if (userSnap.empty) {
      console.log(\`[AUTH LOG] Ingestion denied. Invalid key: \${streamKey}\`);
      return res.status(401).send('Forbidden: Invalid stream key');
    }

    const userData = userSnap.docs[0].data();
    const userId = userSnap.docs[0].id;

    // Fetch active relay platforms configured as 'enabled'
    const destinationsSnap = await db.collection('users').doc(userId).collection('destinations')
      .where('enabled', '==', true).get();

    const targets = destinationsSnap.docs.map(doc => doc.data() as any);

    console.log(\`[AUTH LOG] Valid key! Initiating relays on \${targets.length} targets...\`);

    // Spawn async FFmpeg process for relaying
    if (targets.length > 0) {
      // Async trigger to not block Nginx RTMP response cycle
      spawnTranscodeAndRelay(userId, streamKey, targets).catch(console.error);
    }

    // Inform Nginx RTMP that authentication passed
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[AUTH ERROR]:', err);
    return res.status(500).send('Internal validation crash');
  }
});

export default router;
`
      }
    ]
  },
  {
    name: 'firebase',
    type: 'directory',
    path: '/firebase',
    children: [
      {
        name: 'firebase-blueprint.json',
        type: 'file',
        path: '/firebase/firebase-blueprint.json',
        language: 'json',
        description: 'Standard declarative data schema detailing Users, Streams, and Destinations layouts.',
        content: `{
  "entities": {
    "users": {
      "title": "User Profile",
      "description": "Secure storage of streaming credentials, email logins, and stream profiles.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "email": { "type": "string", "format": "email" },
        "streamKey": { "type": "string", "description": "Unique secret RTMP ingest stream key." },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "email", "streamKey", "createdAt"]
    },
    "destinations": {
      "title": "Relay Destination",
      "description": "Custom platforms like YouTube or Facebook Live RTMP targets.",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "platform": { "type": "string", "enum": ["youtube", "facebook", "twitch", "custom"] },
        "name": { "type": "string" },
        "rtmpUrl": { "type": "string" },
        "streamKey": { "type": "string", "description": "Client secret key on target platform." },
        "enabled": { "type": "boolean" },
        "createdAt": { "type": "string", "format": "date-time" }
      },
      "required": ["id", "platform", "rtmpUrl", "streamKey", "enabled", "createdAt"]
    }
  },
  "firestore": {
    "/users/{userId}": {
      "schema": "users",
      "description": "Primary user documents"
    },
    "/users/{userId}/destinations/{destId}": {
      "schema": "destinations",
      "description": "Sub-collection of customized multi-streaming platform destinations"
    }
  }
}
`
      },
      {
        name: 'firestore.rules',
        type: 'file',
        path: '/firebase/firestore.rules',
        language: 'javascript',
        description: 'Zero-Trust secure Attribute-Based Access Control security rules preventing payload injection.',
        content: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default Deny safety net
    match /{document=**} {
      allow read, write: if false;
    }

    // Global helper primitives
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() <= 64 && id.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    // Standard User Blueprint validation helper
    function isValidUser(data) {
      return data.id is string 
        && data.email is string 
        && data.email.size() <= 200
        && data.streamKey is string
        && data.createdAt == request.time;
    }

    // Destination validation helper
    function isValidDestination(data) {
      return data.id is string
        && data.platform in ['youtube', 'facebook', 'twitch', 'custom']
        && data.name is string && data.name.size() <= 100
        && data.rtmpUrl is string && data.rtmpUrl.size() <= 500
        && data.streamKey is string && data.streamKey.size() <= 500
        && data.enabled is bool
        && data.createdAt == request.time;
    }

    // 1. Users profile matching
    match /users/{userId} {
      allow get: if isOwner(userId);
      allow create: if isOwner(userId) && isValidUser(request.resource.data);
      // Let user refresh other fields, but lock down streams and key structures
      allow update: if isOwner(userId) 
        && request.resource.data.streamKey == resource.data.streamKey // Lock stream key from spoofing
        && request.resource.data.createdAt == resource.data.createdAt; // Lockdown createdAt
      allow delete: if false; // Protect configuration profiles from accidental cleanups
      
      // 2. Custom sub-collection of destinations
      match /destinations/{destId} {
        allow list, get: if isOwner(userId);
        allow create: if isOwner(userId) && isValidId(destId) && isValidDestination(request.resource.data);
        allow update: if isOwner(userId) 
          && isValidDestination(request.resource.data)
          && request.resource.data.createdAt == resource.data.createdAt // Lock creation timestamp
          && (
            // Partition operations: Toggle switch (joins or disables) or metadata rename
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['enabled']) ||
            request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'rtmpUrl', 'streamKey'])
          );
        allow delete: if isOwner(userId);
      }
    }
  }
}
`
      }
    ]
  }
];
