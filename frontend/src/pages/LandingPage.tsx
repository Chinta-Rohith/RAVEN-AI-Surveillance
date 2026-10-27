import React from 'react';
import {
  Shield,
  Layers,
  Crosshair,
  Camera,
  Activity,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Compass
} from 'lucide-react';
import heroImage from '../assets/raven-login-hero.png';

interface Props {
  onNavigate: (view: string) => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* 1. Premium Enterprise Header */}
      <header className="h-16 bg-[#0b1120]/90 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold shrink-0">
            <Shield className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">RAVEN</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-mono font-medium">
                DeTrAck
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block leading-none">
              AI Surveillance Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('login')}
            className="btn-secondary text-xs px-3.5 py-1.5"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
          >
            <span>Create Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Section with Cinematic Surveillance Background Image */}
      <section className="relative w-full overflow-hidden border-b border-slate-800/80">
        {/* Background Image Container */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-opacity duration-500"
          style={{
            backgroundImage: `url(${heroImage}), url('/images/raven-login-hero.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />

        {/* Dark Navy Multi-Layer Gradient Overlays ensuring text contrast and readability */}
        <div className="absolute inset-0 bg-[#070b14]/80 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b14]/90 via-[#070b14]/70 to-[#070b14] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.14),transparent_65%)] pointer-events-none" />

        {/* Hero Content Area */}
        <div className="relative z-10 pt-16 pb-20 px-6 sm:px-12 max-w-6xl mx-auto text-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/70 border border-sky-700/60 text-sky-300 text-xs font-medium backdrop-blur-sm shadow-lg shadow-sky-950/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span>IEEE Access 2025 Research Methodology</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight drop-shadow-md">
              Real-Time Vision. Intelligent Detection. <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]">Persistent Tracking.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300/90 max-w-2xl mx-auto leading-relaxed drop-shadow-sm font-normal">
              Engineered for high-reliability airspace surveillance, RAVEN pairs the <strong>DeTrAck</strong> dual-stage neural ensemble with DeepSORT Kalman tracking. Proposal candidates from YOLO11s are verified against a dedicated 64×64 ROI classification network (VaL_CNN) to reject false alarms before driving automated PTZ camera tracking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto btn-primary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
              >
                <span>Access Client Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto btn-secondary px-6 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 backdrop-blur-sm bg-slate-900/80"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Sign In</span>
              </button>
            </div>
          </div>

          {/* 3. Product Architecture Preview Mockup */}
          <div className="mt-14 relative z-10 bg-[#090e1a]/90 backdrop-blur-md rounded-xl p-3 sm:p-5 text-left border border-slate-700/60 shadow-2xl shadow-black/80">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">RAVEN // System Telemetry Stream</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ONLINE
                </span>
                <span>DeTrAck Dual-Stage Ensemble</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="enterprise-subcard p-3 bg-[#060912]/80 backdrop-blur-sm">
                <span className="text-slate-500 text-[10px] block">PRIMARY EXTRACTOR</span>
                <span className="text-slate-200 font-bold block mt-0.5">YOLO11s Detector</span>
                <span className="text-sky-400 text-[11px]">640×640 Candidate Proposals</span>
              </div>
              <div className="enterprise-subcard p-3 bg-[#060912]/80 backdrop-blur-sm">
                <span className="text-slate-500 text-[10px] block">VALIDATION FILTER</span>
                <span className="text-slate-200 font-bold block mt-0.5">VaL_CNN Classifier</span>
                <span className="text-emerald-400 text-[11px]">64×64 ROI Softmax Rejector</span>
              </div>
              <div className="enterprise-subcard p-3 bg-[#060912]/80 backdrop-blur-sm">
                <span className="text-slate-500 text-[10px] block">ENSEMBLE FORMULATION</span>
                <span className="text-slate-200 font-bold block mt-0.5">S_Ens = α·S_Y + (1-α)·S_V</span>
                <span className="text-amber-400 text-[11px]">α = 0.70 | Cutoff ≥ 0.50</span>
              </div>
              <div className="enterprise-subcard p-3 bg-[#060912]/80 backdrop-blur-sm">
                <span className="text-slate-500 text-[10px] block">PTZ GIMBAL STEERING</span>
                <span className="text-slate-200 font-bold block mt-0.5">10% Image Edge Trigger</span>
                <span className="text-purple-400 text-[11px]">Auto Centering Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DeTrAck Architecture Flow Banner */}
      <section className="py-12 px-6 sm:px-12 bg-[#090e1a] border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              DeTrAck End-to-End Processing Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Multi-stage validation methodology specified in the IEEE Access 2025 reference paper
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
            <div className="enterprise-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 block mb-1">STAGE 1</span>
              <Camera className="w-5 h-5 text-slate-400 mx-auto my-1.5" />
              <span className="font-semibold text-white block">Video Ingestion</span>
              <span className="text-[10px] text-slate-500">RTSP / File / Webcam</span>
            </div>

            <div className="enterprise-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-sky-400 block mb-1">STAGE 2</span>
              <Layers className="w-5 h-5 text-sky-400 mx-auto my-1.5" />
              <span className="font-semibold text-white block">YOLO11s Extraction</span>
              <span className="text-[10px] text-slate-500">Candidate Bounding Boxes</span>
            </div>

            <div className="enterprise-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-400 block mb-1">STAGE 3</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto my-1.5" />
              <span className="font-semibold text-white block">VaL_CNN Filter</span>
              <span className="text-[10px] text-slate-500">64×64 ROI Softmax</span>
            </div>

            <div className="enterprise-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-amber-400 block mb-1">STAGE 4</span>
              <Activity className="w-5 h-5 text-amber-400 mx-auto my-1.5" />
              <span className="font-semibold text-white block">Ensemble &amp; DeepSORT</span>
              <span className="text-[10px] text-slate-500">S_Ens = 0.7·S_Y + 0.3·S_V</span>
            </div>

            <div className="enterprise-card p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-purple-400 block mb-1">STAGE 5</span>
              <Crosshair className="w-5 h-5 text-purple-400 mx-auto my-1.5" />
              <span className="font-semibold text-white block">PTZ Centering</span>
              <span className="text-[10px] text-slate-500">10% Image Edge Margin</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Key Feature Pillars */}
      <section className="py-16 px-6 sm:px-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="enterprise-card p-6 space-y-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 w-fit">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Dual-Stage Verification</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drastically reduces false alarms caused by birds, clouds, and complex terrain. YOLO11s extracts candidate boxes, while the secondary 5-layer CNN confirms target validity on 64×64 ROI patches before track creation.
            </p>
          </div>

          <div className="enterprise-card p-6 space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
              <Crosshair className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">DeepSORT Target Persistence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combines Kalman filter kinematics with cosine appearance embeddings to maintain consistent target identifiers across temporary occlusions and multi-drone crossings.
            </p>
          </div>

          <div className="enterprise-card p-6 space-y-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Gimbal Control &amp; Simulation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated re-centering triggers when a target enters within 10% of the image edge. Connects directly to ONVIF-compatible PTZ hardware or operates in Kinematic Simulation for lab evaluation.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Demonstration Mode & Methodology Scope */}
      <section className="py-10 px-6 sm:px-12 bg-[#090e1a] border-t border-slate-800">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Demonstration Mode &amp; Operational Scope</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform is designed for research evaluations and infrastructure surveillance demonstrations. If physical ONVIF hardware is not connected, the built-in Kinematic Simulation emulates pan/tilt servo physics with real-time feedback. User accounts, custom configurations, and audit reports are strictly isolated per client workspace.
          </p>
        </div>
      </section>

      {/* 7. Public Footer */}
      <footer className="py-6 px-6 sm:px-12 border-t border-slate-800 text-center text-xs text-slate-500">
        <p>© 2026 RAVEN AI Surveillance Platform. Academic Reference: IEEE Access 2025.</p>
        <p className="mt-1">Protected by Argon2id, JWT RBAC, and client multi-tenant data isolation.</p>
      </footer>
    </div>
  );
};
