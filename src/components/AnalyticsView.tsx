/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  BarChart3, 
  Activity, 
  Tv, 
  Users, 
  Clock, 
  TrendingUp, 
  Globe, 
  Zap, 
  RefreshCw 
} from 'lucide-react';

interface AnalyticsViewProps {
  statsHistory: { cpu: number[]; ingest: number[]; egress: number[] };
  isIngesting: boolean;
  activeDestinationsCount: number;
}

export function AnalyticsView({ statsHistory, isIngesting, activeDestinationsCount }: AnalyticsViewProps) {
  
  // Calculate simulated views and statistics based on currently streaming/historical records
  const calculatedViews = useMemo(() => {
    let base = 12480;
    if (isIngesting) {
      base += Math.floor(Math.random() * 450);
    }
    return base;
  }, [isIngesting]);

  const streamViewsHistory = useMemo(() => {
    // Generate simple grid paths for SVG Area rendering
    const points = statsHistory.cpu; // use cpu values as visual variance
    const width = 600;
    const height = 150;
    const padding = 10;
    const maxVal = 100;
    
    const coordinates = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val / maxVal) * (height - padding * 2)) - padding;
      return { x, y };
    });

    const linePath = coordinates.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = coordinates.length > 0
      ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${height} L ${coordinates[0].x.toFixed(1)} ${height} Z`
      : '';

    return { linePath, areaPath };
  }, [statsHistory.cpu]);

  const egressBandwidthHistory = useMemo(() => {
    const points = statsHistory.egress;
    const width = 600;
    const height = 150;
    const padding = 10;
    const maxVal = Math.max(...points, 20000);
    
    const coordinates = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val / maxVal) * (height - padding * 2)) - padding;
      return { x, y };
    });

    const linePath = coordinates.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    const areaPath = coordinates.length > 0
      ? `${linePath} L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${height} L ${coordinates[0].x.toFixed(1)} ${height} Z`
      : '';

    return { linePath, areaPath };
  }, [statsHistory.egress]);

  return (
    <div id="analytics-view" className="flex flex-col gap-6 animate-fade-in">
      
      {/* Title */}
      <div>
        <span className="text-[10px] tracking-widest font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-semibold">
          Platform-Wide Reports
        </span>
        <h2 className="text-xl font-bold text-white mt-1 border-b border-slate-800 pb-3">Streaming Analytics & KPI Dashboard</h2>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Views Recorded", val: calculatedViews.toLocaleString(), sub: isIngesting ? "+82 users loading live" : "Static archive count", icon: Users, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
          { label: "Stream Duration (VOD/Live)", val: isIngesting ? "Continuous Active" : "14h:32m total", sub: "Accumulated daily cycle", icon: Clock, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Active Live Outlets", val: activeDestinationsCount, sub: `${activeDestinationsCount} in egress relays`, icon: Tv, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Delivery Success Rate", val: "99.85%", sub: "0% transcode frame drops", icon: Zap, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" }
        ].map((card, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-md">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono uppercase text-slate-500">{card.label}</span>
              <span className="text-xl font-bold text-white font-mono tracking-tight">{card.val}</span>
              <span className="text-[10px] text-slate-400">{card.sub}</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${card.color} hidden sm:block`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Double Column Graph Plots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Concurrent viewers simulation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-slate-400">Concurrent viewers timeline (live proxy)</h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              <TrendingUp className="w-3 h-3" />
              Live update
            </span>
          </div>

          <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-900 overflow-hidden relative">
            {/* SVG Plot */}
            <svg viewBox="0 0 600 150" className="w-full h-[160px] overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={streamViewsHistory.areaPath} fill="url(#areaGrad)" />
              <path d={streamViewsHistory.linePath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-3/5 mt-1 border-t border-slate-900 pt-1.5">
              <span>-25 minutes ago</span>
              <span>-12 minutes ago</span>
              <span>Active Peak Now</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Traces the real-time engagement rate of clients reading HLS streams. Re-renders automatically as new telemetry triggers.
          </p>
        </div>

        {/* Graph 2: Transcoder Multi-cast bandwidth egress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-wider font-mono font-semibold text-slate-400">Egress Relay Bandwith (kbps)</h3>
            <span className="text-[10px] font-mono text-blue-400 flex items-center gap-1 bg-blue-500/10 px-1.5 py-0.5 rounded">
              <Activity className="w-3 h-3 animate-pulse" />
              Relay pipeline
            </span>
          </div>

          <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-900 overflow-hidden relative">
            <svg viewBox="0 0 600 150" className="w-full h-[160px] overflow-visible">
              <defs>
                <linearGradient id="areaGradEgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={egressBandwidthHistory.areaPath} fill="url(#areaGradEgress)" />
              <path d={egressBandwidthHistory.linePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-3/5 mt-1 border-t border-slate-900 pt-1.5">
              <span>Idle load</span>
              <span>Buffer allocation</span>
              <span>{isIngesting ? "Multi-relay delivery" : "In-Memory sync"}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Illustrates the output bandwidth multiplexing rate. Bandwidth spikes linearly on each enabled social destination targets.
          </p>
        </div>

      </div>

      {/* Target Platforms views splits */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Relayed Platforms Share Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">Statistical share ratios computed historical logs analysis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "YouTube Gaming Live", pct: 52, color: "bg-red-500", rawVal: "6,489 views" },
            { name: "Facebook Gaming Network", pct: 31, color: "bg-blue-500", rawVal: "3,868 views" },
            { name: "Twitch / Custom RTMP rel", pct: 17, color: "bg-purple-500", rawVal: "2,123 views" }
          ].map((plt, idx) => (
            <div key={idx} className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{plt.name}</span>
                <span className="font-mono text-slate-400 font-bold">{plt.pct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full ${plt.color} rounded-full`} style={{ width: `${plt.pct}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 font-mono">{plt.rawVal} authenticated</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
