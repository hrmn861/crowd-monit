import React, { useState } from 'react';
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  Clock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { ZoneLiveStatus, ZoneTrendSeries, FiveMinuteBaselineData } from '../types.ts';

interface DensityTrendsViewProps {
  zones: ZoneLiveStatus[];
  trendsSeries: ZoneTrendSeries[];
}

export const DensityTrendsView: React.FC<DensityTrendsViewProps> = ({
  zones,
  trendsSeries,
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('Z1');

  // Compute 5-minute baseline data for each zone
  const baselineData: FiveMinuteBaselineData[] = zones.map((z) => {
    const series = trendsSeries.find((s) => s.zone_code === z.code);
    const dataPoints = series?.data_points || [];

    // Use points from 5 minutes ago or average of last 20 points as baseline
    let baselineCount = Math.round(z.capacity * 0.44);
    if (dataPoints.length > 20) {
      const slice5m = dataPoints.slice(-20);
      const sum = slice5m.reduce((acc, p) => acc + p.count, 0);
      baselineCount = Math.round(sum / slice5m.length);
    }

    const currentCount = z.current_count;
    const delta = currentCount - baselineCount;
    const percentChange = baselineCount > 0 ? Number(((delta / baselineCount) * 100).toFixed(1)) : 0;
    const densityBaseline = Number((baselineCount / z.area_sqm).toFixed(2));

    let status: FiveMinuteBaselineData['status'] = 'Steady';
    if (percentChange > 12) status = 'Surge';
    else if (percentChange < -12) status = 'Subsiding';

    return {
      zone_code: z.code,
      zone_name: z.name,
      current_count: currentCount,
      baseline_5m: baselineCount,
      delta,
      percent_change: percentChange,
      density_current: z.density,
      density_baseline: densityBaseline,
      status,
    };
  });

  const activeZoneObj = zones.find((z) => z.code === selectedZone) || zones[0];
  const activeBaseline = baselineData.find((b) => b.zone_code === selectedZone) || baselineData[0];
  const activeSeries = trendsSeries.find((s) => s.zone_code === selectedZone)?.data_points || [];

  // Chart geometry
  const svgWidth = 860;
  const svgHeight = 280;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 40;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    activeZoneObj?.capacity || 80,
    ...activeSeries.map((p) => p.count),
    activeBaseline?.baseline_5m * 1.3 || 50
  );

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Density & Trends Analysis: 5-Minute Baseline Comparison
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Detects rapid velocity surges by comparing instantaneous camera telemetry against rolling 5-minute baseline averages.
          </p>
        </div>

        {/* Zone Selector Pills */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 font-mono text-xs">
          {zones.map((z) => (
            <button
              key={z.code}
              onClick={() => setSelectedZone(z.code)}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                selectedZone === z.code
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="font-bold">{z.code}</span>
              <span className="text-[11px] opacity-75 hidden sm:inline">{z.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4-Zone Baseline Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {baselineData.map((item) => {
          const isSurging = item.status === 'Surge';
          const isSubsiding = item.status === 'Subsiding';

          return (
            <div
              key={item.zone_code}
              onClick={() => setSelectedZone(item.zone_code)}
              className={`bg-zinc-900/90 border rounded-lg p-4 cursor-pointer transition-all shadow-sm ${
                selectedZone === item.zone_code
                  ? 'border-blue-500/80 bg-blue-950/20 ring-1 ring-blue-500/30'
                  : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
                  {item.zone_code}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    isSurging
                      ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                      : isSubsiding
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-2.5">
                <div className="text-xs text-zinc-400 font-medium truncate">{item.zone_name}</div>
                <div className="mt-1 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-mono text-zinc-100">
                      {item.current_count}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono ml-1">pax</span>
                  </div>

                  {/* Delta indicator */}
                  <div
                    className={`flex items-center text-xs font-mono font-bold ${
                      item.delta > 0
                        ? 'text-red-400'
                        : item.delta < 0
                        ? 'text-emerald-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {item.delta > 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : item.delta < 0 ? (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {item.delta > 0 ? `+${item.delta}` : item.delta} ({item.percent_change > 0 ? `+${item.percent_change}` : item.percent_change}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Baseline stats comparison */}
              <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] font-mono grid grid-cols-2 gap-2 text-zinc-400">
                <div>
                  <span className="text-zinc-500 text-[10px] block">5m Baseline</span>
                  <span className="text-zinc-200">{item.baseline_5m} pax</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Density vs Base</span>
                  <span className="text-zinc-200">
                    {item.density_current.toFixed(2)} / {item.density_baseline.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Comparative Baseline Chart for Selected Zone */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              {activeZoneObj?.code}: {activeZoneObj?.name} — Real-Time Telemetry vs 5-Minute Baseline Curve
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Dashed line represents rolling 5-minute baseline benchmark ({activeBaseline?.baseline_5m} pax)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-blue-500 rounded-full inline-block" />
              <span className="text-zinc-300">Live Reading ({activeBaseline?.current_count} pax)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-purple-400 inline-block" />
              <span className="text-purple-300">5-Min Baseline ({activeBaseline?.baseline_5m} pax)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 border-b-2 border-dashed border-red-500 inline-block" />
              <span className="text-red-400">Crit Limit ({activeZoneObj?.critical_threshold} pax)</span>
            </div>
          </div>
        </div>

        {/* SVG Curve */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[650px] select-none">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = padTop + plotH * (1 - ratio);
              const val = Math.round(maxVal * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#27272a"
                    strokeWidth="1"
                    strokeDasharray="2 3"
                  />
                  <text x={padLeft - 8} y={y + 3} textAnchor="end" fill="#71717a" fontSize="9" fontFamily="monospace">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Critical Threshold Line */}
            {activeZoneObj && (
              <g>
                <line
                  x1={padLeft}
                  y1={padTop + plotH * (1 - activeZoneObj.critical_threshold / maxVal)}
                  x2={svgWidth - padRight}
                  y2={padTop + plotH * (1 - activeZoneObj.critical_threshold / maxVal)}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                <text
                  x={svgWidth - padRight}
                  y={padTop + plotH * (1 - activeZoneObj.critical_threshold / maxVal) - 4}
                  textAnchor="end"
                  fill="#ef4444"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  Critical Threshold ({activeZoneObj.critical_threshold})
                </text>
              </g>
            )}

            {/* 5-Minute Baseline Horizontal Curve */}
            {activeBaseline && (
              <g>
                <line
                  x1={padLeft}
                  y1={padTop + plotH * (1 - activeBaseline.baseline_5m / maxVal)}
                  x2={svgWidth - padRight}
                  y2={padTop + plotH * (1 - activeBaseline.baseline_5m / maxVal)}
                  stroke="#c084fc"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft + 6}
                  y={padTop + plotH * (1 - activeBaseline.baseline_5m / maxVal) - 4}
                  fill="#c084fc"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  Rolling 5m Baseline: {activeBaseline.baseline_5m} pax
                </text>
              </g>
            )}

            {/* Actual Live Reading Path */}
            {activeSeries.length > 1 && (() => {
              const d = activeSeries
                .map((p, idx) => {
                  const x = padLeft + (idx / (activeSeries.length - 1)) * plotW;
                  const y = padTop + plotH * (1 - Math.min(p.count / maxVal, 1));
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ');

              return (
                <path
                  d={d}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })()}

            {/* X-Axis labels */}
            <line x1={padLeft} y1={padTop + plotH} x2={svgWidth - padRight} y2={padTop + plotH} stroke="#3f3f46" strokeWidth="1" />
            <text x={padLeft} y={svgHeight - 12} fill="#71717a" fontSize="9" fontFamily="monospace">
              -15 min
            </text>
            <text x={padLeft + plotW * (10 / 15)} y={svgHeight - 12} fill="#c084fc" fontSize="9" fontFamily="monospace">
              -5 min (Baseline Window)
            </text>
            <text x={padLeft + plotW} y={svgHeight - 12} textAnchor="end" fill="#71717a" fontSize="9" fontFamily="monospace">
              Now
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
