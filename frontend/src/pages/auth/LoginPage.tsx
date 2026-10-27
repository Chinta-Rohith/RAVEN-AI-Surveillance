import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Crosshair,
  Cpu,
  Camera,
  Activity,
  ChevronRight
} from 'lucide-react';
import heroImage from '../../assets/raven-login-hero.png';

interface Props {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<Props> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both your work email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      onNavigate('overview');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#060a12] text-slate-100 overflow-x-hidden selection:bg-cyan-500 selection:text-white font-sans">
      
      {/* =========================================================================
          LEFT SIDE — RAVEN BRAND EXPERIENCE (~60% on desktop)
          Cinematic UAV Surveillance Hero with Computer-Vision HUD & Architecture
          ========================================================================= */}
      <div className="relative w-full lg:w-[58%] xl:w-[60%] flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 overflow-hidden min-h-[480px] lg:min-h-screen">
        
        {/* Background Hero Image with Fallbacks */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 scale-100"
          style={{
            backgroundImage: `url(${heroImage}), url('/images/raven-login-hero.png')`
          }}
        />

        {/* Cinematic Multi-Layer Dark Gradient & Vignette Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a12]/95 via-[#060a12]/80 to-[#070b14]/95 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-transparent to-[#060a12]/70 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(6,182,212,0.18),transparent_60%)] pointer-events-none" />

        {/* Subtle Computer-Vision HUD Grid & Telemetry Lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-full border border-cyan-500/20 m-3 sm:m-6 rounded-lg pointer-events-none" />
          {/* Corner Reticle Brackets */}
          <div className="absolute top-8 left-8 text-cyan-400 font-mono text-[10px] tracking-widest hidden sm:block">
            + [ SYS.ACQ // LAT: 34.0522° N | LON: 118.2437° W ]
          </div>
          <div className="absolute top-8 right-8 text-cyan-400 font-mono text-[10px] tracking-widest hidden sm:block">
            [ FOV: 64.8° // OPTICAL 4.2X ] +
          </div>
          <div className="absolute bottom-8 left-8 text-cyan-400 font-mono text-[10px] tracking-widest hidden sm:block">
            + [ KALMAN: PREDICTIVE // AZ: 142.4° EL: +24.8° ]
          </div>
        </div>

        {/* TOP BRAND HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 border border-cyan-400/30">
              <Shield className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-wider text-white">RAVEN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 font-mono font-medium tracking-wide">
                  DeTrAck
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                AI Surveillance Platform
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('landing')}
            className="group hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1.5 px-3 rounded-lg bg-slate-900/40 border border-slate-800/80 hover:border-cyan-500/40 backdrop-blur-sm"
          >
            <span>Overview</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* MIDDLE HERO CONTENT & HEADLINE */}
        <div className="relative z-10 my-8 sm:my-12 lg:my-auto max-w-2xl space-y-6">
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span>REAL-TIME AIRSPACE MONITORING ACTIVE</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            Real-Time Vision.<br />
            Intelligent Detection.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              Persistent Tracking.
            </span>
          </h1>

          {/* Architectural Description */}
          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal max-w-xl">
            Engineered for high-assurance perimeter defense and airspace security. 
            Integrates YOLO11 candidate localization with VaL_CNN neural validation, 
            DeepSORT kinematic tracking, and closed-loop ONVIF/PTZ camera servo control.
          </p>

          {/* 4 Compact Feature Indicators (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            
            {/* 1. UAV Detection — YOLO11 */}
            <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">UAV Detection</span>
                  <span className="text-[10px] text-cyan-400 font-mono font-medium">YOLO11</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight pl-9">
                Candidate extraction &amp; spatial bounding localization
              </p>
            </div>

            {/* 2. AI Validation — VaL_CNN */}
            <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">AI Validation</span>
                  <span className="text-[10px] text-blue-400 font-mono font-medium">VaL_CNN</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight pl-9">
                64×64 ROI verification filter to suppress false alarms
              </p>
            </div>

            {/* 3. Persistent Tracking — DeepSORT */}
            <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">Persistent Tracking</span>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">DeepSORT</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight pl-9">
                Kalman state prediction &amp; cosine Re-ID metric
              </p>
            </div>

            {/* 4. Camera Integration — PTZ/ONVIF */}
            <div className="p-3 rounded-xl bg-slate-900/60 backdrop-blur-md border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group">
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">Camera Integration</span>
                  <span className="text-[10px] text-purple-400 font-mono font-medium">PTZ / ONVIF</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight pl-9">
                Automated 10% boundary servo centering loop
              </p>
            </div>

          </div>
        </div>

        {/* BOTTOM TECHNICAL TELEMETRY */}
        <div className="relative z-10 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>PLATFORM SECURE • MULTI-TENANT ISOLATED</span>
          </div>
          <span>ARGON2ID • AES-256 JWT</span>
        </div>
      </div>


      {/* =========================================================================
          RIGHT SIDE — AUTHENTICATION PANEL (~40% on desktop)
          Translucent Charcoal Glassmorphism with Precision Cyan Accents
          ========================================================================= */}
      <div className="w-full lg:w-[42%] xl:w-[40%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-[#080d19]/95 lg:bg-[#070b14]/90 backdrop-blur-2xl border-l border-slate-800/80 relative z-20">
        
        {/* Subtle Radial Glow in Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.05),transparent_70%)] pointer-events-none" />

        {/* Mobile-Only Header Return */}
        <div className="sm:hidden flex items-center justify-between pb-6 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-white text-sm">RAVEN</span>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="text-xs text-slate-400 hover:text-white"
          >
            ← Overview
          </button>
        </div>

        {/* Top spacer on desktop */}
        <div className="hidden lg:block" />

        {/* CENTER AUTHENTICATION CARD */}
        <div className="w-full max-w-[400px] mx-auto my-auto relative z-10 py-6">
          <div className="bg-gradient-to-b from-[#0c1426]/85 to-[#070c18]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
            
            {/* Top Cyan Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

            {/* Product Mark & Heading */}
            <div className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Shield className="w-4 h-4 fill-cyan-400/20" />
                </div>
                <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                  Workspace Authentication
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Welcome back
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Sign in to access your RAVEN workspace.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Field */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@organization.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#050811]/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#050811]/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Session Option */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 focus:ring-offset-slate-900"
                  />
                  <span className="text-[11px] text-slate-400">Remember session</span>
                </label>
              </div>

              {/* Full-Width Cyan Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-cyan-500/25 border border-cyan-400/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider with "or" */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800/90" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#09101f] px-3 text-slate-500 font-mono text-[10px] tracking-wider">
                  or
                </span>
              </div>
            </div>

            {/* New to RAVEN Link */}
            <div className="text-center">
              <p className="text-xs text-slate-400">
                New to RAVEN?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors ml-1"
                >
                  Create an account
                </button>
              </p>
            </div>

          </div>

          {/* Small Footer */}
          <div className="mt-6 text-center space-y-1">
            <p className="text-[11px] font-medium text-slate-400 tracking-wide">
              RAVEN AI Surveillance Platform
            </p>
            <p className="text-[10px] text-slate-600">
              Real-Time Vision, Detection and Tracking Analytics
            </p>
          </div>
        </div>

        {/* Bottom Security Assurance Note */}
        <div className="text-center text-[11px] text-slate-600 hidden lg:block">
          Secured with Argon2id cryptographic password hashing &amp; tenant isolation.
        </div>

      </div>

    </div>
  );
};
