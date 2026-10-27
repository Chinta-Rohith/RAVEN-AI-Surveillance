import React, { useState, useEffect } from 'react';
import type { TelemetryPayload } from '../types/raven';
import {
  sendManualPTZ,
  fetchCameraDiagnostics,
  toggleAutoTrack
} from '../services/api';
import {
  Camera,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  ZoomIn,
  ZoomOut,
  Info,
  RefreshCw
} from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const CameraPTZPage: React.FC<Props> = ({ telemetry }) => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [stepSize, setStepSize] = useState<number>(5.0);
  const [autoTrack, setAutoTrack] = useState<boolean>(true);
  const [loadingDiag, setLoadingDiag] = useState<boolean>(false);

  const loadDiagnostics = async () => {
    setLoadingDiag(true);
    try {
      const data = await fetchCameraDiagnostics();
      setDiagnostics(data);
      if (data.auto_track_enabled !== undefined) {
        setAutoTrack(data.auto_track_enabled);
      }
    } catch (err) {
      console.error('Failed to load camera diagnostics', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const handleJog = async (action: string) => {
    await sendManualPTZ(action, stepSize);
  };

  const handleToggleAutoTrack = async () => {
    const next = !autoTrack;
    setAutoTrack(next);
    await toggleAutoTrack(next);
  };

  const ptz = telemetry?.ptz;
  const isSimulated = (ptz?.mode ?? 'SIMULATION') === 'SIMULATION';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="enterprise-card p-6 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Pan-Tilt-Zoom Servo Interface</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">ONVIF Profile S &amp; Simulation Kinematics</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Camera Management &amp; PTZ Control
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Proportional servo centering loop based on 10% frame boundary margin triggers, with manual override controls and hardware diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
              isSimulated
                ? 'bg-amber-950/40 text-amber-300 border-amber-700/60'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-700/60'
            }`}>
              {isSimulated ? 'Simulation Mode Active' : 'Hardware ONVIF Connected'}
            </span>
            <button
              onClick={loadDiagnostics}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Refresh Diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDiag ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Manual D-Pad & Servos */}
        <div className="lg:col-span-6 space-y-6">
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Gimbal Orientation &amp; Jog Controls</h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Auto-Tracking:</span>
                <button
                  onClick={handleToggleAutoTrack}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer ${
                    autoTrack
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {autoTrack ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="enterprise-card-body space-y-5">
              {/* Telemetry Readouts */}
              <div className="grid grid-cols-3 gap-3 text-center font-mono">
                <div className="p-3 enterprise-subcard">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Pan (Azimuth)</span>
                  <span className="text-xl font-bold text-slate-100">{ptz?.pan_deg.toFixed(1) ?? '0.0'}°</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Range: -180° to +180°</span>
                </div>
                <div className="p-3 enterprise-subcard">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tilt (Elevation)</span>
                  <span className="text-xl font-bold text-slate-100">{ptz?.tilt_deg.toFixed(1) ?? '0.0'}°</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Range: -90° to +90°</span>
                </div>
                <div className="p-3 enterprise-subcard">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Zoom Ratio</span>
                  <span className="text-xl font-bold text-cyan-400">{ptz?.zoom_level.toFixed(1) ?? '1.0'}x</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Step: 0.5x</span>
                </div>
              </div>

              {/* Step Resolution Selector */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Movement Step Size:</span>
                <div className="flex gap-1.5 font-mono">
                  {[1.0, 5.0, 15.0].map((step) => (
                    <button
                      key={step}
                      onClick={() => setStepSize(step)}
                      className={`px-2.5 py-1 rounded text-xs border cursor-pointer transition-colors ${
                        stepSize === step
                          ? 'bg-cyan-600 text-white border-cyan-500 font-semibold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {step}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Directional Jogger D-Pad */}
              <div className="flex flex-col items-center gap-2 py-2">
                <button
                  onClick={() => handleJog('TILT_UP')}
                  className="w-14 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                  title="Tilt Up"
                >
                  <ArrowUp className="w-5 h-5 text-slate-200" />
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleJog('PAN_LEFT')}
                    className="w-14 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                    title="Pan Left"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-200" />
                  </button>
                  <button
                    onClick={() => handleJog('HOME')}
                    className="w-14 h-10 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-800/60 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs font-mono font-bold shadow-sm"
                    title="Return to Boresight Home (0°, 0°)"
                  >
                    <Home className="w-4 h-4 mr-1" />
                    0°
                  </button>
                  <button
                    onClick={() => handleJog('PAN_RIGHT')}
                    className="w-14 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                    title="Pan Right"
                  >
                    <ArrowRight className="w-5 h-5 text-slate-200" />
                  </button>
                </div>

                <button
                  onClick={() => handleJog('TILT_DOWN')}
                  className="w-14 h-10 bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-slate-200 border border-slate-700 rounded-lg flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                  title="Tilt Down"
                >
                  <ArrowDown className="w-5 h-5 text-slate-200" />
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    onClick={() => handleJog('ZOOM_IN')}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4 text-cyan-400" />
                    <span>Zoom In (+0.5x)</span>
                  </button>
                  <button
                    onClick={() => handleJog('ZOOM_OUT')}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4 text-cyan-400" />
                    <span>Zoom Out (-0.5x)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Camera & Hardware Diagnostics */}
        <div className="lg:col-span-6 space-y-6">
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Hardware &amp; Stream Diagnostics</h2>
              </div>
              <span className="badge-online px-2 py-0.5 rounded text-xs">
                {diagnostics?.stream_health || 'Active'}
              </span>
            </div>

            <div className="enterprise-card-body space-y-4">
              <div className="enterprise-subcard p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Active Video Source:</span>
                  <span className="font-semibold text-slate-200">{diagnostics?.source_type?.toUpperCase() || 'SYNTHETIC'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Stream Resolution:</span>
                  <span className="font-mono text-slate-200">{diagnostics?.resolution || '1280x720'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Inference Stream Rate:</span>
                  <span className="font-mono text-emerald-400 font-bold">{telemetry?.performance.fps ?? 0} FPS</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">PTZ Integration Mode:</span>
                  <span className="font-mono text-amber-400 font-semibold">{diagnostics?.ptz_mode || 'SIMULATION'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">ONVIF Network Host:</span>
                  <span className="font-mono text-slate-400">{diagnostics?.onvif_host || 'None (Simulation Default)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Boundary Trigger Margin:</span>
                  <span className="font-mono text-cyan-400 font-semibold">{((diagnostics?.boundary_ratio ?? 0.10) * 100).toFixed(0)}% of image edges</span>
                </div>
              </div>

              {/* Informational Callout */}
              <div className="p-3.5 enterprise-subcard text-xs text-slate-400 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>ONVIF Hardware Integration Protocol</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  To connect a physical ONVIF-compatible PTZ camera, configure the environment variables <code>ONVIF_HOST</code>, <code>ONVIF_PORT</code>, <code>ONVIF_USERNAME</code>, and <code>ONVIF_PASSWORD</code>. When unconfigured, the system runs safely in precision simulation kinematics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
