import React, { useState } from 'react';
import {
  ShieldAlert,
  Send,
  X,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { EscalationSummaryPayload } from '../types.ts';

interface EscalationModalProps {
  summary: EscalationSummaryPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDispatch: (notes: string) => Promise<void>;
}

export const EscalationModal: React.FC<EscalationModalProps> = ({
  summary,
  isOpen,
  onClose,
  onConfirmDispatch,
}) => {
  const [operatorNotes, setOperatorNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen || !summary) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmDispatch(operatorNotes);
      setDispatchedSuccess(true);
      setTimeout(() => {
        setDispatchedSuccess(false);
        onClose();
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-zinc-950 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider flex items-center gap-2">
                Escalation Summary Payload
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-normal">
                  Review-First Required
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Phase 3: Automated terminal dispatch to field operations & NYPD Plaza Sector
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Key Facts Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Zone Breach</div>
              <div className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                {summary.zone_code}: {summary.zone_name}
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Current Count</div>
              <div className="text-sm font-bold font-mono text-red-400 mt-0.5">
                {summary.current_count} pax
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Density</div>
              <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                {summary.density_per_sqm} p/m²
              </div>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px] uppercase font-mono text-zinc-500">Exceeded By</div>
              <div className="text-sm font-bold font-mono text-red-300 mt-0.5">
                +{summary.exceeded_by} above limit
              </div>
            </div>
          </div>

          {/* Structured JSON Payload Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                Raw JSON Dispatch Payload (Target: Terminal Logger)
              </span>
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="p-3.5 bg-zinc-950 rounded-lg border border-zinc-800 text-emerald-400 text-xs font-mono overflow-x-auto max-h-48 leading-relaxed">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </div>

          {/* Recommended Field Measures */}
          <div className="bg-zinc-950/70 p-4 rounded-lg border border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-300 uppercase font-mono mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Prescribed Interventions
            </h4>
            <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
              {summary.recommended_measures.map((m, idx) => (
                <li key={idx}>{m}</li>
              ))}
            </ul>
          </div>

          {/* Operator Dispatch Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Operator Incident Notes / Radio Log (Optional)
            </label>
            <input
              type="text"
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder="e.g. Unit 4 dispatched to 47th St egress; stairs cleared."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-zinc-950 px-6 py-3.5 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleDispatch}
            disabled={isSubmitting || dispatchedSuccess}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md ${
              dispatchedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {dispatchedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Dispatched to Backend Logger!
              </>
            ) : isSubmitting ? (
              'Dispatching...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Confirm & Escalate to Terminal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
