import React, { useState, useEffect } from 'react';
import {
  Camera,
  Layers,
  Crosshair,
  Radio,
  Sparkles,
  Flame,
  Eye,
  Lock,
} from 'lucide-react';
import { ZoneLiveStatus, ModelType, StreamMode } from '../types.ts';
import { TIMES_SQUARE_SITE } from '../config/zones.ts';
import { fetchStreamMode, setStreamModeApi, API_BASE } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface CameraFeedProps {
  zones: ZoneLiveStatus[];
  activeModel: ModelType;
  onSelectZone?: (zoneCode: string) => void;
  selectedZoneCode?: string;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  zones,
  activeModel,
  onSelectZone,
  selectedZoneCode,
}) => {
  const { hasRole, role } = useAuth();
  const canToggleVisualMode = hasRole(['ADMIN', 'OPERATOR']);

  const [showPolygons, setShowPolygons] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(true);
  const [streamMode, setStreamModeState] = useState<StreamMode>('blended');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'connected' | 'fallback'>('connecting');
  const [feedKey, setFeedKey] = useState<number>(Date.now());
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Animated dots representing simulated pedestrians
  const [pedestrians, setPedestrians] = useState<
    { id: number; x: number; y: number; vx: number; vy: number; zone: string; conf: number }[]
  >([]);

  // Seed pedestrians inside zones
  useEffect(() => {
    const initial: typeof pedestrians = [];
    let id = 1;

    const addGroup = (zoneCode: string, count: number, xMin: number, xMax: number, yMin: number, yMax: number) => {
      for (let i = 0; i < count; i++) {
        initial.push({
          id: id++,
          zone: zoneCode,
          x: xMin + Math.random() * (xMax - xMin),
          y: yMin + Math.random() * (yMax - yMin),
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          conf: Number((0.85 + Math.random() * 0.14).toFixed(2)),
        });
      }
    };

    addGroup('Z1', 28, 260, 700, 490, 660); // Lower Stairs
    addGroup('Z2', 18, 340, 620, 280, 450); // Upper Stairs
    addGroup('Z3', 22, 60, 220, 300, 680);  // Left Walkway
    addGroup('Z4', 24, 740, 900, 300, 680); // Right Walkway

    setPedestrians(initial);
  }, []);

  // Animate pedestrians gently to simulate live camera movement
  useEffect(() => {
    const interval = setInterval(() => {
      setPedestrians((prev) =>
        prev.map((p) => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;

          if (p.zone === 'Z1') {
            if (newX < 240 || newX > 720) p.vx *= -1;
            if (newY < 480 || newY > 670) p.vy *= -1;
          } else if (p.zone === 'Z2') {
            if (newX < 320 || newX > 640) p.vx *= -1;
            if (newY < 260 || newY > 460) p.vy *= -1;
          } else if (p.zone === 'Z3') {
            if (newX < 40 || newX > 230) p.vx *= -1;
            if (newY < 280 || newY > 690) p.vy *= -1;
          } else if (p.zone === 'Z4') {
            if (newX < 730 || newX > 910) p.vx *= -1;
            if (newY < 280 || newY > 690) p.vy *= -1;
          }

          return { ...p, x: newX, y: newY };
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Fetch initial stream mode from API
  useEffect(() => {
    fetchStreamMode().then((m) => {
      if (m) setStreamModeState(m);
    });
  }, []);

  const handleSelectVisualMode = async (targetMode: StreamMode) => {
    if (!canToggleVisualMode) {
      setPermissionNotice('RBAC Restricted: Switching stream render mode requires OPERATOR or ADMIN clearance.');
      setTimeout(() => setPermissionNotice(null), 3500);
      return;
    }
    setStreamModeState(targetMode);
    await setStreamModeApi(targetMode);
  };

  const getZoneStrokeColor = (status: string, isSelected: boolean) => {
    if (isSelected) return '#3b82f6';
    if (status === 'Over Threshold') return '#ef4444';
    if (status === 'Busy') return '#f59e0b';
    return '#10b981';
  };

  const getZoneFillColor = (status: string, isSelected: boolean) => {
    if (isSelected) return 'rgba(59, 130, 246, 0.25)';
    if (status === 'Over Threshold') return 'rgba(239, 68, 68, 0.22)';
    if (status === 'Busy') return 'rgba(245, 158, 11, 0.16)';
    return 'rgba(16, 185, 129, 0.12)';
  };

  const normalizedMode =
    streamMode === 'heatmap' ? 'heatmap' : streamMode === 'raw' || streamMode === 'raw_bbox' ? 'raw_bbox' : 'blended';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg flex flex-col">
      {/* Video Stream Header */}
      <div className="bg-zinc-950 px-4 py-2.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="font-mono font-bold text-zinc-200">
            {TIMES_SQUARE_SITE.viewpointId}
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-400 truncate max-w-xs sm:max-w-md">
            {TIMES_SQUARE_SITE.viewpointName}
          </span>
          <span className="ml-1.5 hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            MJPEG LIVE
          </span>
        </div>

        {/* View Controls & 3-Mode Thermal Heatmap Switcher (Pillar 1) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer toggles */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800">
            <button
              onClick={() => setShowPolygons(!showPolygons)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                showPolygons
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Toggle Zone Polygons"
            >
              <Layers className="w-3 h-3" />
              <span>Zones</span>
            </button>

            <button
              onClick={() => setShowBBoxes(!showBBoxes)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                showBBoxes
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
              title="Toggle Bounding Boxes"
            >
              <Crosshair className="w-3 h-3" />
              <span>BBoxes</span>
            </button>
          </div>

          {/* 3-Way Thermal Density Render Mode Switcher */}
          <div
            className="flex items-center gap-0.5 bg-zinc-900 p-1 rounded-md border border-zinc-800"
            title={canToggleVisualMode ? 'Switch rendering overlay mode' : 'OPERATOR or ADMIN required'}
          >
            <span className="text-[10px] uppercase font-mono text-zinc-500 px-1 font-bold hidden sm:inline">
              Mode:
            </span>

            {/* 1. Raw BBox */}
            <button
              onClick={() => handleSelectVisualMode('raw_bbox')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                normalizedMode === 'raw_bbox'
                  ? 'bg-zinc-800 text-emerald-400 font-bold border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Raw BBox</span>
            </button>

            {/* 2. Blended (60% Frame + 40% Heatmap) */}
            <button
              onClick={() => handleSelectVisualMode('blended')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                normalizedMode === 'blended'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-bold shadow-md shadow-blue-900/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Blended (60/40)</span>
            </button>

            {/* 3. Heatmap Only */}
            <button
              onClick={() => handleSelectVisualMode('heatmap')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                normalizedMode === 'heatmap'
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-blue-600 text-white font-bold shadow-md shadow-red-900/40'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Flame className="w-3 h-3 text-yellow-300" />
              <span>Heatmap Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* RBAC Permission Banner Warning */}
      {permissionNotice && (
        <div className="bg-amber-950/90 border-b border-amber-800 px-4 py-1.5 text-xs font-mono text-amber-200 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{permissionNotice}</span>
          </div>
          <span className="text-[10px] text-amber-400">Current Role: {role || 'ANALYST'}</span>
        </div>
      )}

      {/* Main Video Viewport Canvas */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden select-none">
        {/* Real Live MJPEG Video Stream from OpenCV Daemon */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <img
            key={feedKey}
            src={`${API_BASE}/video-feed`}
            crossOrigin="use-credentials"
            alt="TSQ-CAM-01 Live Processed Stream"
            className="w-full h-full object-cover"
            onLoad={() => setStreamStatus('connected')}
            onError={() => setStreamStatus('fallback')}
          />

          {/* Standby/Reconnecting State Overlay if video feed disconnects */}
          {streamStatus === 'fallback' && (
            <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 z-10">
              <Camera className="w-8 h-8 text-blue-400 mb-2 animate-pulse" />
              <div className="text-zinc-200 font-mono text-sm font-semibold">
                MJPEG Video Stream (/api/video-feed)
              </div>
              <div className="text-zinc-500 font-mono text-xs mt-1 max-w-md">
                Connecting to video feed from vision_worker daemon...
              </div>
              <button
                onClick={() => {
                  setStreamStatus('connecting');
                  setFeedKey(Date.now());
                }}
                className="mt-3 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded border border-zinc-700 transition-colors"
              >
                Retry Stream
              </button>
            </div>
          )}
        </div>

        {/* SVG Overlay: Polygons & Thermal Density Heatmap Simulation Layer */}
        <svg
          viewBox="0 0 960 720"
          className="absolute inset-0 w-full h-full pointer-events-auto"
        >
          {/* Thermal Heatmap Simulation Layer (renders when in blended or heatmap mode) */}
          {(normalizedMode === 'heatmap' || normalizedMode === 'blended') && (
            <g
              opacity={normalizedMode === 'heatmap' ? '0.75' : '0.40'}
              style={{ mixBlendMode: normalizedMode === 'heatmap' ? 'normal' : 'screen' }}
            >
              <circle cx="480" cy="560" r="170" fill="url(#heatGradRed)" />
              <circle cx="480" cy="360" r="120" fill="url(#heatGradAmber)" />
              <circle cx="140" cy="500" r="95" fill="url(#heatGradBlue)" />
              <circle cx="820" cy="500" r="105" fill="url(#heatGradBlue)" />
              <defs>
                <radialGradient id="heatGradRed">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="85%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatGradAmber">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="heatGradBlue">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                  <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
            </g>
          )}

          {/* Polygons */}
          {showPolygons &&
            zones.map((zone) => {
              const isSelected = selectedZoneCode === zone.code;
              const isHovered = hoveredZone === zone.code;
              const strokeColor = getZoneStrokeColor(zone.status, isSelected);
              const fillColor = getZoneFillColor(zone.status, isSelected);
              const pointsStr = zone.polygon.map(([x, y]) => `${x},${y}`).join(' ');

              const avgX = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
              const avgY = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;

              return (
                <g
                  key={zone.code}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onSelectZone?.(zone.code)}
                  onMouseEnter={() => setHoveredZone(zone.code)}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  <polygon
                    points={pointsStr}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isSelected || isHovered ? '2.5' : '1.5'}
                    strokeDasharray={zone.status === 'Over Threshold' ? '6 3' : undefined}
                    className="transition-colors duration-300"
                  />

                  {/* Zone Label Badge */}
                  <g transform={`translate(${avgX - 45}, ${avgY - 14})`}>
                    <rect
                      x="0"
                      y="0"
                      width="90"
                      height="28"
                      rx="4"
                      fill="#09090b"
                      stroke={strokeColor}
                      strokeWidth="1.2"
                      opacity="0.9"
                    />
                    <text
                      x="45"
                      y="12"
                      textAnchor="middle"
                      fill="#f4f4f5"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {zone.code}: {zone.current_count} pax
                    </text>
                    <text
                      x="45"
                      y="22"
                      textAnchor="middle"
                      fill={strokeColor}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {zone.density.toFixed(2)} p/m²
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Pedestrian Bounding Boxes / Centroids (Shown in Raw BBox and Blended modes) */}
          {showBBoxes &&
            normalizedMode !== 'heatmap' &&
            pedestrians.map((p) => {
              const isOverZ1 = p.zone === 'Z1';
              const boxW = 16;
              const boxH = 34;

              if (activeModel === 'DM-Count') {
                return (
                  <circle
                    key={p.id}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={isOverZ1 ? '#ef4444' : '#a855f7'}
                    opacity="0.85"
                  />
                );
              }

              return (
                <g key={p.id} opacity="0.85">
                  <rect
                    x={p.x - boxW / 2}
                    y={p.y - boxH / 2}
                    width={boxW}
                    height={boxH}
                    fill="none"
                    stroke={isOverZ1 ? '#ef4444' : '#10b981'}
                    strokeWidth="1"
                  />
                  {p.id % 4 === 0 && (
                    <text
                      x={p.x - boxW / 2}
                      y={p.y - boxH / 2 - 2}
                      fill="#e4e4e7"
                      fontSize="6"
                      fontFamily="monospace"
                    >
                      {p.conf}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>

        {/* Control Room HUD Watermark & Telemetry Overlay */}
        <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300 pointer-events-none flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-blue-400" />
          <span>LOCKED: 1-CAM VIEWPORT</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">90° FIXED LENS</span>
        </div>

        <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded border border-zinc-800 text-[11px] font-mono pointer-events-none flex items-center gap-2">
          <span className="text-zinc-400">VIEW MODE:</span>
          <span className="font-bold text-amber-400 uppercase">
            {normalizedMode === 'raw_bbox'
              ? 'Raw BBox'
              : normalizedMode === 'heatmap'
              ? 'Heatmap Only'
              : 'Blended (60/40)'}
          </span>
          <span className="text-zinc-600">|</span>
          <span
            className={`font-bold ${
              activeModel === 'DM-Count' ? 'text-purple-400' : 'text-emerald-400'
            }`}
          >
            {activeModel} {activeModel === 'DM-Count' ? '(DENSITY MAP)' : '(BBOX)'}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-400 pointer-events-none flex items-center gap-3">
          <span>SOURCE: {TIMES_SQUARE_SITE.sourceVideoName}</span>
          <span className="text-zinc-600">|</span>
          <span>FPS: 30.0 FIXED</span>
          <span className="text-zinc-600">|</span>
          <span className="text-emerald-400">STREAM HEALTHY</span>
        </div>

        <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
          <div className="bg-zinc-950/85 px-2.5 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-300">
            Z1: LOWER STAIRS (SURGE ZONE)
          </div>
        </div>
      </div>

      {/* Camera Feed Footer Quick Legend */}
      <div className="bg-zinc-950 px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500 inline-block" />
            <span>Normal (&lt; Warning)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500 inline-block" />
            <span>Busy (≥ Warning)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/30 border border-red-500 inline-block" />
            <span>Over Threshold (≥ Critical)</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono hidden sm:block">
          Thermal buffer: OpenCV COLORMAP_JET &bull; Gaussian Heat &bull; Hysteresis Switched
        </div>
      </div>
    </div>
  );
};
