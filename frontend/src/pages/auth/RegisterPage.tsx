import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Info
} from 'lucide-react';

interface Props {
  onNavigate: (view: string) => void;
}

export const RegisterPage: React.FC<Props> = ({ onNavigate }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strength checks
  const hasMinLen = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasSpecialOrDigit = /[\d\W_]/.test(password);
  const passwordsMatch = password && password === passwordConfirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLen || !hasLetter || !hasSpecialOrDigit) {
      setError('Password must be at least 8 characters and contain letters and numbers/symbols.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password, passwordConfirm);
      onNavigate('overview');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] flex flex-col justify-center selection:bg-sky-500 selection:text-white">
      {/* Top minimal brand header for mobile */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-slate-800/80 bg-[#0b1120]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white font-bold">
            <Shield className="w-3.5 h-3.5 fill-white/20" />
          </div>
          <span className="font-bold tracking-tight text-white text-sm">RAVEN</span>
        </div>
        <button
          onClick={() => onNavigate('landing')}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          ← Platform Overview
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Account Scope & Security Policy (Desktop Only) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-6 pr-6">
            <div className="space-y-4">
              <button
                onClick={() => onNavigate('landing')}
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-sky-300 transition-colors mb-2"
              >
                ← Return to Platform Overview
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold">
                  <Shield className="w-6 h-6 fill-white/20" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-white">RAVEN</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-mono font-medium">
                      Client Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-none">
                    Multi-Tenant Workspace Provisioning
                  </p>
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-white pt-2 leading-snug">
                Join the RAVEN AI Surveillance Platform
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Create your isolated client account to monitor optical and infrared streams, review DeepSORT tracking trajectories, and export session telemetry.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs text-slate-400">
              <div className="enterprise-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-300 font-semibold">
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>Least-Privilege Client Policy</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Public registration provisions a standard Client Workspace with isolated data access. Administrative roles are provisioned via controlled administrator setup.
                </p>
              </div>

              <div className="enterprise-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Email Verification Workflow</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Upon registration, a single-use verification link is dispatched to your registered address to confirm your identity.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span>Zero plain-text password storage (Argon2id encryption)</span>
            </div>
          </div>

          {/* Right Column: Clean Registration Form */}
          <div className="lg:col-span-7 w-full max-w-lg mx-auto">
            <div className="enterprise-card p-7 sm:p-9 shadow-2xl border-slate-800">
              <div className="mb-6">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Create Client Account
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your details to initialize your authorized surveillance workspace.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="enterprise-input pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@organization.com"
                      className="enterprise-input pl-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="enterprise-input pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="••••••••••••"
                        className="enterprise-input pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="enterprise-subcard p-3 rounded space-y-1.5 text-[11px] text-slate-400">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
                    Password Security Requirements
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={hasMinLen ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                        {hasMinLen ? '✓' : '•'}
                      </span>
                      <span>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={hasLetter ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                        {hasLetter ? '✓' : '•'}
                      </span>
                      <span>Contains letters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={hasSpecialOrDigit ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                        {hasSpecialOrDigit ? '✓' : '•'}
                      </span>
                      <span>Numbers / symbols</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={passwordsMatch ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                        {passwordsMatch ? '✓' : '•'}
                      </span>
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mt-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Already registered?{' '}
                  <button
                    onClick={() => onNavigate('login')}
                    className="text-sky-400 font-semibold hover:text-sky-300 transition-colors"
                  >
                    Sign In
                  </button>
                </p>
                <div className="mt-3 lg:hidden">
                  <button
                    onClick={() => onNavigate('landing')}
                    className="text-[11px] text-slate-500 hover:text-slate-400"
                  >
                    ← Back to Platform Overview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
