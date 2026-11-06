import React, { useState, useEffect } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipBack,
  SkipForward,
  Bookmark,
  Camera,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { TIMES_SQUARE_SITE } from '../config/zones.ts';

export const ReplayView: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [currentFrame, setCurrentFrame] = useState<number>(1420);
  const [totalFrames] = useState<number>(5400); // ~3 minutes of 30fps footage
  const [activeBookmark, setActiveBookmark] = useState<string | null>('Incident #101 Surge');

  // Bookmarks for critical incidents in the screen recording
  const incidentBookmarks = [
    { name: 'Baseline Crowd Flow', frame: 450, timestamp: '00:15', count: 34, zone: 'Z1' },
    { name: 'Surge Ingress Start', frame: 1200, timestamp: '00:40', count: 48, zone: 'Z1' },
    { name: 'Critical 60s Breach (Alert #101)', frame: 3000, timestamp: '01:40', count: 72, zone: 'Z1' },
    { name: 'Operator Tactical Escalation', frame: 3600, timestamp: '02:00', count: 68, zone: 'Z1' },
    { name: 'Post-Intervention Dispersal', frame: 4800, timestamp: '02:40', count: 32, zone: 'Z1' },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= totalFrames) {
          setIsPlaying(false);
          return 0;
        }
        return prev + Math.floor(playbackSpeed * 3);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalFrames]);

  const progressPercent = (currentFrame / totalFrames) * 100;
  const currentSec = Math.floor(currentFrame / 30);
  const mins = Math.floor(currentSec / 60);
  const secs = currentSec % 60;
  const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const jumpToFrame = (frame: number, name: string) => {
    setCurrentFrame(frame);
    setActiveBookmark(name);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Single-Camera Incident Forensic Replay ({TIMES_SQUARE_SITE.viewpointId})
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Replay historical recordings of <code className="text-zinc-300 font-mono">{TIMES_SQUARE_SITE.sourceVideoName}</code> to audit zone counts, model transitions, and operator interventions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 text-xs font-mono text-zinc-400">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>Timeline Position: <strong className="text-zinc-200">{timeFormatted}</strong> (Frame #{currentFrame})</span>
        </div>
      </div>

      {/* Main Replay Video Viewport */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
        {/* Canvas Display */}
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
          {/* Simulated Video Canvas background */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Grid & Bleachers Overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none">
              <line x1="0" y1="720" x2="480" y2="180" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="960" y1="720" x2="480" y2="180" stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
            </svg>
            <div
              className="absolute left-[24%] right-[24%] bottom-0 top-[35%] bg-gradient-to-t from-red-950/40 via-red-900/20 to-transparent border-t border-red-500/30 rounded-t-lg pointer-events-none"
              style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)' }}
            />
          </div>

          {/* Center Playhead Status */}
          <div className="text-center z-10 space-y-2 pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-xs font-mono text-zinc-200 shadow-xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>FORENSIC REPLAY ACTIVE: {TIMES_SQUARE_SITE.sourceVideoName}</span>
            </div>
            <div className="text-3xl font-bold font-mono text-zinc-100">
              {timeFormatted} <span className="text-sm font-normal text-zinc-500">/ 03:00</span>
            </div>
          </div>

          {/* Replay HUD Overlay */}
          <div className="absolute top-3 left-3 bg-zinc-950/80 px-2.5 py-1 rounded border border-zinc-800 text-[11px] font-mono text-zinc-300">
            SPEED: {playbackSpeed}x | FRAME: {currentFrame}/{totalFrames}
          </div>

          <div className="absolute bottom-3 left-3 bg-zinc-950/80 px-2.5 py-1 rounded border border-zinc-800 text-[11px] font-mono text-amber-400">
            {activeBookmark ? `Bookmark: ${activeBookmark}` : 'Free Scrub Mode'}
          </div>
        </div>

        {/* Playback Controls & Scrubber */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
          {/* Progress Bar / Scrubber */}
          <div className="relative w-full">
            <input
              type="range"
              min={0}
              max={totalFrames}
              value={currentFrame}
              onChange={(e) => {
                setCurrentFrame(Number(e.target.value));
                setActiveBookmark(null);
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
            />
            {/* Incident Bookmark Pins on the Scrubber */}
            <div className="relative w-full h-2 pointer-events-none -mt-2">
              {incidentBookmarks.map((b) => {
                const pinPct = (b.frame / totalFrames) * 100;
                return (
                  <div
                    key={b.frame}
                    className="absolute top-0 w-1.5 h-3 bg-amber-400 rounded-sm -translate-x-1/2 cursor-pointer pointer-events-auto"
                    style={{ left: `${pinPct}%` }}
                    title={`${b.name} (${b.timestamp})`}
                    onClick={() => jumpToFrame(b.frame, b.name)}
                  />
                );
              })}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {/* Transport controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentFrame(Math.max(0, currentFrame - 300))}
                className="p-2 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Rewind 10s"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2 transition-colors shadow"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => setCurrentFrame(Math.min(totalFrames, currentFrame + 300))}
                className="p-2 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Forward 10s"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setCurrentFrame(0);
                  setIsPlaying(false);
                }}
                className="p-2 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Reset to 00:00"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Playback Speed selector */}
            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800">
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incident Bookmarks Quick-Jump List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-400" />
          Critical Incident Timeline Jump Points
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
          {incidentBookmarks.map((b) => (
            <div
              key={b.frame}
              onClick={() => jumpToFrame(b.frame, b.name)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeBookmark === b.name
                  ? 'bg-purple-950/40 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                <span>{b.timestamp}</span>
                <span className="font-bold text-amber-400">{b.count} pax</span>
              </div>
              <div className="font-bold text-zinc-200 text-xs truncate">{b.name}</div>
              <div className="text-[10px] text-zinc-500 mt-1">Zone {b.zone} Focus</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
