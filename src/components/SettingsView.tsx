import React, { useState } from 'react';
import {
  Settings,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Camera,
  CheckCircle2,
  Clock,
  Cpu,
} from 'lucide-react';
import { ZoneConfig } from '../types.ts';
import { DEFAULT_ZONES_CONFIG } from '../config/zones.ts';
import { WebhookConfigurator } from './WebhookConfigurator.tsx';

interface SettingsViewProps {
  onSaveAuditLog?: (action: string, details: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSaveAuditLog }) => {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true);
  const [zonesConfig, setZonesConfig] = useState<ZoneConfig[]>(DEFAULT_ZONES_CONFIG);
  const [alertPersistenceSec, setAlertPersistenceSec] = useState(60);
  const [resolvePersistenceSec, setResolvePersistenceSec] = useState(60);
  const [hysteresisUpper, setHysteresisUpper] = useState(45);
  const [hysteresisLower, setHysteresisLower] = useState(35);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleThresholdChange = (
    code: string,
    field: 'warning_threshold' | 'critical_threshold' | 'capacity',
    val: number
  ) => {
    setZonesConfig((prev) =>
      prev.map((z) => (z.code === code ? { ...z, [field]: val } : z))
    );
  };

  const handleSave = () => {
    setToastMessage('System settings saved successfully. Thresholds updated across API.');
    onSaveAuditLog?.(
      'CONFIG_UPDATE',
      `Admin updated zone thresholds and persistence timers. Trigger: ${alertPersistenceSec}s, Hysteresis: ${hysteresisLower}/${hysteresisUpper}`
    );
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleReset = () => {
    setZonesConfig(DEFAULT_ZONES_CONFIG);
    setAlertPersistenceSec(60);
    setResolvePersistenceSec(60);
    setHysteresisUpper(45);
    setHysteresisLower(35);
    setToastMessage('Configuration restored to factory default baseline.');
    onSaveAuditLog?.('CONFIG_UPDATE', 'Admin restored settings to factory default.');
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-950 border border-emerald-600 text-emerald-300 px-4 py-3 rounded-lg text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wider">
              Control Room System Settings (Admin Only)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure safety capacity limits, 60-second persistence windows, and computer vision hysteresis thresholds.
          </p>
        </div>

        {/* Admin Authorization Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdminUnlocked(!isAdminUnlocked)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              isAdminUnlocked
                ? 'bg-amber-950/60 border-amber-600/60 text-amber-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
          >
            {isAdminUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{isAdminUnlocked ? 'Admin Mode (Unlocked)' : 'Read-Only Mode'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Zone Capacity & Alert Thresholds */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          Monitored Zone Capacity & Alert Thresholds
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono text-zinc-300">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-[11px] border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Zone Code & Name</th>
                <th className="px-4 py-3">Area (m²)</th>
                <th className="px-4 py-3">Max Capacity</th>
                <th className="px-4 py-3">Warning Limit (Busy)</th>
                <th className="px-4 py-3">Critical Limit (Alert)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {zonesConfig.map((z) => (
                <tr key={z.code} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-3.5 font-bold text-zinc-100">
                    <span className="text-blue-400 mr-2">{z.code}</span>
                    {z.name}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-400">{z.area_sqm} m²</td>
                  <td className="px-4 py-3.5">
                    <input
                      type="number"
                      disabled={!isAdminUnlocked}
                      value={z.capacity}
                      onChange={(e) =>
                        handleThresholdChange(z.code, 'capacity', parseInt(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-zinc-100 disabled:opacity-50 text-xs font-mono focus:border-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      type="number"
                      disabled={!isAdminUnlocked}
                      value={z.warning_threshold}
                      onChange={(e) =>
                        handleThresholdChange(z.code, 'warning_threshold', parseInt(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950 border border-amber-700/60 rounded px-2.5 py-1 text-amber-300 disabled:opacity-50 text-xs font-mono focus:border-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <input
                      type="number"
                      disabled={!isAdminUnlocked}
                      value={z.critical_threshold}
                      onChange={(e) =>
                        handleThresholdChange(z.code, 'critical_threshold', parseInt(e.target.value) || 0)
                      }
                      className="w-20 bg-zinc-950 border border-red-700/60 rounded px-2.5 py-1 text-red-300 disabled:opacity-50 text-xs font-mono focus:border-red-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Alert State Machine & Hysteresis Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Persistence Windows */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Alert Persistence State Machine Rules
          </h3>
          <p className="text-xs text-zinc-400">
            Mandatory temporal filtering to prevent transient tourist surge noise from triggering premature emergency dispatches.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-zinc-300 mb-1">
                Breach Trigger Persistence Window (Seconds)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdminUnlocked}
                  value={alertPersistenceSec}
                  onChange={(e) => setAlertPersistenceSec(parseInt(e.target.value) || 60)}
                  className="w-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 disabled:opacity-50 focus:border-blue-500"
                />
                <span className="text-zinc-500">sec (Requirement: 60s)</span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-1">
                Auto-Resolution Persistence Window (Seconds)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdminUnlocked}
                  value={resolvePersistenceSec}
                  onChange={(e) => setResolvePersistenceSec(parseInt(e.target.value) || 60)}
                  className="w-24 bg-zinc-950 border border-zinc-700 rounded px-3 py-1.5 text-zinc-100 disabled:opacity-50 focus:border-blue-500"
                />
                <span className="text-zinc-500">sec (Requirement: 60s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Vision Hysteresis Limits */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            Vision Model Hysteresis Bounds
          </h3>
          <p className="text-xs text-zinc-400">
            Hysteresis deadband prevents rapid chattering oscillation between detector (YOLO) and density regressor (DM-Count).
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-zinc-300 mb-1">
                Upper Switch Threshold (YOLO &rarr; DM-Count)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdminUnlocked}
                  value={hysteresisUpper}
                  onChange={(e) => setHysteresisUpper(parseInt(e.target.value) || 45)}
                  className="w-24 bg-zinc-950 border border-purple-700 rounded px-3 py-1.5 text-purple-300 disabled:opacity-50 focus:border-purple-500"
                />
                <span className="text-zinc-500">pax (Triggers DM-Count regression)</span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 mb-1">
                Lower Switch Threshold (DM-Count &rarr; YOLO)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdminUnlocked}
                  value={hysteresisLower}
                  onChange={(e) => setHysteresisLower(parseInt(e.target.value) || 35)}
                  className="w-24 bg-zinc-950 border border-emerald-700 rounded px-3 py-1.5 text-emerald-300 disabled:opacity-50 focus:border-emerald-500"
                />
                <span className="text-zinc-500">pax (Triggers YOLO individual tracking)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: External Webhook Notification Engine */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-100 font-mono uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              External Webhook & Emergency Notification Engine
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Asynchronously dispatch JSON alert payloads to Slack, Telegram, or custom REST servers when a 60s persistent alert triggers.
            </p>
          </div>
        </div>

        {/* Webhook Configuration Table & Add Form */}
        <WebhookConfigurator onNotify={(msg) => setToastMessage(msg)} />
      </div>

      {/* Section 4: Architecture Constraints Watermark */}
      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          <span>
            Hardware Topology: <strong className="text-zinc-200">Strict Single-Camera Architecture (Locked)</strong>
          </span>
        </div>
        <div className="text-[11px] text-zinc-500">
          Multi-camera routing disabled per MVP specification
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={handleReset}
          disabled={!isAdminUnlocked}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Factory Defaults
        </button>

        <button
          onClick={handleSave}
          disabled={!isAdminUnlocked}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-mono font-bold text-white transition-colors shadow-md disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Configuration
        </button>
      </div>
    </div>
  );
};
