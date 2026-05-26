/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'architecture' | 'dashboard' | 'files' | 'api' | 'firebase';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
  description?: string;
}

export interface StreamDestination {
  id: string;
  platform: 'youtube' | 'facebook' | 'twitch' | 'custom';
  name: string;
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
  status: 'offline' | 'connecting' | 'streaming' | 'error';
  errorMessage?: string;
}

export interface TranscodeRendition {
  id: string;
  name: string;
  resolution: string;
  videoBitrate: string;
  audioBitrate: string;
  fps: number;
  enabled: boolean;
}

export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  networkIngestBc: number; // in kbps
  networkEgressBc: number; // in kbps
  frameDrops: number;
  ffmpegProcesses: number;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  payload?: string;
  headers?: Record<string, string>;
  category: 'authentication' | 'destinations' | 'rtmp-hook' | 'system';
}

export interface IngestLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  module: 'NGINX-RTMP' | 'FFMPEG' | 'EXPRESS-API' | 'FIREBASE-STORE' | 'CLIENT';
  message: string;
}

export interface VideoAsset {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  size: string;
  duration: string;
  createdAt: string;
  status: 'ready' | 'streaming' | 'processing';
}

export interface ScheduledStream {
  id: string;
  videoId: string;
  videoTitle: string;
  scheduledTime: string;
  targetDestinations: string[]; // Destination IDs
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
}

export interface AppUser {
  id: string;
  email: string;
  streamKey: string;
  name?: string;
  createdAt?: string;
}

