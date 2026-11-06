/**
 * Crowd Monitor - Zone Occupancy & Crowd Counting Dashboard (React 19)
 * Multi-tab control room application for a restricted single-camera viewpoint.
 * Features enterprise Role-Based Access Control (RBAC) via HttpOnly JWT cookies.
 */

import React, { useState, useEffect } from 'react';
import {
  fetchLiveStatus,
  fetchTrends,
  fetchAlerts,
  updateAlertStatus,
  escalateAlert,
  DashboardStatusResponse,
} from './services/api.ts';
import {
  ZoneLiveStatus,
  AlertRecord,
  ZoneTrendSeries,
  ModelType,
  NavigationTab,
  AuditLogEntry,
} from './types.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';
import { Navbar } from './components/Navbar.tsx';
import { MetricsBar } from './components/MetricsBar.tsx';
import { CameraFeed } from './components/CameraFeed.tsx';
import { ZonesTable } from './components/ZonesTable.tsx';
import { TrendChart } from './components/TrendChart.tsx';
import { AlertsQueue } from './components/AlertsQueue.tsx';
import { DensityTrendsView } from './components/DensityTrendsView.tsx';
import { CameraHealthView } from './components/CameraHealthView.tsx';
import { EvaluationView } from './components/EvaluationView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { EscalationView } from './components/EscalationView.tsx';
import { ReplayView } from './components/ReplayView.tsx';
import { MethodologyView } from './components/MethodologyView.tsx';
import { ZoneStudioView } from './components/ZoneStudioView.tsx';
import { HistoricalAnalyticsView } from './components/HistoricalAnalyticsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { DEFAULT_ZONES_CONFIG } from './config/zones.ts';

