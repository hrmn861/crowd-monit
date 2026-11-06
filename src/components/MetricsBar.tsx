import React from 'react';
import { Users, AlertTriangle, ShieldCheck, Gauge, Cpu } from 'lucide-react';
import { ModelType } from '../types.ts';

interface MetricsBarProps {
  totalPeople: number;
  zonesAboveNormal: number;
  totalZones: number;
  activeAlerts: number;
  activeModel: ModelType;
  totalCapacity: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  totalPeople,
  zonesAboveNormal,
  totalZones,
  activeAlerts,
  activeModel,
  totalCapacity,
}) => {
  const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalPeople / totalCapacity) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* Metric 1: Total People */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Total Count (Camera-01)</span>
          <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-zinc-100">{totalPeople}</span>
          <span className="text-xs text-zinc-500 font-mono">/ {totalCapacity} cap</span>
        </div>
        <div className="mt-2 w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overallOccupancyPct > 80
                ? 'bg-red-500'
                : overallOccupancyPct > 60
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(overallOccupancyPct, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-zinc-500 font-mono">
          <span>Overall Load</span>
          <span>{overallOccupancyPct}%</span>
        </div>
      </div>

      {/* Metric 2: Zones Above Normal */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Zones Above Normal</span>
          <div
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              zonesAboveNormal > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold font-mono ${
              zonesAboveNormal > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {zonesAboveNormal}
          </span>
          <span className="text-xs text-zinc-500 font-mono">/ {totalZones} total zones</span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          {zonesAboveNormal === 0 ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> All zones within safety envelope
            </span>
          ) : (
            <span className="text-amber-400">Congestion detected in monitored corridors</span>
          )}
        </p>
      </div>

      {/* Metric 3: Active Alerts Queue */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Active / Confirmed Alerts</span>
          <div
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              activeAlerts > 0
                ? 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold font-mono ${
              activeAlerts > 0 ? 'text-red-400' : 'text-zinc-200'
            }`}
          >
            {activeAlerts}
          </span>
          <span className="text-xs text-zinc-500 font-mono">pending review</span>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          {activeAlerts > 0
            ? '60s persistence verified: review required'
            : 'Zero active breach alerts'}
        </p>
      </div>

      {/* Metric 4: Vision Model Engine */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Vision Inference Engine</span>
          <div
            className={`w-7 h-7 rounded border flex items-center justify-center ${
              activeModel === 'DM-Count'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-zinc-100">{activeModel}</span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {activeModel === 'YOLO' ? 'Object BBox' : 'Density Map'}
          </span>
        </div>
        <div className="mt-2 text-[10px] text-zinc-400 font-mono flex items-center justify-between bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
          <span>Switch at: ≥45 DM-Count</span>
          <span>&lt;35 YOLO</span>
        </div>
      </div>
    </div>
  );
};
