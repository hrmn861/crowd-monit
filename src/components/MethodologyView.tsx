import React from 'react';
import {
  BookOpen,
  Camera,
  Cpu,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const MethodologyView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Crowd Monitor Engineering & Computer Vision Methodology
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Technical documentation covering single-camera homography mapping, dual-model hysteresis formulation, and the 60-second persistence filter.
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800">
          Specification: <strong>Single-Camera Local MVP</strong>
        </div>
      </div>

      {/* Core Architectural Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1: Single-Camera Constraint & Spatial Homography */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-blue-400 font-mono text-sm font-bold uppercase">
            <Camera className="w-4 h-4" />
            <span>1. Single-Camera Viewpoint & Spatial Homography</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The MVP architecture strictly enforces a single-camera topology (<strong>TSQ-CAM-01</strong>, Father Duffy Square North View). By eliminating multi-camera switching, routing overhead, and cross-camera re-identification (ReID), processing achieves deterministic per-frame latency (&lt; 35ms) on a single edge machine.
          </p>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-300 space-y-1.5">
            <div className="text-zinc-500 text-[10px] uppercase">Homography Density Formulation:</div>
            <div className="text-emerald-400 font-bold">Density (pax/m²) = Observed Head Count (N) / True Polygon Area (A_sqm)</div>
            <div className="text-zinc-400 text-[11px]">
              Geometric perspective foreshortening across the red bleachers is normalized using planar homography coordinates calibrated to physical deck dimensions.
            </div>
          </div>
        </div>

        {/* Pillar 2: Dual-Model Hysteresis Strategy */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-sm font-bold uppercase">
            <Cpu className="w-4 h-4" />
            <span>2. Dual-Model Dynamic Hysteresis Switching</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Traditional object detectors (YOLO) degrade under severe occlusions, while density regressors (DM-Count) lose individual spatial localization in sparse crowds. Crowd Monitor employs a dual-model architecture with hysteresis switching to avoid rapid oscillatory chatter:
          </p>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold">YOLO &rarr; DM-Count Switch:</span>
              <span className="text-zinc-200">Count &ge; 45 pax</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-400 font-bold">DM-Count &rarr; YOLO Switch:</span>
              <span className="text-zinc-200">Count &lt; 35 pax</span>
            </div>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80">
              The 10-person deadband (35 to 45 pax) ensures stable execution when crowd size fluctuates around threshold boundaries.
            </div>
          </div>
        </div>

        {/* Pillar 3: 60-Second Persistence State Machine */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold uppercase">
            <Clock className="w-4 h-4" />
            <span>3. 60-Second Persistence Filter (Anti-Noise)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Public viewpoints like Times Square experience frequent transient surges (tourist tour groups, photo ops) that disperse in 15–30 seconds. To eliminate alert fatigue and unnecessary security dispatches:
          </p>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono space-y-1.5 text-zinc-300">
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <strong>Trigger Rule:</strong> Zone count must remain &ge; Critical Threshold for 60 continuous seconds before generating an active alert.
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <strong>Resolution Rule:</strong> Zone count must remain &lt; Critical Threshold for 60 continuous seconds before auto-resolving.
            </div>
          </div>
        </div>

        {/* Pillar 4: Review-First Tactical Escalation */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>4. Review-First Human-in-the-Loop Escalation</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Emergency interventions in high-profile pedestrian plazas require human verification before emergency protocols trigger. The state machine enforces a review-first gate:
          </p>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs font-mono text-zinc-300 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-200">
              <span className="text-zinc-500">Lifecycle:</span>
              <span className="text-zinc-400">pending</span> &rarr;
              <span className="text-red-400">active</span> &rarr;
              <span className="text-amber-400">confirmed</span> &rarr;
              <span className="text-purple-400 font-bold">escalated</span>
            </div>
            <p className="text-[11px] text-zinc-500 pt-1">
              Clicking &quot;Escalate&quot; outputs the structured JSON summary payload directly to the backend terminal logger with site coordinates and safety SOPs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
