import React, { useState, useEffect } from 'react';
import { fetchConfig, updateConfig } from '../services/api';
import { tacticalAudio } from '../utils/tacticalAudio';
import { Sliders, Save, Check, RotateCcw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [alpha, setAlpha] = useState<number>(0.70);
  const [threshold, setThreshold] = useState<number>(0.50);
  const [boundary, setBoundary] = useState<number>(0.10);
  const [kpPan, setKpPan] = useState<number>(0.40);
  const [kpTilt, setKpTilt] = useState<number>(0.40);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      if (cfg) {
        if (cfg.ensemble_alpha !== undefined) setAlpha(cfg.ensemble_alpha);
        if (cfg.ensemble_threshold !== undefined) setThreshold(cfg.ensemble_threshold);
        if (cfg.boundary_ratio !== undefined) setBoundary(cfg.boundary_ratio);
        if (cfg.kp_pan !== undefined) setKpPan(cfg.kp_pan);
        if (cfg.kp_tilt !== undefined) setKpTilt(cfg.kp_tilt);
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    tacticalAudio.playClick();
    await updateConfig({
      ensemble_alpha: alpha,
      ensemble_threshold: threshold,
      boundary_ratio: boundary,
      kp_pan: kpPan,
      kp_tilt: kpTilt
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetDefaults = () => {
    tacticalAudio.playClick();
    setAlpha(0.70);
    setThreshold(0.50);
    setBoundary(0.10);
    setKpPan(0.40);
    setKpTilt(0.40);
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
            <Sliders className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-08 // C2 SYSTEM PARAMETERS & GIMBAL TUNING
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                FIRE-CONTROL TUNING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              REAL-TIME OPERATIONAL WEIGHTS FOR DeTrAck ENSEMBLE, DECISION CUTOFFS, AND PROPORTIONAL SERVO GAINS
            </p>
          </div>
        </div>
      </div>

      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-col gap-6 font-mono text-xs">
        {/* 2. Ensemble Formulation Console */}
        <div className="tactical-subpanel p-4 rounded border border-[#172236] space-y-4">
          <div className="flex items-center justify-between border-b border-[#141d2c] pb-2">
            <h3 className="text-slate-100 font-bold uppercase">1. ENSEMBLE DECISION FORMULATION</h3>
            <span className="text-[10px] text-amber-400 font-bold">IEEE ACCESS 2025</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            MATHEMATICAL MODEL: <code className="text-amber-400 font-bold bg-[#060a12] px-2 py-0.5 rounded border border-[#1a2538]">S_Ens = α · S_YOLO + (1 - α) · S_VaL</code>
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">ENSEMBLE ALPHA WEIGHT (α):</span>
                <span className="text-amber-400 font-black text-sm">{alpha.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={alpha}
                onChange={(e) => setAlpha(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.0 (VaL_CNN ONLY)</span>
                <span className="text-amber-400 font-bold">0.70 (DeTrAck SPEC)</span>
                <span>1.0 (YOLO11 ONLY)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">DECISION ACCEPTANCE THRESHOLD:</span>
                <span className="text-emerald-400 font-black text-sm">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.10 (HIGH RECALL)</span>
                <span className="text-emerald-400 font-bold">0.50 (BALANCED)</span>
                <span>0.90 (STRICT PRECISION)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. PTZ Gimbal & Closed-Loop Servos */}
        <div className="tactical-subpanel p-4 rounded border border-[#172236] space-y-4">
          <div className="flex items-center justify-between border-b border-[#141d2c] pb-2">
            <h3 className="text-slate-100 font-bold uppercase">2. PTZ GIMBAL & FRAME BOUNDARY PARAMETERS</h3>
            <span className="text-[10px] text-cyan-400 font-bold">CLOSED-LOOP AUTONOMY</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300">FRAME BOUNDARY TRIGGER RATIO:</span>
              <span className="text-cyan-400 font-black text-sm">{(boundary * 100).toFixed(0)}% MARGIN</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.25"
              step="0.01"
              value={boundary}
              onChange={(e) => setBoundary(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              Paper defines a 10% (0.10) edge margin trigger for proportional pan/tilt centering.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">KP PAN PROPORTIONAL GAIN:</span>
                <span className="text-amber-400 font-bold">{kpPan.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.50"
                step="0.05"
                value={kpPan}
                onChange={(e) => setKpPan(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300">KP TILT PROPORTIONAL GAIN:</span>
                <span className="text-amber-400 font-bold">{kpTilt.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="1.50"
                step="0.05"
                value={kpTilt}
                onChange={(e) => setKpTilt(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4 fill-current" />}
            {isSaved ? 'PARAMETERS COMMITTED' : 'COMMIT CONFIGURATION'}
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 bg-[#0a101d] hover:bg-slate-800 text-slate-300 rounded flex items-center gap-1.5 border border-[#1e2a3f] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            RESET TO PAPER DEFAULTS
          </button>
        </div>
      </div>
    </div>
  );
};
