import React, { useState, useEffect } from 'react';
import {
  Camera,
  Activity,
  Cpu,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Clock,
  Film,
  Zap,
} from 'lucide-react';
import { CameraHealthStats } from '../types.ts';
import { TIMES_SQUARE_SITE } from '../config/zones.ts';

export const CameraHealthView: React.FC = () => {
  const [stats, setStats] = useState<CameraHealthStats>({
    camera_id: TIMES_SQUARE_SITE.viewpointId,
    source_file: TIMES_SQUARE_SITE.sourceVideoName,
    status: 'OPTIMAL',
    current_fps: 29.8,
    target_fps: 30.0,
    frame_age_ms: 32,
    dropped_frames: 14,
    total_frames_processed: 38420,
    dropped_percent: 0.036,
    bitrate_mbps: 18.6,
    resolution: '3840 x 2160 (4K UHD)',
    decoder: 'OpenCV VideoCapture / FFmpeg HWAccel',
    uptime_seconds: 1280,
    last_sync_timestamp: new Date().toISOString(),
  });

  const [fpsHistory, setFpsHistory] = useState<number[]>([
    29.9, 30.0, 29.8, 29.7, 30.0, 29.9, 29.8, 29.9, 29.8, 29.7,
  ]);

  // Simulate real-time jitter updates
  useEffect(() => {
    const interval = setInterval(() => {
      const jitterFps = Number((29.6 + Math.random() * 0.4).toFixed(1));
      const jitterAge = Math.floor(28 + Math.random() * 8);

      setStats((prev) => {
        const newTotal = prev.total_frames_processed + 30;
        const addDrop = Math.random() > 0.85 ? 1 : 0;
        const newDropped = prev.dropped_frames + addDrop;
        return {
          ...prev,
          current_fps: jitterFps,
          frame_age_ms: jitterAge,
          total_frames_processed: newTotal,
          dropped_frames: newDropped,
          dropped_percent: Number(((newDropped / newTotal) * 100).toFixed(3)),
          uptime_seconds: prev.uptime_seconds + 1,
          last_sync_timestamp: new Date().toISOString(),
        };
      });

      setFpsHistory((prev) => [...prev.slice(1), jitterFps]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Single-Camera Hardware & Stream Health (TSQ-CAM-01)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time pipeline diagnostics monitoring frame age latency, optical throughput (FPS), and dropped frame ratio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-600/50 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PIPELINE HEALTHY</span>
          </div>
        </div>
      </div>

      {/* Core Diagnostic Metric Cards (FPS, Frame Age, Dropped Frames) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: FPS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 font-mono uppercase">
              Current Framerate
            </span>
            <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-100">
              {stats.current_fps}
            </span>
            <span className="text-xs font-mono text-zinc-400">/ {stats.target_fps} Target FPS</span>
          </div>

          <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(stats.current_fps / stats.target_fps) * 100}%` }}
            />
          </div>

          {/* Mini Sparkline for FPS */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>FPS Stability: 99.4%</span>
            <span>Jitter: &plusmn;0.2 fps</span>
          </div>
        </div>

        {/* Metric 2: Frame Age (Latency) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 font-mono uppercase">
              Frame Age / Latency
            </span>
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-100">
              {stats.frame_age_ms}
            </span>
            <span className="text-xs font-mono text-zinc-400">ms (Glass-to-Inference)</span>
          </div>

          <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.frame_age_ms > 100
                  ? 'bg-red-500'
                  : stats.frame_age_ms > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((stats.frame_age_ms / 100) * 100, 100)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Max Tolerance: 150ms</span>
            <span className="text-emerald-400">Ultra-Low Latency</span>
          </div>
        </div>

        {/* Metric 3: Dropped Frames */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 font-mono uppercase">
              Dropped Frames
            </span>
            <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-100">
              {stats.dropped_frames}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              ({stats.dropped_percent.toFixed(3)}%)
            </span>
          </div>

          <div className="mt-3 w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(stats.dropped_percent * 50, 100)}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Processed: {stats.total_frames_processed.toLocaleString()}</span>
            <span className="text-emerald-400">&lt; 0.1% SLA Target</span>
          </div>
        </div>
      </div>

      {/* Hardware & Stream Technical Specifications */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-blue-400" />
          Ingest Pipeline Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block">Video Source Stream</span>
            <span className="text-zinc-200 font-bold mt-1 block truncate">
              {stats.source_file}
            </span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block">Native Resolution</span>
            <span className="text-zinc-200 font-bold mt-1 block">{stats.resolution}</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block">Network Bitrate</span>
            <span className="text-zinc-200 font-bold mt-1 block">{stats.bitrate_mbps} Mbps (VBR)</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800">
            <span className="text-zinc-500 text-[10px] uppercase block">Stream Uptime</span>
            <span className="text-emerald-400 font-bold mt-1 block">
              {formatUptime(stats.uptime_seconds)}
            </span>
          </div>
        </div>

        {/* Decoder Pipeline Diagnostics */}
        <div className="mt-4 p-3.5 bg-zinc-950 rounded border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Decoder Driver: <strong className="text-zinc-200">{stats.decoder}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>Buffer Occupancy: <strong className="text-emerald-400">18.2%</strong> (Safe Margin)</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Sync: {new Date(stats.last_sync_timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};
