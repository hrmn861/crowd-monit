import React, { useState } from 'react';
import { TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { ZoneTrendSeries } from '../types.ts';

interface TrendChartProps {
  series: ZoneTrendSeries[];
  timeWindowMinutes?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  series,
  timeWindowMinutes = 15,
}) => {
  const [metric, setMetric] = useState<'count' | 'density'>('count');
  const [activeZone, setActiveZone] = useState<string | 'ALL'>('ALL');

  const zoneColors: Record<string, string> = {
    Z1: '#ef4444', // Red (Lower stairs)
    Z2: '#f59e0b', // Amber (Upper stairs)
    Z3: '#06b6d4', // Cyan (Left walkway)
    Z4: '#10b981', // Emerald (Right walkway)
  };

  // Find max value to calibrate Y-axis
  let maxVal = 10;
  series.forEach((s) => {
    s.data_points.forEach((dp) => {
      const v = metric === 'count' ? dp.count : dp.density;
      if (v > maxVal) maxVal = v;
    });
  });
  maxVal = metric === 'count' ? Math.ceil(maxVal * 1.15) : Number((maxVal * 1.2).toFixed(1));

  // Chart dimensions
  const svgWidth = 840;
  const svgHeight = 240;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const filteredSeries = activeZone === 'ALL'
    ? series
    : series.filter((s) => s.zone_code === activeZone);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
            Recent Telemetry Trends (Last {timeWindowMinutes} Minutes)
          </h3>
        </div>

        {/* Metric & Zone Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setMetric('count')}
              className={`px-2.5 py-1 rounded transition-colors ${
                metric === 'count'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Person Count
            </button>
            <button
              onClick={() => setMetric('density')}
              className={`px-2.5 py-1 rounded transition-colors ${
                metric === 'density'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Density (p/m²)
            </button>
          </div>

          {/* Zone Selector */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setActiveZone('ALL')}
              className={`px-2 py-1 rounded ${
                activeZone === 'ALL' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
              }`}
            >
              All
            </button>
            {series.map((s) => (
              <button
                key={s.zone_code}
                onClick={() => setActiveZone(s.zone_code)}
                className={`px-2 py-1 rounded ${
                  activeZone === s.zone_code ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400'
                }`}
              >
                {s.zone_code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[600px] select-none"
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const y = paddingTop + plotHeight * (1 - ratio);
            const val = metric === 'count' ? Math.round(maxVal * ratio) : (maxVal * ratio).toFixed(1);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Critical Threshold guideline for Z1 Stairs if viewing count */}
          {metric === 'count' && (
            <g>
              <line
                x1={paddingLeft}
                y1={paddingTop + plotHeight * (1 - 65 / maxVal)}
                x2={svgWidth - paddingRight}
                y2={paddingTop + plotHeight * (1 - 65 / maxVal)}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.6"
              />
              <text
                x={svgWidth - paddingRight}
                y={paddingTop + plotHeight * (1 - 65 / maxVal) - 4}
                textAnchor="end"
                fill="#ef4444"
                fontSize="8"
                fontFamily="monospace"
              >
                Z1 Crit Thresh (65)
              </text>
            </g>
          )}

          {/* Polyline series */}
          {filteredSeries.map((s) => {
            const color = zoneColors[s.zone_code] || '#3b82f6';
            const points = s.data_points;
            if (!points || points.length < 2) return null;

            const pathD = points
              .map((p, idx) => {
                const x = paddingLeft + (idx / (points.length - 1)) * plotWidth;
                const val = metric === 'count' ? p.count : p.density;
                const y = paddingTop + plotHeight * (1 - Math.min(val / maxVal, 1));
                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            return (
              <g key={s.zone_code}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Last point dot */}
                {points.length > 0 && (() => {
                  const lastP = points[points.length - 1];
                  const lastX = paddingLeft + plotWidth;
                  const lastVal = metric === 'count' ? lastP.count : lastP.density;
                  const lastY = paddingTop + plotHeight * (1 - Math.min(lastVal / maxVal, 1));
                  return (
                    <circle
                      cx={lastX}
                      cy={lastY}
                      r="4"
                      fill={color}
                      stroke="#09090b"
                      strokeWidth="2"
                    />
                  );
                })()}
              </g>
            );
          })}

          {/* X-Axis baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight}
            x2={svgWidth - paddingRight}
            y2={paddingTop + plotHeight}
            stroke="#3f3f46"
            strokeWidth="1.2"
          />

          {/* X-Axis time markers */}
          <text
            x={paddingLeft}
            y={svgHeight - 12}
            textAnchor="start"
            fill="#71717a"
            fontSize="9"
            fontFamily="monospace"
          >
            -15m
          </text>
          <text
            x={paddingLeft + plotWidth / 2}
            y={svgHeight - 12}
            textAnchor="middle"
            fill="#71717a"
            fontSize="9"
            fontFamily="monospace"
          >
            -7.5m
          </text>
          <text
            x={paddingLeft + plotWidth}
            y={svgHeight - 12}
            textAnchor="end"
            fill="#71717a"
            fontSize="9"
            fontFamily="monospace"
          >
            Now
          </text>
        </svg>
      </div>

      {/* Series Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
        {series.map((s) => {
          const color = zoneColors[s.zone_code] || '#3b82f6';
          return (
            <div
              key={s.zone_code}
              onClick={() => setActiveZone(activeZone === s.zone_code ? 'ALL' : s.zone_code)}
              className={`flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-opacity ${
                activeZone === 'ALL' || activeZone === s.zone_code ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-zinc-300 font-semibold">{s.zone_code}:</span>
              <span className="text-zinc-400">{s.zone_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
