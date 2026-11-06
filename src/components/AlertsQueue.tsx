import React, { useState } from 'react';
import {
  Bell,
  CheckCircle,
  XCircle,
  AlertOctagon,
  ShieldAlert,
  Clock,
  Send,
  FileText,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { AlertRecord, EscalationSummaryPayload } from '../types.ts';
import { EscalationModal } from './EscalationModal.tsx';

interface AlertsQueueProps {
  alerts: AlertRecord[];
  onConfirmAlert: (alertId: number) => Promise<void>;
  onDismissAlert: (alertId: number) => Promise<void>;
  onEscalateAlert: (alertId: number, notes?: string) => Promise<EscalationSummaryPayload>;
}

export const AlertsQueue: React.FC<AlertsQueueProps> = ({
  alerts,
  onConfirmAlert,
  onDismissAlert,
  onEscalateAlert,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [escalatingAlert, setEscalatingAlert] = useState<AlertRecord | null>(null);
  const [activeSummary, setActiveSummary] = useState<EscalationSummaryPayload | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.status === filter;
  });

  const handleStartEscalation = (alert: AlertRecord) => {
    // Generate pre-dispatch payload
    const draftSummary: EscalationSummaryPayload = {
      site_name: 'Times Square - Red Steps & Broadway Walkway',
      viewpoint: 'North View - Father Duffy Square (TSQ-CAM-01)',
      alert_id: alert.id,
      zone_code: alert.zone_code,
      zone_name: alert.zone_name,
      current_count: alert.count,
      density_per_sqm: alert.density,
      critical_threshold: alert.threshold,
      exceeded_by: Math.max(0, alert.count - alert.threshold),
      timestamp: new Date().toISOString(),
      operator_notes: 'Critical persistence threshold exceeded. Operator initiating tactical escalation.',
      recommended_measures: [
        'Dispatch Plaza Safety Team to redirect pedestrian flow at 7th Ave corridor',
        'Activate digital signage warning: Stairs closed for congestion management',
        'Notify NYPD Transit Bureau Sector 2 if stairs aggregation exceeds 120%',
      ],
    };
    setActiveSummary(draftSummary);
    setEscalatingAlert(alert);
    setIsModalOpen(true);
  };

  const handleConfirmDispatch = async (notes: string) => {
    if (!escalatingAlert) return;
    const finalPayload = await onEscalateAlert(escalatingAlert.id, notes);
    setActiveSummary(finalPayload);
    setFeedbackMsg(`Alert #${escalatingAlert.id} successfully escalated! Summary logged to terminal.`);
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const getStatusBadge = (status: AlertRecord['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse">
            ACTIVE (60s VERIFIED)
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
            CONFIRMED BY OPERATOR
          </span>
        );
      case 'escalated':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
            ESCALATED TO DISPATCH
          </span>
        );
      case 'resolved':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
            RESOLVED (60s SUBSIDED)
          </span>
        );
      case 'dismissed':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            DISMISSED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="bg-emerald-950 border border-emerald-600 text-emerald-300 px-4 py-3 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
            Safety Alerts Queue & Review-First Escalation
          </h2>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-md border border-zinc-800 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5" />
          {['all', 'active', 'confirmed', 'escalated', 'resolved', 'dismissed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded capitalize transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-10 text-center text-zinc-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm font-mono text-zinc-400">No alerts found matching filter &quot;{filter}&quot;.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Active alerts require &gt;60s continuous breach persistence.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-zinc-900 border rounded-lg p-4 transition-all shadow-sm ${
                alert.status === 'active'
                  ? 'border-red-600/70 bg-gradient-to-r from-red-950/20 to-zinc-900'
                  : alert.status === 'confirmed'
                  ? 'border-amber-600/60 bg-gradient-to-r from-amber-950/20 to-zinc-900'
                  : alert.status === 'escalated'
                  ? 'border-purple-600/50 bg-gradient-to-r from-purple-950/20 to-zinc-900'
                  : 'border-zinc-800'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Zone & Alert Meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs text-blue-400">
                      {alert.zone_code}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 font-mono">
                      {alert.zone_name} - Capacity Threshold Exceeded
                    </h3>
                    {getStatusBadge(alert.status)}
                  </div>

                  <p className="text-xs text-zinc-400 font-mono pl-8">
                    Triggered Count: <span className="text-red-400 font-bold">{alert.count}</span> pax |
                    Density: <span className="text-amber-400 font-bold">{alert.density.toFixed(2)}</span> p/m² |
                    Limit: <span className="text-zinc-300">{alert.threshold}</span> pax
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono pl-8 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Triggered: {new Date(alert.triggered_at).toLocaleTimeString()}
                    </span>
                    {alert.confirmed_at && (
                      <span>Confirmed: {new Date(alert.confirmed_at).toLocaleTimeString()}</span>
                    )}
                    {alert.escalated_at && (
                      <span className="text-purple-400">
                        Escalated: {new Date(alert.escalated_at).toLocaleTimeString()}
                      </span>
                    )}
                    {alert.resolved_at && (
                      <span className="text-emerald-400">
                        Resolved: {new Date(alert.resolved_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {alert.notes && (
                    <div className="pl-8 pt-1 text-xs text-zinc-400 italic">
                      &quot;{alert.notes}&quot;
                    </div>
                  )}
                </div>

                {/* Operator Review Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Active Alert: Review & Confirm or Dismiss */}
                  {alert.status === 'active' && (
                    <>
                      <button
                        onClick={() => onDismissAlert(alert.id)}
                        className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1.5 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5 text-zinc-400" />
                        Dismiss
                      </button>

                      <button
                        onClick={() => onConfirmAlert(alert.id)}
                        className="px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-mono font-bold text-zinc-950 flex items-center gap-1.5 transition-colors shadow"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Confirm Threat
                      </button>
                    </>
                  )}

                  {/* Confirmed Alert: Review-First Escalation to Terminal */}
                  {alert.status === 'confirmed' && (
                    <button
                      onClick={() => handleStartEscalation(alert)}
                      className="px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-colors shadow-md animate-pulse"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Escalate (Review Summary)
                    </button>
                  )}

                  {/* Escalated Alert: View Payload */}
                  {alert.status === 'escalated' && (
                    <button
                      onClick={() => handleStartEscalation(alert)}
                      className="px-3 py-1.5 rounded-md bg-purple-950 border border-purple-700 hover:bg-purple-900 text-xs font-mono text-purple-200 flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      View Escalation Summary
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Escalation Modal Dialog */}
      <EscalationModal
        summary={activeSummary}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmDispatch={handleConfirmDispatch}
      />
    </div>
  );
};
