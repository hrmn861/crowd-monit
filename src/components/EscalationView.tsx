import React, { useState } from 'react';
import {
  ShieldAlert,
  Terminal,
  Send,
  Radio,
  Copy,
  Check,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { EscalationSummaryPayload, AlertRecord } from '../types.ts';
import { TIMES_SQUARE_SITE } from '../config/zones.ts';

interface EscalationViewProps {
  alerts: AlertRecord[];
  onEscalateAlert: (alertId: number, notes?: string) => Promise<EscalationSummaryPayload>;
}

export const EscalationView: React.FC<EscalationViewProps> = ({
  alerts,
  onEscalateAlert,
}) => {
  const [operatorNotes, setOperatorNotes] = useState('');
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(
    alerts.find((a) => a.status === 'confirmed' || a.status === 'active')?.id || (alerts[0]?.id ?? null)
  );
  const [dispatchedPayloads, setDispatchedPayloads] = useState<EscalationSummaryPayload[]>([
    {
      site_name: TIMES_SQUARE_SITE.siteName,
      viewpoint: TIMES_SQUARE_SITE.viewpointName,
      alert_id: 101,
      zone_code: 'Z1',
      zone_name: 'Lower Stairs',
      current_count: 68,
      density_per_sqm: 1.51,
      critical_threshold: 65,
      exceeded_by: 3,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      operator_notes: 'Initial stair surge verified. Plaza Safety Team dispatched to 47th St pedestrian egress.',
      recommended_measures: [
        'Dispatch Plaza Safety Team to redirect pedestrian flow at 7th Ave corridor',
        'Activate digital signage warning: Stairs closed for congestion management',
        'Notify NYPD Transit Bureau Sector 2 if stairs aggregation exceeds 120%',
      ],
    },
  ]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId);

  const handleDispatch = async () => {
    if (!selectedAlertId) return;
    setIsSubmitting(true);
    try {
      const payload = await onEscalateAlert(selectedAlertId, operatorNotes);
      setDispatchedPayloads((prev) => [payload, ...prev]);
      setOperatorNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (id: number, payload: EscalationSummaryPayload) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Emergency Tactical Escalation Station (Phase 3 Review-First)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Human-in-the-loop dispatch interface: Generates structured JSON escalation payloads to terminal loggers and field radio units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded bg-red-950 border border-red-700/60 text-red-300 font-mono text-xs flex items-center gap-1.5 animate-pulse">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            NYPD PLAZA SECTOR 2 LINK ONLINE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Dispatch Form & Protocol Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispatch Generator Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Prepare Incident Escalation Dispatch
            </h3>

            {/* Select Alert to Escalate */}
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Select Active/Confirmed Threat Alert
              </label>
              <select
                value={selectedAlertId ?? ''}
                onChange={(e) => setSelectedAlertId(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {alerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Alert #{a.id} — {a.zone_code}: {a.zone_name} ({a.count} pax, Status: {a.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {selectedAlert && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Zone</span>
                  <span className="text-zinc-100 font-bold">{selectedAlert.zone_code} ({selectedAlert.zone_name})</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Density</span>
                  <span className="text-amber-400 font-bold">{selectedAlert.density.toFixed(2)} pax/m²</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Status</span>
                  <span className="text-red-400 font-bold uppercase">{selectedAlert.status}</span>
                </div>
              </div>
            )}

            {/* Operator Notes Input */}
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5">
                Operator Situation Assessment / Field Notes
              </label>
              <textarea
                rows={3}
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                placeholder="e.g. Verified camera feed: crowd density exceeds safe perimeter on lower stairs. Dispatched Plaza Security Unit 3 for crowd metering."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Dispatch Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleDispatch}
                disabled={isSubmitting || !selectedAlertId}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white transition-all shadow-md disabled:opacity-50 uppercase tracking-wider"
              >
                <Terminal className="w-4 h-4" />
                {isSubmitting ? 'Logging to Terminal...' : 'Dispatch to Terminal Logger'}
              </button>
            </div>
          </div>

          {/* Times Square Standard Operating Procedures (SOP) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Father Duffy Square Crowd Safety Interventions (SOP-401)
            </h3>
            <div className="space-y-2 text-xs font-mono text-zinc-400">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400 shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Level 1 (Warning):</strong> Activate electronic queuing signs along Broadway Walkway. Alert security staff to monitor stairway ingress.
                </span>
              </div>
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-700 flex items-center justify-center text-amber-400 shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  <strong>Level 2 (Critical &gt;60s):</strong> Close upper bleacher access gates. Divert south-bound pedestrian transit toward 7th Ave walkway corridor.
                </span>
              </div>
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-red-950 border border-red-700 flex items-center justify-center text-red-400 shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Level 3 (Tactical Escalation):</strong> Complete automated dispatch summary. Radio NYPD Transit Sector 2 for immediate platform egress clearing.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Dispatched Payload Log Feed */}
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Terminal Dispatch History</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              {dispatchedPayloads.length} Dispatched
            </span>
          </div>

          <div className="space-y-3">
            {dispatchedPayloads.map((payload, idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 shadow-sm font-mono text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-red-400 font-bold">
                    ALERT #{payload.alert_id} &bull; {payload.zone_code}
                  </span>
                  <button
                    onClick={() => handleCopy(payload.alert_id, payload)}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    {copiedId === payload.alert_id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === payload.alert_id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500">
                  {new Date(payload.timestamp).toLocaleTimeString()} &bull; Count: {payload.current_count} pax
                </div>

                <pre className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[10px] text-emerald-400 overflow-x-auto max-h-40">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
