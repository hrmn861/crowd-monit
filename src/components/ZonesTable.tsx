import React from 'react';
import {
  Layers,
  TrendingUp,
  AlertOctagon,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ZoneLiveStatus } from '../types.ts';

interface ZonesTableProps {
  zones: ZoneLiveStatus[];
  onSelectZone?: (zoneCode: string) => void;
  selectedZoneCode?: string;
}

export const ZonesTable: React.FC<ZonesTableProps> = ({
  zones,
  onSelectZone,
  selectedZoneCode,
}) => {
  const getStatusBadge = (status: ZoneLiveStatus['status']) => {
    switch (status) {
      case 'Over Threshold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-red-950/80 text-red-300 border border-red-600/60 animate-pulse">
            <AlertOctagon className="w-3.5 h-3.5" />
            Over Threshold
          </span>
        );
      case 'Busy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-950/80 text-amber-300 border border-amber-600/50">
            <AlertTriangle className="w-3.5 h-3.5" />
            Busy
          </span>
        );
      case 'Normal':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-600/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Normal
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
            Zone Occupancy & Density Status (Single Camera FOV)
          </h2>
        </div>
        <span className="text-xs text-zinc-400 font-mono">
          4 Seeded Viewpoint Zones
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[11px] border-b border-zinc-800">
            <tr>
              <th scope="col" className="px-4 py-3">Zone Code & Name</th>
              <th scope="col" className="px-4 py-3">Area (m²)</th>
              <th scope="col" className="px-4 py-3">Current Count / Cap</th>
              <th scope="col" className="px-4 py-3">Density (p/m²)</th>
              <th scope="col" className="px-4 py-3 min-w-[140px]">Capacity Load (%)</th>
              <th scope="col" className="px-4 py-3">Threshold Status</th>
              <th scope="col" className="px-4 py-3">60s Persistence Watch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {zones.map((zone) => {
              const isSelected = selectedZoneCode === zone.code;
              const isOver = zone.status === 'Over Threshold';

              return (
                <tr
                  key={zone.code}
                  onClick={() => onSelectZone?.(zone.code)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/30'
                      : 'hover:bg-zinc-800/40'
                  }`}
                >
                  {/* Zone Name */}
                  <td className="px-4 py-3.5 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-blue-400">
                        {zone.code}
                      </span>
                      <div>
                        <div className="text-zinc-100 font-semibold">{zone.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                          {zone.description}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Area */}
                  <td className="px-4 py-3.5 font-mono text-zinc-400">
                    {zone.area_sqm.toFixed(1)} m²
                  </td>

                  {/* Current Count & Capacity */}
                  <td className="px-4 py-3.5 font-mono">
                    <div className="text-sm font-bold text-zinc-100">
                      {zone.current_count}
                      <span className="text-xs font-normal text-zinc-500 ml-1">
                        / {zone.capacity}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Warn: {zone.warning_threshold} | Crit: {zone.critical_threshold}
                    </div>
                  </td>

                  {/* Density */}
                  <td className="px-4 py-3.5 font-mono">
                    <div
                      className={`text-sm font-bold ${
                        zone.density > 1.5
                          ? 'text-red-400'
                          : zone.density > 1.0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {zone.density.toFixed(2)}
                      <span className="text-[10px] font-normal text-zinc-500 ml-1">pax/m²</span>
                    </div>
                  </td>

                  {/* Capacity Load Bar */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-zinc-300 font-bold">{zone.capacity_percent}%</span>
                      <span className="text-zinc-500 text-[10px]">
                        {zone.capacity_percent > 100 ? 'Overcap' : 'Safe'}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          zone.capacity_percent >= 80
                            ? 'bg-red-500'
                            : zone.capacity_percent >= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(zone.capacity_percent, 100)}%` }}
                      />
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {getStatusBadge(zone.status)}
                  </td>

                  {/* 60s Persistence Indicator */}
                  <td className="px-4 py-3.5 font-mono text-[11px]">
                    {isOver ? (
                      <div className="flex items-center gap-1.5 text-red-400">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          {zone.over_threshold_seconds >= 60 ? (
                            <span className="font-bold text-red-300">
                              Active (Persisted &gt;60s)
                            </span>
                          ) : (
                            <span>
                              Breach: {zone.over_threshold_seconds}s / 60s
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
                        Within Threshold
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
