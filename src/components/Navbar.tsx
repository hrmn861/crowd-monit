import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Camera,
  Activity,
  Layers,
  TrendingUp,
  Bell,
  Send,
  Film,
  HeartPulse,
  Target,
  BookOpen,
  Settings,
  FileText,
  Clock,
  Radio,
  Cpu,
  PenTool,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { ModelType, NavigationTab, User } from '../types.ts';
import { SystemHealthBadge } from './SystemHealthBadge.tsx';

interface NavbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeModel: ModelType;
  activeAlertsCount: number;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onQuickRoleSwitch?: (role: 'ADMIN' | 'OPERATOR' | 'ANALYST') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeModel,
  activeAlertsCount,
  currentUser,
  onOpenAuth,
  onLogout,
  onQuickRoleSwitch,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentRole = currentUser?.role ? currentUser.role.toUpperCase() : 'ANONYMOUS';
  const isAdmin = currentRole === 'ADMIN';
  const isOperator = currentRole === 'OPERATOR';
  const isAnalyst = currentRole === 'ANALYST';

  // Define full tab catalog with RBAC permissions
  const allNavItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    highlight?: boolean;
    allowedRoles?: ('ADMIN' | 'OPERATOR' | 'ANALYST')[];
  }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    {
      id: 'zone_studio',
      label: 'Zone Studio (Admin)',
      icon: <PenTool className="w-3.5 h-3.5 text-blue-400" />,
      highlight: true,
      allowedRoles: ['ADMIN'], // Restricted to ADMIN only
    },
    { id: 'zones', label: 'Zones', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'density_trends', label: 'Density & Trends', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    {
      id: 'historical_analytics',
      label: 'Historical Analytics',
      icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />,
      allowedRoles: ['ADMIN', 'ANALYST'],
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: <Bell className="w-3.5 h-3.5" />,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
      allowedRoles: ['ADMIN', 'OPERATOR'],
    },
    {
      id: 'escalation',
      label: 'Escalation',
      icon: <Send className="w-3.5 h-3.5" />,
      allowedRoles: ['ADMIN', 'OPERATOR'],
    },
    { id: 'replay', label: 'Replay', icon: <Film className="w-3.5 h-3.5" /> },
    {
      id: 'camera_health',
      label: 'Camera Health',
      icon: <HeartPulse className="w-3.5 h-3.5" />,
      allowedRoles: ['ADMIN', 'OPERATOR'],
    },
    { id: 'evaluation', label: 'Evaluation', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'methodology', label: 'Methodology', icon: <BookOpen className="w-3.5 h-3.5" /> },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-3.5 h-3.5" />,
      allowedRoles: ['ADMIN'], // Restricted to ADMIN only
    },
    {
      id: 'audit_log',
      label: 'Audit Log',
      icon: <FileText className="w-3.5 h-3.5" />,
      allowedRoles: ['ADMIN', 'OPERATOR'],
    },
  ];

  // Role-aware navigation: Filter items according to active role
  const visibleNavItems = allNavItems.filter((item) => {
    if (!item.allowedRoles) return true; // Available to all authenticated/public tabs
    if (!currentUser) return false;
    return item.allowedRoles.includes(currentRole as any);
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-950/80 border-purple-600/60 text-purple-300';
      case 'OPERATOR':
        return 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300';
      case 'ANALYST':
        return 'bg-cyan-950/80 border-cyan-600/60 text-cyan-300';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
  };

  return (
    <header className="bg-zinc-950 border-b border-zinc-800 text-zinc-100 select-none sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Branding & Status Row */}
        <div className="flex items-center justify-between h-14">
          {/* Brand & Feed Tag */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold tracking-wider uppercase text-zinc-100 font-mono">
                    Crowd Monitor
                  </h1>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">
                    Enterprise RBAC
                  </span>
                </div>
              </div>
            </div>

            {/* Single Camera Constraint Indicator */}
            <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-zinc-800 text-xs">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                <Camera className="w-3 h-3 text-blue-400" />
                <span className="font-mono text-blue-300 font-semibold">TSQ-CAM-01</span>
                <span className="text-zinc-500 text-[10px]">North View</span>
                <span className="text-[9px] uppercase font-mono px-1 bg-blue-950 text-blue-300 rounded border border-blue-800/60">
                  Fixed
                </span>
              </div>
            </div>
          </div>

          {/* Model Status, Auth & Clock */}
          <div className="flex items-center gap-2.5">
            {/* System Performance & Latency Telemetry Badge */}
            <SystemHealthBadge />

            {/* Vision Model Hysteresis Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors ${
                activeModel === 'DM-Count'
                  ? 'bg-purple-950/40 border-purple-600/50 text-purple-300'
                  : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
              }`}
              title="Dynamic model switching via count hysteresis (>=45 DM-Count, <35 YOLO)"
            >
              <Cpu className="w-3 h-3 animate-pulse" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 uppercase hidden sm:inline">Model:</span>
                <span className="font-bold">{activeModel}</span>
              </div>
            </div>

            {/* RBAC Operator Auth Dropdown & Quick Switch */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`flex items-center gap-2 border rounded-md px-2.5 py-1 text-xs font-mono transition-colors ${getRoleBadgeStyle(
                    currentRole
                  )}`}
                  title="Click to switch RBAC roles or sign out"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="font-bold">{currentUser.username}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 font-mono font-semibold">
                    {currentRole}
                  </span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {/* Quick Role Switch Popover */}
                {isRoleDropdownOpen && (
                  <div
                    className="absolute right-0 mt-1.5 w-60 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-1 text-xs font-mono"
                    onMouseLeave={() => setIsRoleDropdownOpen(false)}
                  >
                    <div className="px-2 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-400">
                      <span>Signed in as </span>
                      <strong className="text-zinc-200">{currentUser.username}</strong>
                    </div>

                    <div className="py-1">
                      <div className="px-2 py-1 text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Quick Role Switch (Demo)</span>
                      </div>
                      <button
                        onClick={() => {
                          onQuickRoleSwitch?.('ADMIN');
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                          currentRole === 'ADMIN'
                            ? 'bg-purple-950/70 text-purple-300 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>ADMIN (Full System)</span>
                        {currentRole === 'ADMIN' && <span className="text-[10px]">Active</span>}
                      </button>
                      <button
                        onClick={() => {
                          onQuickRoleSwitch?.('OPERATOR');
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                          currentRole === 'OPERATOR'
                            ? 'bg-emerald-950/70 text-emerald-300 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>OPERATOR (Control Room)</span>
                        {currentRole === 'OPERATOR' && <span className="text-[10px]">Active</span>}
                      </button>
                      <button
                        onClick={() => {
                          onQuickRoleSwitch?.('ANALYST');
                          setIsRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md flex items-center justify-between transition-colors ${
                          currentRole === 'ANALYST'
                            ? 'bg-cyan-950/70 text-cyan-300 font-bold'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span>ANALYST (Trends & Benchmarks)</span>
                        {currentRole === 'ANALYST' && <span className="text-[10px]">Active</span>}
                      </button>
                    </div>

                    <div className="pt-1 border-t border-zinc-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onOpenAuth();
                        }}
                        className="text-zinc-400 hover:text-blue-400 px-2 py-1 text-[11px]"
                      >
                        Auth Details
                      </button>
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          onLogout();
                        }}
                        className="text-red-400 hover:text-red-300 px-2 py-1 text-[11px] flex items-center gap-1"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950 border border-blue-800/80 text-blue-300 hover:bg-blue-900/60 text-xs font-mono transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}

            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{timeStr || '00:00:00'}</span>
            </div>

            {/* Live Stream Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <Radio className="w-2.5 h-2.5 text-red-500 animate-ping" />
              <span className="text-[10px] font-mono font-medium text-red-400 uppercase tracking-wider">
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Full Horizontal Navigation Bar with RBAC Filtering */}
        <nav
          className="flex space-x-0.5 border-t border-zinc-800/80 overflow-x-auto py-1 scrollbar-none"
          aria-label="Navigation Tabs"
        >
          {visibleNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors relative shrink-0 ${
                  isActive
                    ? 'bg-zinc-800 text-blue-400 font-bold border border-zinc-700'
                    : item.highlight
                    ? 'text-blue-300 bg-blue-950/30 hover:bg-blue-950/60 border border-blue-800/50'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-red-600 text-white font-mono animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
