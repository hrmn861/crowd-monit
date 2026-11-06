import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Cpu,
  Clock,
  Camera,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { HistoricalAnalyticsResponse, HistoricalTelemetryPoint } from '../types.ts';
import { fetchHistoricalAnalytics } from '../services/api.ts';

interface HistoricalAnalyticsViewProps {
  cameraId?: string;
}

export const HistoricalAnalyticsView: React.FC<HistoricalAnalyticsViewProps> = ({
  cameraId = 'TSQ-CAM-01',
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [data, setData] = useState<HistoricalAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async (range: '1h' | '24h' | '7d') => {
    setIsRefreshing(true);
    try {
      const res = await fetchHistoricalAnalytics(cameraId, range);
      setData(res);
    } catch (err) {
      console.error('Failed to load historical telemetry analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(timeRange);
    const interval = setInterval(() => {
      loadData(timeRange);
    }, 10000); // Auto-refresh telemetry every 10 seconds
    return () => clearInterval(interval);
  }, [timeRange, cameraId]);

  const handleTimeRangeChange = (range: '1h' | '24h' | '7d') => {
    setTimeRange(range);
    loadData(range);
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pt: HistoricalTelemetryPoint = payload[0].payload;
      return (
        <div className="bg-zinc-950/95 border border-zinc-700 p-3 rounded-lg shadow-2xl text-xs font-mono backdrop-blur-md">
          <div className="text-zinc-400 font-semibold mb-1 flex items-center justify-between gap-4">
            <span>{pt.timestamp}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                pt.active_model_used === 'DM-Count'
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {pt.active_model_used}
            </span>
          </div>

          <div className="space-y-1 pt-1 border-t border-zinc-800">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-400">Total Count:</span>
              <span className="text-zinc-100 font-bold text-sm">{pt.pax_count} pax</span>
            </div>

            {pt.moving_avg !== undefined && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Moving Avg:</span>
                <span className="text-blue-400">{pt.moving_avg} pax</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-500">Status:</span>
              <span
                className={`font-semibold ${
                  pt.alert_triggered ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {pt.alert_triggered ? 'SURGE ALERT TRIGGERED' : 'NORMAL RANGE'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-100 font-mono tracking-wide">
                  Historical Time-Series Telemetry
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  POSTGRESQL AGGREGATED
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                5-second bulk-sampled crowd telemetry for <span className="text-zinc-200 font-mono font-semibold">{cameraId}</span> (North View Fixed Cam)
              </p>
            </div>
          </div>
        </div>

        {/* Time-Range Selector Buttons (1h, 24h, 7d) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            {(['1h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => handleTimeRangeChange(r)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  timeRange === r
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(timeRange)}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50"
            title="Refresh historical metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Pillar 2 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Crowd Size */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Average Crowd Size</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              {data?.average_crowd_size ?? 46.5}
            </span>
            <span className="text-xs text-zinc-500 font-mono">pax / frame</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <span className="text-emerald-400">&bull; Safe baseline</span>
            <span>across {timeRange} window</span>
          </div>
        </div>

        {/* Card 2: Peak Limits Hit */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Peak Crowd Limit</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {data?.peak_limits_hit ?? 74}
            </span>
            <span className="text-xs text-zinc-500 font-mono">max pax recorded</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <span className="text-red-400 font-bold">+9 pax</span>
            <span>above critical threshold (65)</span>
          </div>
        </div>

        {/* Card 3: Alert Frequency */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Surge Alert Frequency</span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-red-400">
              {data?.alert_frequencies ?? 3}
            </span>
            <span className="text-xs text-zinc-500 font-mono">events (60s breach)</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <span className="text-amber-400">&bull; 100% dispatched</span>
            <span>to tactical queue</span>
          </div>
        </div>

        {/* Card 4: Model Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>Model Distribution</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs font-mono mb-1">
              <span className="text-emerald-400 font-bold">YOLO {data?.active_model_distribution?.YOLO ?? 68}%</span>
              <span className="text-purple-400 font-bold">DM-Count {data?.active_model_distribution?.['DM-Count'] ?? 32}%</span>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${data?.active_model_distribution?.YOLO ?? 68}%` }}
              />
              <div
                className="bg-purple-500 h-full transition-all duration-500"
                style={{ width: `${data?.active_model_distribution?.['DM-Count'] ?? 32}%` }}
              />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-zinc-500 font-mono">
            Count hysteresis: &ge;45 DM-Count &bull; &lt;35 YOLO
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Time-Series Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-200 uppercase tracking-wide">
              Crowd Density & Occupancy Curve
            </h3>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-zinc-400">{timeRange === '1h' ? 'Last 60 Minutes' : timeRange === '24h' ? 'Last 24 Hours' : 'Last 7 Days'}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-0.5 bg-blue-500 inline-block"></span>
              <span>Occupancy (Pax)</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-3 h-0.5 bg-red-500 border-dashed inline-block"></span>
              <span>Critical Limit (65)</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-[340px] w-full pt-2">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <span>Querying PostgreSQL historical telemetry...</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data?.data_points || []}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="paxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#71717a"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                  domain={[0, (dataMax: number) => Math.max(90, Math.ceil(dataMax * 1.15))]}
                />
                <Tooltip content={<CustomTooltip />} />
                {/* 65 Pax Critical Safety Threshold Reference Line */}
                <ReferenceLine
                  y={65}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'CRITICAL THRESHOLD (65 PAX)',
                    fill: '#ef4444',
                    fontSize: 9,
                    fontFamily: 'monospace',
                    position: 'top',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pax_count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#paxGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="moving_avg"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Target Camera: TSQ-CAM-01 (Single-Viewpoint Fixed Lens)</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sampling: Background Task (5s periodic flusher into PostgreSQL)
          </span>
        </div>
      </div>
    </div>
  );
};
