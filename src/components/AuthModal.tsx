import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, Mail, AlertCircle, KeyRound, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { loginApi, registerApi } from '../services/api.ts';
import { User } from '../types.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('operator');
  const [email, setEmail] = useState('operator@crowdmonitor.io');
  const [password, setPassword] = useState('Operator123!');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR' | 'ANALYST'>('OPERATOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await registerApi(username, email, password, role);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await loginApi(username, password);
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (userChoice: 'admin' | 'operator' | 'analyst') => {
    setError(null);
    setLoading(true);
    const pass = userChoice === 'admin' ? 'Admin123!' : userChoice === 'analyst' ? 'Analyst123!' : 'Operator123!';
    try {
      const res = await loginApi(userChoice, pass);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-950 via-zinc-900 to-zinc-950 p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                Crowd Monitor RBAC Portal
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                {isRegister ? 'Register new operator or administrator account' : 'HttpOnly Secure Cookie JWT Authentication'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-2 ${
              !isRegister
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold bg-zinc-900/50'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-3 text-center transition-colors flex items-center justify-center gap-2 ${
              isRegister
                ? 'text-blue-400 border-b-2 border-blue-500 font-bold bg-zinc-900/50'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. admin, operator, or analyst"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="operator@crowdmonitor.io"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">
                Role & Clearance Level
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="ADMIN">ADMIN - Full Setup, Thresholds, Cameras & Zones</option>
                <option value="OPERATOR">OPERATOR - Live Monitoring, Streams & Alert Dispatches</option>
                <option value="ANALYST">ANALYST - Historical Telemetry, Metrics & Benchmarks</option>
              </select>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-block animate-spin">⟳</span>
              ) : isRegister ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Authenticate & Enter Dashboard'}
            </button>

            {/* Quick Demo Access Buttons for 3 Roles */}
            {!isRegister && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-1">
                  Quick Demo RBAC Profiles:
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin')}
                    className="py-1.5 px-2 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 rounded border border-purple-800/60 transition-colors text-center font-bold"
                    title="User: admin / Pass: Admin123!"
                  >
                    ADMIN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('operator')}
                    className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded border border-emerald-800/60 transition-colors text-center font-bold"
                    title="User: operator / Pass: Operator123!"
                  >
                    OPERATOR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('analyst')}
                    className="py-1.5 px-2 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 rounded border border-cyan-800/60 transition-colors text-center font-bold"
                    title="User: analyst / Pass: Analyst123!"
                  >
                    ANALYST
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
          <span>HS256 JWT &bull; HttpOnly Lax Cookie</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
