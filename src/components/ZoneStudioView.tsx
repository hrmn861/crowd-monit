import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Layers,
  Plus,
  Trash2,
  Undo2,
  Check,
  AlertCircle,
  Play,
  Crosshair,
  Sliders,
  CheckCircle2,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { VideoItem, DynamicZoneInput } from '../types.ts';
import {
  uploadVideoApi,
  fetchVideosApi,
  activateVideoApi,
  saveVideoZonesApi
} from '../services/api.ts';

interface ZoneStudioViewProps {
  onConfigurationDeployed: (videoName: string) => void;
}

const COLOR_PALETTE = [
  { name: 'Emerald', stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)' },
  { name: 'Blue', stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.25)' },
  { name: 'Amber', stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)' },
  { name: 'Purple', stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.25)' },
  { name: 'Rose', stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.25)' },
  { name: 'Cyan', stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.25)' },
];

export const ZoneStudioView: React.FC<ZoneStudioViewProps> = ({ onConfigurationDeployed }) => {
  const [step, setStep] = useState<'upload' | 'draw'>('upload');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dynamic Drawing State
  const [zones, setZones] = useState<DynamicZoneInput[]>([]);
  const [currentPoints, setCurrentPoints] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);

  // Current zone form parameters
  const [zoneCode, setZoneCode] = useState('Z1');
  const [zoneName, setZoneName] = useState('Lower Stairs');
  const [zoneDesc, setZoneDesc] = useState('Primary aggregation corridor');
  const [areaSqm, setAreaSqm] = useState(45.0);
  const [capacity, setCapacity] = useState(80);
  const [warningThreshold, setWarningThreshold] = useState(50);
  const [criticalThreshold, setCriticalThreshold] = useState(65);

  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load existing uploaded videos
  useEffect(() => {
    fetchVideosApi().then((list) => {
      setVideos(list);
      if (list.length > 0 && !selectedVideo) {
        setSelectedVideo(list[0]);
      }
    });
  }, []);

  // Update default zone code when zones change
  useEffect(() => {
    const nextIdx = zones.length + 1;
    setZoneCode(`Z${nextIdx}`);
    setZoneName(`Zone ${nextIdx}`);
  }, [zones.length]);

  // Load background image when video is selected
  useEffect(() => {
    if (!selectedVideo) return;
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedVideo.first_frame_url;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Fallback standby frame
      const fallbackImg = new Image();
      fallbackImg.src = '/backend/standby.jpg';
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
        setImageLoaded(true);
      };
    };
  }, [selectedVideo]);

  // Render canvas whenever points or zones update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (imageRef.current && imageLoaded) {
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#71717a';
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Loading First Frame...', canvas.width / 2, canvas.height / 2);
    }

    // Draw already configured zones
    zones.forEach((zone, idx) => {
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
      if (zone.polygon.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(zone.polygon[0][0], zone.polygon[0][1]);
      for (let i = 1; i < zone.polygon.length; i++) {
        ctx.lineTo(zone.polygon[i][0], zone.polygon[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = color.fill;
      ctx.fill();
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Zone label
      const avgX = zone.polygon.reduce((sum, p) => sum + p[0], 0) / zone.polygon.length;
      const avgY = zone.polygon.reduce((sum, p) => sum + p[1], 0) / zone.polygon.length;
      ctx.fillStyle = '#09090b';
      ctx.fillRect(avgX - 35, avgY - 14, 70, 24);
      ctx.strokeStyle = color.stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(avgX - 35, avgY - 14, 70, 24);
      ctx.fillStyle = '#f4f4f5';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${zone.code} (${zone.capacity}p)`, avgX, avgY + 3);
    });

    // Draw polygon currently in progress
    if (currentPoints.length > 0) {
      const activeColor = COLOR_PALETTE[selectedColorIdx % COLOR_PALETTE.length];

      ctx.beginPath();
      ctx.moveTo(currentPoints[0][0], currentPoints[0][1]);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i][0], currentPoints[i][1]);
      }

      // Draw dashed line to mouse pointer
      if (mousePos) {
        ctx.lineTo(mousePos[0], mousePos[1]);
      }

      ctx.strokeStyle = activeColor.stroke;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw vertex anchor points
      currentPoints.forEach(([x, y], idx) => {
        ctx.beginPath();
        ctx.arc(x, y, idx === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#ef4444' : activeColor.stroke;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Point index tag
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(`${idx + 1}`, x + 7, y - 5);
      });
    }
  }, [zones, currentPoints, mousePos, imageLoaded, selectedColorIdx]);

  // Handle canvas clicks to place points
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    // If clicking near point 0 and have >= 3 points, close polygon
    if (currentPoints.length >= 3) {
      const [startX, startY] = currentPoints[0];
      const dist = Math.hypot(x - startX, y - startY);
      if (dist < 18) {
        handleCompleteCurrentPolygon();
        return;
      }
    }

    setCurrentPoints((prev) => [...prev, [x, y]]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || currentPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    setMousePos([
      Math.round((e.clientX - rect.left) * scaleX),
      Math.round((e.clientY - rect.top) * scaleY),
    ]);
  };

  const handleCompleteCurrentPolygon = () => {
    if (currentPoints.length < 3) return;
    const newZone: DynamicZoneInput = {
      code: zoneCode,
      name: zoneName,
      description: zoneDesc,
      area_sqm: areaSqm,
      capacity,
      warning_threshold: warningThreshold,
      critical_threshold: criticalThreshold,
      polygon: currentPoints,
    };

    setZones((prev) => [...prev, newZone]);
    setCurrentPoints([]);
    setMousePos(null);
    setSelectedColorIdx((prev) => prev + 1);
  };

  const handleUndoPoint = () => {
    setCurrentPoints((prev) => prev.slice(0, -1));
  };

  const handleClearCurrent = () => {
    setCurrentPoints([]);
    setMousePos(null);
  };

  const handleDeleteZone = (code: string) => {
    setZones((prev) => prev.filter((z) => z.code !== code));
  };

  // Video File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const newVideo = await uploadVideoApi(file, (pct) => setUploadProgress(pct));
      setVideos((prev) => [newVideo, ...prev]);
      setSelectedVideo(newVideo);
      setStep('draw');
    } catch (err: any) {
      setUploadError(err.message || 'Video upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Deploy Zones & Activate
  const handleDeployConfiguration = async () => {
    if (!selectedVideo) return;
    if (zones.length === 0) {
      setUploadError('Please draw at least one polygon zone before deploying.');
      return;
    }

    setDeploying(true);
    setUploadError(null);

    try {
      await saveVideoZonesApi(selectedVideo.id, zones);
      await activateVideoApi(selectedVideo.id);
      setDeploySuccess(true);
      setTimeout(() => {
        onConfigurationDeployed(selectedVideo.original_name);
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to deploy configuration');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Zone Studio & Dynamic Setup
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Upload custom surveillance videos (.mp4) and draw multi-point polygon zones directly over the extracted first frame.
          </p>
        </div>

        {/* Wizard Step Indicator */}
        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => setStep('upload')}
            className={`px-3 py-1 rounded transition-colors ${
              step === 'upload' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            1. Select Video
          </button>
          <span className="text-zinc-600">→</span>
          <button
            onClick={() => selectedVideo && setStep('draw')}
            disabled={!selectedVideo}
            className={`px-3 py-1 rounded transition-colors disabled:opacity-40 ${
              step === 'draw' ? 'bg-blue-600 text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            2. Draw Polygon Zones
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {deploySuccess && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-800 rounded-lg text-xs text-emerald-200 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Configuration deployed successfully! Dynamic zones linked to PostgreSQL database. Redirecting to live monitor...
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: VIDEO UPLOAD & MEDIA SELECTOR                               */}
      {/* ------------------------------------------------------------------ */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Dropzone */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400 mb-4">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase">
              Upload Surveillance Video (.mp4)
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mt-1 mb-6">
              Drag and drop an MP4 recording from your local drive. The system will automatically extract the first frame to calibrate polygon zones.
            </p>

            <label className="relative cursor-pointer">
              <input
                type="file"
                accept="video/mp4"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                <Video className="w-4 h-4" />
                {isUploading ? `Uploading (${uploadProgress}%)` : 'Browse Local .mp4 File'}
              </span>
            </label>

            {isUploading && (
              <div className="w-64 mt-4">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-[11px] font-mono text-zinc-400 mt-1">
                  Extracting frame 0 for canvas calibration...
                </div>
              </div>
            )}
          </div>

          {/* Existing Media Library */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col">
            <h3 className="text-xs font-bold text-zinc-200 font-mono uppercase mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-400" />
              Available Video Feeds ({videos.length})
            </h3>

            <div className="space-y-2.5 overflow-y-auto max-h-80 pr-1">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => setSelectedVideo(vid)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVideo?.id === vid.id
                      ? 'bg-blue-950/40 border-blue-500/80 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-200 truncate max-w-[180px]">
                      {vid.original_name}
                    </span>
                    {vid.is_active && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center justify-between">
                    <span>{vid.width}x{vid.height} @ {vid.fps}fps</span>
                    <span>{vid.zone_count} Zones</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedVideo && (
              <button
                onClick={() => setStep('draw')}
                className="mt-auto pt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4" />
                Configure Zones for Selected Video →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: INTERACTIVE HTML5 CANVAS POLYGON DRAWING TOOL              */}
      {/* ------------------------------------------------------------------ */}
      {step === 'draw' && selectedVideo && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Canvas Viewport */}
          <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
            {/* Canvas Header Toolbar */}
            <div className="bg-zinc-950 px-4 py-2.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="text-zinc-200 font-bold">CANVAS:</span>
                <span className="text-zinc-400 truncate max-w-xs">{selectedVideo.original_name}</span>
                <span className="text-zinc-600">|</span>
                <span className="text-blue-400">{currentPoints.length} points placed</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndoPoint}
                  disabled={currentPoints.length === 0}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded font-mono text-[11px] flex items-center gap-1"
                  title="Undo last point"
                >
                  <Undo2 className="w-3 h-3" />
                  Undo
                </button>
                <button
                  onClick={handleClearCurrent}
                  disabled={currentPoints.length === 0}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded font-mono text-[11px]"
                >
                  Clear Current
                </button>
                <button
                  onClick={handleCompleteCurrentPolygon}
                  disabled={currentPoints.length < 3}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-mono text-[11px] font-bold rounded flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Polygon ({zoneCode})
                </button>
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center cursor-crosshair select-none">
              <canvas
                ref={canvasRef}
                width={960}
                height={720}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                className="w-full h-full object-contain"
              />

              {/* Instructions Overlay Banner */}
              <div className="absolute bottom-3 inset-x-3 bg-zinc-950/85 backdrop-blur-md px-3 py-2 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Click anywhere on the frame to place polygon vertices. Click near Point 1 (red) or click 'Save Polygon' to close.
                  </span>
                </div>
                <div className="text-zinc-500 hidden sm:block">Scale: 960x720 Base</div>
              </div>
            </div>
          </div>

          {/* Zone Parameters Form & Configured Zones List */}
          <div className="space-y-4">
            {/* New Zone Parameters Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="text-xs font-bold text-zinc-200 font-mono uppercase mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                Zone Parameters for Drawing
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="text-zinc-400 block mb-1">Zone Code</label>
                  <input
                    type="text"
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Zone Name</label>
                  <input
                    type="text"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Area (m²)</label>
                  <input
                    type="number"
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Capacity (pax)</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Warn Threshold</label>
                  <input
                    type="number"
                    value={warningThreshold}
                    onChange={(e) => setWarningThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-amber-400"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Crit Threshold</label>
                  <input
                    type="number"
                    value={criticalThreshold}
                    onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-red-400 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Configured Zones List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-200 font-mono uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Configured Zones ({zones.length})
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">
                  Total Cap: {zones.reduce((sum, z) => sum + z.capacity, 0)} pax
                </span>
              </div>

              {zones.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono">
                  No zones drawn yet. Click points on the video frame above to create your first polygon zone.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {zones.map((z, idx) => {
                    const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                    return (
                      <div
                        key={z.code}
                        className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: color.stroke }}
                          />
                          <div>
                            <div className="font-bold text-zinc-200">
                              {z.code}: {z.name}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {z.area_sqm}m² | Cap: {z.capacity} | Warn: {z.warning_threshold} | Crit: {z.critical_threshold}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteZone(z.code)}
                          className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-red-400 rounded transition-colors"
                          title="Delete Zone"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Deploy Button */}
              <button
                onClick={handleDeployConfiguration}
                disabled={zones.length === 0 || deploying}
                className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {deploying ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {deploying ? 'Deploying to PostgreSQL...' : `Deploy & Monitor (${zones.length} Zones)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
