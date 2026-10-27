import React, { useState } from 'react';
import type { PTZStatus, PTZCommand, BoundaryStatus } from '../types/raven';
import { sendManualPTZ } from '../services/api';
import { tacticalAudio } from '../utils/tacticalAudio';
import {
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Props {
  ptz: PTZStatus | undefined;
  command: PTZCommand | undefined;
  boundary?: BoundaryStatus | undefined;
}

export const PTZControlPanel: React.FC<Props> = ({ ptz, command, boundary: _boundary }) => {
  const [stepSize, setStepSize] = useState<number>(5.0);

  const handleJog = async (action: string) => {
    tacticalAudio.playClick();
    await sendManualPTZ(action, stepSize);
  };

  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c283d] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
            <Compass className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">
              SEC-04 // PTZ SERVO GIMBAL & ONVIF
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              PROPORTIONAL AIR DEFENSE SERVO TRACKING (v_pan ∝ dx, v_tilt ∝ dy)
            </p>
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
            ptz?.mode === 'ONVIF'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : 'bg-amber-950 text-amber-300 border-amber-700'
          }`}
        >
          {ptz?.mode === 'ONVIF' ? 'HARDWARE ONVIF LINK' : 'SIMULATOR KINEMATICS'}
        </span>
      </div>

      {/* 2. Precision Telemetry Gauges */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono">
        <div className="tactical-subpanel p-2 rounded border border-[#1a2538]">
          <span className="text-[9px] text-slate-400 block tracking-wider uppercase">AZIMUTH (PAN)</span>
          <span className="text-base font-black text-amber-400">{ptz?.pan_deg.toFixed(1) ?? '0.0'}°</span>
        </div>
        <div className="tactical-subpanel p-2 rounded border border-[#1a2538]">
          <span className="text-[9px] text-slate-400 block tracking-wider uppercase">ELEVATION (TILT)</span>
          <span className="text-base font-black text-amber-400">{ptz?.tilt_deg.toFixed(1) ?? '0.0'}°</span>
        </div>
        <div className="tactical-subpanel p-2 rounded border border-[#1a2538]">
          <span className="text-[9px] text-slate-400 block tracking-wider uppercase">MAGNIFICATION</span>
          <span className="text-base font-black text-cyan-400">{ptz?.zoom_level.toFixed(1) ?? '1.0'}x</span>
        </div>
      </div>

      {/* 3. Real-time Controller Status Terminal */}
      <div className="tactical-subpanel p-2.5 rounded border border-[#1a2538] text-xs font-mono space-y-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400">AUTONOMOUS CONTROLLER:</span>
          <span className={`font-bold px-1.5 py-0.2 rounded border ${
            command?.action && command.action !== 'IDLE'
              ? 'bg-amber-950 text-amber-400 border-amber-700 animate-pulse'
              : 'bg-slate-900 text-slate-400 border-slate-700'
          }`}>
            {command?.action ?? 'IDLE SCAN'}
          </span>
        </div>
        <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed bg-[#050810] p-1.5 rounded border border-[#141d2c]">
          {command?.reason || 'Nominal patrol status. Target within 10% frame boundary margin.'}
        </p>
      </div>

      {/* 4. Operator Step Size Selector */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-[#162032] pt-2">
        <span>STEP RESOLUTION:</span>
        <div className="flex gap-1">
          {[1.0, 5.0, 15.0].map((step) => (
            <button
              key={step}
              onClick={() => {
                tacticalAudio.playClick();
                setStepSize(step);
              }}
              className={`px-2 py-0.5 rounded border ${
                stepSize === step
                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              {step}°
            </button>
          ))}
        </div>
      </div>

      {/* 5. Military Tactical Directional D-Pad */}
      <div className="flex flex-col items-center gap-1.5 pt-1">
        <button
          onClick={() => handleJog('TILT_UP')}
          className="w-12 h-8 bg-[#0d1626] hover:bg-slate-700 text-slate-100 rounded flex items-center justify-center border border-[#1e2a3f] active:bg-amber-600 transition-colors shadow"
          title="Tilt Up"
        >
          <ArrowUp className="w-4 h-4 text-amber-400" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleJog('PAN_LEFT')}
            className="w-12 h-8 bg-[#0d1626] hover:bg-slate-700 text-slate-100 rounded flex items-center justify-center border border-[#1e2a3f] active:bg-amber-600 transition-colors shadow"
            title="Pan Left"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
          </button>
          <button
            onClick={() => handleJog('HOME')}
            className="w-12 h-8 bg-[#0d1626] hover:bg-slate-700 text-amber-400 rounded flex items-center justify-center border border-amber-600/60 font-mono text-[10px] font-bold shadow"
            title="Return to Boresight (0°, 0°)"
          >
            <Home className="w-3.5 h-3.5 mr-0.5" />
            0°
          </button>
          <button
            onClick={() => handleJog('PAN_RIGHT')}
            className="w-12 h-8 bg-[#0d1626] hover:bg-slate-700 text-slate-100 rounded flex items-center justify-center border border-[#1e2a3f] active:bg-amber-600 transition-colors shadow"
            title="Pan Right"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        <button
          onClick={() => handleJog('TILT_DOWN')}
          className="w-12 h-8 bg-[#0d1626] hover:bg-slate-700 text-slate-100 rounded flex items-center justify-center border border-[#1e2a3f] active:bg-amber-600 transition-colors shadow"
          title="Tilt Down"
        >
          <ArrowDown className="w-4 h-4 text-amber-400" />
        </button>

        {/* Optical Zoom Servo Controls */}
        <div className="flex items-center gap-2 mt-2 w-full font-mono text-xs">
          <button
            onClick={() => handleJog('ZOOM_IN')}
            className="flex-1 py-1.5 bg-[#0d1626] hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 border border-[#1e2a3f] shadow"
          >
            <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold">ZOOM +</span>
          </button>
          <button
            onClick={() => handleJog('ZOOM_OUT')}
            className="flex-1 py-1.5 bg-[#0d1626] hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1.5 border border-[#1e2a3f] shadow"
          >
            <ZoomOut className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold">ZOOM -</span>
          </button>
        </div>
      </div>
    </div>
  );
};
