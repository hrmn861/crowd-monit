import React from 'react';
import { ShieldAlert, Lock, LogIn, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // e.g. ['ADMIN'], ['ADMIN', 'OPERATOR'], ['ADMIN', 'ANALYST']
  moduleName?: string;
  onOpenAuth?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  moduleName = 'Protected Module',
  onOpenAuth,
}) => {
  const { user, role, isAuthenticated, isLoading, hasRole, login } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] border border-zinc-800 rounded-xl bg-zinc-900/40 p-8 text-center animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-3"></div>
        <p className="text-xs font-mono text-zinc-400">Verifying security credentials & RBAC clearance...</p>
      </div>
    );
  }

  // Case 1: Unauthenticated user
  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-xl mx-auto my-12 border border-zinc-800 rounded-xl bg-zinc-900/90 shadow-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 border-b border-zinc-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-mono">Authentication Required (401)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Access to {moduleName} is restricted to verified control room personnel.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Please log in with your assigned credentials to establish an authenticated session.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Control Room
              </button>
            )}
            <button
              onClick={() => login('admin', 'Admin123!')}
              className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              Quick Demo Login (ADMIN)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Role check failed (403 Forbidden)
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    const requiredRolesStr = allowedRoles.join(' or ');
    return (
      <div className="max-w-2xl mx-auto my-12 border border-red-900/60 rounded-xl bg-zinc-900/95 shadow-2xl overflow-hidden animate-in fade-in duration-200">
        <div className="p-6 bg-gradient-to-r from-red-950/80 via-zinc-900 to-zinc-950 border-b border-red-900/40 flex items-center gap-3">
          <div className="p-3 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-bold uppercase tracking-wider">
                HTTP 403 FORBIDDEN
              </span>
              <h3 className="text-base font-bold text-zinc-100 font-mono">Insufficient Security Clearance</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Your role <span className="text-amber-400 font-mono font-bold">[{role}]</span> does not possess permission to access <span className="text-zinc-200 font-semibold">{moduleName}</span>.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Required Role:</span>
              <span className="text-emerald-400 font-bold">{requiredRolesStr}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Active Operator:</span>
              <span className="text-zinc-200 font-bold">{user.username} ({user.email})</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Access Control Policy:</span>
              <span className="text-blue-400">Role-Based Access Control (RBAC) via HttpOnly JWT</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs">
            <p className="leading-relaxed">
              <strong>Need access?</strong> Switch to an account with <strong>{requiredRolesStr}</strong> privileges using the quick demo switches below:
            </p>
          </div>

          <div className="pt-2 flex flex-wrap gap-2.5">
            {allowedRoles.includes('ADMIN') && (
              <button
                type="button"
                onClick={() => login('admin', 'Admin123!')}
                className="flex-1 min-w-[160px] py-2 px-3 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 text-purple-200 font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Switch to ADMIN (admin)
              </button>
            )}
            {allowedRoles.includes('OPERATOR') && (
              <button
                type="button"
                onClick={() => login('operator', 'Operator123!')}
                className="flex-1 min-w-[160px] py-2 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Switch to OPERATOR (operator)
              </button>
            )}
            {allowedRoles.includes('ANALYST') && (
              <button
                type="button"
                onClick={() => login('analyst', 'Analyst123!')}
                className="flex-1 min-w-[160px] py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/60 text-cyan-200 font-mono text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                Switch to ANALYST (analyst)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authorized: render protected content
  return <>{children}</>;
};
