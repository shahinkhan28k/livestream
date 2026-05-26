/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Tv, 
  Radio, 
  ArrowRight, 
  Layers, 
  Lock, 
  Gauge, 
  Monitor, 
  Clock, 
  Server,
  Zap
} from 'lucide-react';
import { AppUser } from '../types';

interface HomeViewProps {
  currentUser: AppUser | null;
  onNavigate: (page: 'home' | 'login' | 'signup' | 'dashboard') => void;
  onlineTelem: { cpu: number; mem: number; activeStreams: number };
}

export function HomeView({ currentUser, onNavigate, onlineTelem }: HomeViewProps) {
  return (
    <div id="home-view" className="flex flex-col gap-12 py-6 animate-fade-in">
      
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
        
        <div className="max-w-3xl flex flex-col gap-6 relative z-10">
          <span className="self-start text-[10px] tracking-widest font-mono text-amber-500 uppercase bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded">
            Next-Gen Multi-Relay Engine
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stream Your Feed Instantly to <span className="text-amber-500">Every Platform</span> Simultaneously.
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Connect OBS, vMix, or upload video files directly. StreamSync parses and transcodes your media with zero noticeable overhead, relaying adaptive HD feeds to YouTube, Facebook, Twitch, and custom RTMP destinations in parallel.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
            {currentUser ? (
              <button
                id="btn-home-portal"
                onClick={() => onNavigate('dashboard')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
              >
                Enter Stream Control Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  id="btn-home-signup"
                  onClick={() => onNavigate('signup')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
                >
                  Create Ingress Account
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  id="btn-home-login"
                  onClick={() => onNavigate('login')}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg border border-slate-700 transition"
                >
                  Existing Member login
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Real-time Status Counter Banner */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Nodes", val: "Nginx-RTMP v1.23", desc: "Daemon listening on Port 1935" },
          { label: "Server CPU Load", val: `${onlineTelem.cpu}%`, desc: "Automated FFmpeg transcoder load" },
          { label: "Active Streams", val: onlineTelem.activeStreams, desc: "Active dynamic outward relays" },
          { label: "Firebase Connectivity", val: "Online (Verified)", desc: "ABAC security rules fully protective" }
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-500">{stat.label}</span>
            <span className="text-lg font-bold text-white font-mono tracking-tight">{stat.val}</span>
            <span className="text-[10px] text-slate-400">{stat.desc}</span>
          </div>
        ))}
      </section>

      {/* Feature Showcase Grid */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-500" />
            Core Ingestion Specs & Architectural Capabilities
          </h2>
          <p className="text-sm text-slate-400 mt-1">Multi-casting live streaming built around zero-trust networks and real-time transcoders.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-amber-500 self-start">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Dynamic HD Transcoding</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Express controls backend FFmpeg clusters to automatically scale 1080p source streams down into 720p or 480p adaptive bitrate versions. Stream pass-through copies are routed with lower computational overhead.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-400 self-start">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Secure Firebase Auth & RBAC</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides absolute security for stream keys. Our Cloud Firestore security policies forbid external lookup of other streamers configurations and authenticate connection streams directly inside backend Nginx configurations.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
            <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-blue-400 self-start">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">VOD to Live Scheduling</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upload video assets (MP4 formats) and schedule broadcasts for later. Our automated server loop spins up virtual RTMP devices to broadcast saved content seamlessly as if it was a real live feed.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Pipeline Stack */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
            <Server className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Looking for the Server Side Setup?</h3>
            <p className="text-xs text-slate-400 mt-1">Simulate vulnerability attacks, explore Nginx configs, and test direct API endpoints in the developer tabs inside the Admin Panel!</p>
          </div>
        </div>
        <button 
          id="btn-home-dev"
          onClick={() => currentUser ? onNavigate('dashboard') : onNavigate('login')}
          className="bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded border border-slate-700 hover:bg-slate-705 transition shrink-0"
        >
          Access Sandbox Developer Console
        </button>
      </section>

    </div>
  );
}