function ControlRoomContent() {
  const { user, role, hasRole, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardStatusResponse | null>(null);
  const [trendsSeries, setTrendsSeries] = useState<ZoneTrendSeries[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('Z1');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initial audit log state tracking operational interventions
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'AUD-8812',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      operator: 'SYSTEM_DAEMON',
      role: 'CORE',
      action_type: 'SYSTEM',
      description: 'Single-Camera ingest initialized on TSQ-CAM-01 (Screen Recording 2026-11-03 221109.mp4)',
      details: 'Resolution: 4K UHD, 30fps target, PostgreSQL/SQLite backend mounted with RBAC.',
      severity: 'INFO',
    },
    {
      id: 'AUD-8813',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      operator: 'OPERATOR_DESK',
      role: 'OPERATOR',
      action_type: 'CONFIRM',
      zone_code: 'Z1',
      description: 'Threat verified for Alert #101: Lower Stairs crowd aggregation exceeded 65 pax',
      details: 'Operator visually inspected bleachers feed and verified persistence breach >60s.',
      severity: 'ACTION',
    },
    {
      id: 'AUD-8814',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      operator: 'OPERATOR_DESK',
      role: 'OPERATOR',
      action_type: 'ESCALATE',
      zone_code: 'Z1',
      description: 'Tactical escalation summary dispatched to terminal logger and Plaza Security Sector 2',
      details: 'Exceeded critical limit by +3 pax. Digital signs set to diversion warning.',
      severity: 'CRITICAL',
    },
  ]);

  // Load telemetry data from API or seamless local simulation
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [statusData, trendsData, alertsData] = await Promise.all([
          fetchLiveStatus(),
          fetchTrends(15),
          fetchAlerts(),
        ]);

        if (isMounted) {
          setDashboardData(statusData);
          setTrendsSeries(trendsData.series);
          setAlerts(alertsData);
        }
      } catch (err) {
        console.error('Failed to load crowd telemetry:', err);
      }
    };

    // Initial load
    loadData();

    // Poll every 2.0 seconds for real-time dashboard updates
    const interval = setInterval(loadData, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const appendAuditLog = (
    action_type: AuditLogEntry['action_type'],
    description: string,
    details: string,
    zone_code?: string,
    severity: AuditLogEntry['severity'] = 'ACTION'
  ) => {
    const newEntry: AuditLogEntry = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      operator: user?.username || 'ANONYMOUS',
      role: role || 'GUEST',
      action_type,
      zone_code,
      description,
      details,
      severity,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleLogout = async () => {
    await logout();
    appendAuditLog('SYSTEM', 'Operator signed out of session', 'HttpOnly JWT cookie cleared', undefined, 'INFO');
  };

  const handleQuickRoleSwitch = async (targetRole: 'ADMIN' | 'OPERATOR' | 'ANALYST') => {
    const username = targetRole.toLowerCase();
    const password = targetRole === 'ADMIN' ? 'Admin123!' : targetRole === 'ANALYST' ? 'Analyst123!' : 'Operator123!';
    try {
      const newUser = await login(username, password);
      appendAuditLog(
        'SYSTEM',
        `RBAC switched to ${targetRole} (${newUser.username})`,
        `JWT role updated. Active permissions adjusted.`,
        undefined,
        'INFO'
      );
    } catch (err) {
      console.error('Failed to quick switch role:', err);
    }
  };

  const totalCapacity = DEFAULT_ZONES_CONFIG.reduce((sum, z) => sum + z.capacity, 0);

  const zones: ZoneLiveStatus[] = dashboardData?.zones || DEFAULT_ZONES_CONFIG.map((z) => ({
    ...z,
    current_count: 0,
    density: 0,
    capacity_percent: 0,
    status: 'Normal',
    active_model: 'YOLO',
    over_threshold_seconds: 0,
  }));

  const activeModel: ModelType = dashboardData?.active_model || 'YOLO';
  const totalPeople = dashboardData?.headline_metrics.total_people ?? 0;
  const zonesAboveNormal = dashboardData?.headline_metrics.zones_above_normal ?? 0;
  const activeAlertsCount = alerts.filter((a) => a.status === 'active' || a.status === 'confirmed').length;

  const handleConfirmAlert = async (alertId: number) => {
    const alert = alerts.find((a) => a.id === alertId);
    await updateAlertStatus(alertId, 'confirmed', 'Threat confirmed by operator review');
    const updated = await fetchAlerts();
    setAlerts(updated);

    appendAuditLog(
      'CONFIRM',
      `Operator confirmed threat for Alert #${alertId} (${alert?.zone_code || 'Zone'})`,
      `Crowd count: ${alert?.count || 'N/A'}, Threshold: ${alert?.threshold || 'N/A'}. 60s persistence verified.`,
      alert?.zone_code,
      'ACTION'
    );
  };

  const handleDismissAlert = async (alertId: number) => {
    const alert = alerts.find((a) => a.id === alertId);
    await updateAlertStatus(alertId, 'dismissed', 'Dismissed by operator: false surge');
    const updated = await fetchAlerts();
    setAlerts(updated);

    appendAuditLog(
      'DISMISS',
      `Operator dismissed Alert #${alertId} (${alert?.zone_code || 'Zone'})`,
      'Classified as transient photo surge subsiding within normal safety envelope.',
      alert?.zone_code,
      'INFO'
    );
  };

  const handleEscalateAlert = async (alertId: number, notes?: string) => {
    const summary = await escalateAlert(alertId, notes);
    const updated = await fetchAlerts();
    setAlerts(updated);

    appendAuditLog(
      'ESCALATE',
      `Tactical escalation dispatched for Alert #${alertId} (${summary.zone_code})`,
      `Logged to terminal. Notes: ${notes || 'Immediate crowd dispersal recommended.'} Density: ${summary.density_per_sqm} p/m²`,
      summary.zone_code,
      'CRITICAL'
    );

    return summary;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Control Room Navbar with Role-Aware Tab Visibility & Quick Role Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeModel={activeModel}
        activeAlertsCount={activeAlertsCount}
        currentUser={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onQuickRoleSwitch={handleQuickRoleSwitch}
      />

      {/* Main Tab View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Headline Metrics Bar (rendered across Overview, Zones, Density, and Camera Health) */}
        {['overview', 'zones', 'density_trends', 'camera_health'].includes(activeTab) && (
          <MetricsBar
            totalPeople={totalPeople}
            zonesAboveNormal={zonesAboveNormal}
            totalZones={DEFAULT_ZONES_CONFIG.length}
            activeAlerts={activeAlertsCount}
            activeModel={activeModel}
            totalCapacity={totalCapacity}
          />
        )}

        {/* Dynamic Zone Studio / New Setup (Restricted to ADMIN) */}
        {activeTab === 'zone_studio' && (
          <ProtectedRoute
            allowedRoles={['ADMIN']}
            moduleName="Zone Studio (Polygon Configuration & Media Upload)"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <ZoneStudioView
              onConfigurationDeployed={(videoName) => {
                appendAuditLog(
                  'CONFIG_UPDATE',
                  `New dynamic camera setup deployed for '${videoName}'`,
                  'Custom polygon coordinates registered to database.',
                  undefined,
                  'ACTION'
                );
                setActiveTab('overview');
              }}
            />
          </ProtectedRoute>
        )}

        {/* 1. Overview & Single Camera Feed */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <CameraFeed
              zones={zones}
              activeModel={activeModel}
              onSelectZone={setSelectedZoneCode}
              selectedZoneCode={selectedZoneCode}
            />

            <ZonesTable
              zones={zones}
              onSelectZone={setSelectedZoneCode}
              selectedZoneCode={selectedZoneCode}
            />
          </div>
        )}

        {/* 2. Detailed Zones Tab */}
        {activeTab === 'zones' && (
          <div className="space-y-6">
            <ZonesTable
              zones={zones}
              onSelectZone={setSelectedZoneCode}
              selectedZoneCode={selectedZoneCode}
            />

            <TrendChart series={trendsSeries} timeWindowMinutes={15} />
          </div>
        )}

        {/* 3. Density & Trends (5-Minute Baseline Comparison) */}
        {activeTab === 'density_trends' && (
          <DensityTrendsView zones={zones} trendsSeries={trendsSeries} />
        )}

        {/* Pillar 2: Historical Time-Series Telemetry & Recharts Analytics (ANALYST & ADMIN) */}
        {activeTab === 'historical_analytics' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'ANALYST']}
            moduleName="Time-Series Historical Telemetry Analytics"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <HistoricalAnalyticsView cameraId="TSQ-CAM-01" />
          </ProtectedRoute>
        )}

        {/* 4. Alerts Queue (OPERATOR & ADMIN only) */}
        {activeTab === 'alerts' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'OPERATOR']}
            moduleName="Live Alerts Queue & Operational Dispatch"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <AlertsQueue
              alerts={alerts}
              onConfirmAlert={handleConfirmAlert}
              onDismissAlert={handleDismissAlert}
              onEscalateAlert={handleEscalateAlert}
            />
          </ProtectedRoute>
        )}

        {/* 5. Tactical Escalation View (OPERATOR & ADMIN only) */}
        {activeTab === 'escalation' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'OPERATOR']}
            moduleName="Tactical Dispersal Escalation Operations"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <EscalationView alerts={alerts} onEscalateAlert={handleEscalateAlert} />
          </ProtectedRoute>
        )}

        {/* 6. Incident Forensic Replay */}
        {activeTab === 'replay' && <ReplayView />}

        {/* 7. Camera Health & Hardware Pipeline (OPERATOR & ADMIN only) */}
        {activeTab === 'camera_health' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'OPERATOR']}
            moduleName="Camera Telemetry & Real-Time Pipeline Health"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <CameraHealthView />
          </ProtectedRoute>
        )}

        {/* 8. Evaluation & Ground-Truth Benchmarks (MAE, MAPE, Bias) */}
        {activeTab === 'evaluation' && <EvaluationView />}

        {/* 9. Methodology & Architecture Guide */}
        {activeTab === 'methodology' && <MethodologyView />}

        {/* 10. System Settings (Restricted to ADMIN only) */}
        {activeTab === 'settings' && (
          <ProtectedRoute
            allowedRoles={['ADMIN']}
            moduleName="System Settings & External Webhook Engine"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <SettingsView
              onSaveAuditLog={(action, details) =>
                appendAuditLog('CONFIG_UPDATE', action, details, undefined, 'WARN')
              }
            />
          </ProtectedRoute>
        )}

        {/* 11. Immutable Audit Log (OPERATOR & ADMIN) */}
        {activeTab === 'audit_log' && (
          <ProtectedRoute
            allowedRoles={['ADMIN', 'OPERATOR']}
            moduleName="Immutable Control Room Audit Log"
            onOpenAuth={() => setIsAuthModalOpen(true)}
          >
            <AuditLogView logs={auditLogs} />
          </ProtectedRoute>
        )}
      </main>

      {/* System Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-3 text-center text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            Crowd Monitor MVP | Strictly Single-Camera Architecture (TSQ-CAM-01)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Role: <strong className="text-zinc-300 font-mono">{role || 'ANONYMOUS'}</strong> | Hysteresis: YOLO (&lt;35) ⇋ DM-Count (&ge;45)
          </span>
        </div>
      </footer>

      {/* Operator Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(u) => {
          appendAuditLog(
            'SYSTEM',
            `User '${u.username}' signed in (${u.role})`,
            'HttpOnly JWT session active with control room server.',
            undefined,
            'INFO'
          );
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ControlRoomContent />
    </AuthProvider>
  );
}
