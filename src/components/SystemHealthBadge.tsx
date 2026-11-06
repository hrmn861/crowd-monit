import React, { useState, useEffect } from 'react';
import { Activity, Gauge, Server, Cpu } from 'lucide-react';
import { fetchSystemHealth } from '../services/api.ts';
import { SystemHealthData } from '../types.ts';

export const SystemHealthBadge: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData>({
    fps: 30.0,
    inference_latency_ms: 12.4,
    cpu_percent: 18.2,
    memory_percent: 42.5,
    active_connections: 1,
    status: 'OPERATIONAL',
    active_model: 'YOLO',
  });

  useEffect(() => {
    let isMounted = true;
    const loadHealth = async () => {
      try {
        const data = await fetchSystemHealth();
        if (isMounted) setHealth(data);
      } catch {
        // Fallback
      }
    };

    loadHealth();
    const interval = setInterval(loadHealth, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const isDegraded = health.status === 'DEGRADED' || health.fps < 12;

  return (
    <div
      className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${
        isDegraded
          ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300'
      }`}
      title={`System Telemetry: CPU ${health.cpu_percent}% | RAM ${health.memory_percent}% | Active Connections: ${health.active_connections}`}
    >
      <div className="flex items-center gap-1">
        <Gauge className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] text-zinc-400">FPS:</span>
        <span className="font-bold text-zinc-100">{health.fps.toFixed(1)}</span>
      </div>

      <span className="text-zinc-700">|</span>

      <div className="flex items-center gap-1">
        <Activity className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] text-zinc-400">LAT:</span>
        <span className="font-bold text-zinc-100">{health.inference_latency_ms.toFixed(1)}ms</span>
      </div>

      <span className="text-zinc-700">|</span>

      <div className="flex items-center gap-1">
        <Cpu className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] text-zinc-400">CPU:</span>
        <span className="font-bold text-emerald-300">{health.cpu_percent}%</span>
      </div>
    </div>
  );
};
