import React, { useState, useEffect } from 'react';
import { fetchConfig, updateConfig } from '../services/api';
import {
  Sliders,
  Save,
  RotateCcw,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

export const SettingsAboutPage: React.FC = () => {
  const [alpha, setAlpha] = useState<number>(0.70);
  const [threshold, setThreshold] = useState<number>(0.50);
  const [boundary, setBoundary] = useState<number>(0.10);
  const [kpPan, setKpPan] = useState<number>(0.40);
  const [kpTilt, setKpTilt] = useState<number>(0.40);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

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
    setSaving(true);
    try {
      await updateConfig({
        ensemble_alpha: alpha,
        ensemble_threshold: threshold,
        boundary_ratio: boundary,
        kp_pan: kpPan,
        kp_tilt: kpTilt
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setAlpha(0.70);
    setThreshold(0.50);
    setBoundary(0.10);
    setKpPan(0.40);
    setKpTilt(0.40);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Settings & Architecture Documentation</h1>
            <span className="badge-info text-xs px-2 py-0.5 font-medium">DeTrAck Reference</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            System parameter tuning, paper-based neural ensemble formulation, and operational limitations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save Parameters'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Parameter Tuning */}
      <div className="enterprise-card p-6">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-sky-400" />
          Pipeline Parameter Configuration
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Adjust runtime hyper-parameters without restarting the backend service. Changes take effect on the next incoming frame.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alpha Weight */}
          <div className="enterprise-subcard p-4 rounded space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-semibold text-slate-200">Ensemble Weight (α)</label>
                <p className="text-[11px] text-slate-400">YOLO weight in S_Ens = α·S_Y + (1-α)·S_VaL</p>
              </div>
              <span className="font-mono text-sm font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40">
                {alpha.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={alpha}
              onChange={(e) => setAlpha(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0 (VaL_CNN Only)</span>
              <span className="text-sky-400 font-semibold">0.70 (DeTrAck Optimal)</span>
              <span>1.0 (YOLO Only)</span>
            </div>
          </div>

          {/* Threshold Cutoff */}
          <div className="enterprise-subcard p-4 rounded space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-semibold text-slate-200">Ensemble Threshold (S_Ens)</label>
                <p className="text-[11px] text-slate-400">Minimum ensemble confidence for track initiation</p>
              </div>
              <span className="font-mono text-sm font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                {threshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.10 (Permissive)</span>
              <span className="text-amber-400 font-semibold">0.50 (Standard)</span>
              <span>0.90 (High Precision)</span>
            </div>
          </div>

          {/* Boundary Trigger Ratio */}
          <div className="enterprise-subcard p-4 rounded space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-semibold text-slate-200">PTZ Frame Boundary Ratio (r)</label>
                <p className="text-[11px] text-slate-400">Distance from edge triggering camera re-centering</p>
              </div>
              <span className="font-mono text-sm font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40">
                {(boundary * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.25"
              step="0.01"
              value={boundary}
              onChange={(e) => setBoundary(parseFloat(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>5% (Deep Edge)</span>
              <span className="text-sky-400 font-semibold">10% (DeTrAck Spec)</span>
              <span>25% (Broad Margin)</span>
            </div>
          </div>

          {/* Proportional Pan/Tilt Gains */}
          <div className="enterprise-subcard p-4 rounded space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-semibold text-slate-200">PTZ Proportional Gain (Kp)</label>
                <p className="text-[11px] text-slate-400">Servo velocity scaling relative to centroid offset</p>
              </div>
              <span className="font-mono text-sm font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                Pan: {kpPan.toFixed(2)} / Tilt: {kpTilt.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={kpPan}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setKpPan(val);
                setKpTilt(val);
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.10 (Gentle Slew)</span>
              <span className="text-emerald-400 font-semibold">0.40 (DeTrAck Optimal)</span>
              <span>1.00 (Aggressive Tracking)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: DeTrAck Research & Architecture */}
      <div className="enterprise-card p-6">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          DeTrAck System Architecture & Methodology
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Implementation reference based on: <em>"DeTrAck: UAV Detection and Tracking Using Neural Networks Ensemble on Surveillance Systems"</em> (IEEE Access 2025).
        </p>

        {/* Pipeline Diagram */}
        <div className="enterprise-subcard p-5 rounded mb-6">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            End-to-End Processing Flow
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400">STAGE 1</span>
              <span className="font-semibold text-white my-2">Video Ingestion</span>
              <span className="text-[10px] text-slate-500">RTSP / Webcam / File</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-sky-900/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-sky-400">STAGE 2</span>
              <span className="font-semibold text-sky-300 my-2">YOLO11s Detector</span>
              <span className="text-[10px] text-slate-500">Candidate Bounding Boxes</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-emerald-900/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-400">STAGE 3</span>
              <span className="font-semibold text-emerald-300 my-2">VaL_CNN Validation</span>
              <span className="text-[10px] text-slate-500">64x64 ROI Softmax</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-amber-900/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-400">STAGE 4</span>
              <span className="font-semibold text-amber-300 my-2">Ensemble + DeepSORT</span>
              <span className="text-[10px] text-slate-500">Trajectory Continuity</span>
            </div>
            <div className="p-3 bg-slate-900/80 rounded border border-purple-900/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-400">STAGE 5</span>
              <span className="font-semibold text-purple-300 my-2">PTZ Camera Control</span>
              <span className="text-[10px] text-slate-500">Edge Boundary Correction</span>
            </div>
          </div>
        </div>

        {/* Mathematical Formulations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="enterprise-subcard p-4 rounded space-y-2">
            <span className="text-slate-300 font-semibold block">1. Ensemble Confidence Formula</span>
            <code className="text-sky-300 block bg-slate-900 p-2 rounded font-mono text-[11px]">
              S_Ens = α · S_YOLO + (1 - α) · S_VaL
            </code>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Where α = 0.70 balances high recall from YOLO11 with false-positive suppression from the dedicated VaL_CNN classifier.
            </p>
          </div>

          <div className="enterprise-subcard p-4 rounded space-y-2">
            <span className="text-slate-300 font-semibold block">2. Proportional PTZ Steering Rule</span>
            <code className="text-emerald-300 block bg-slate-900 p-2 rounded font-mono text-[11px]">
              v_pan = Kp · (x_target - x_center) / (W / 2)
            </code>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Activated whenever a target penetrates within 10% of the image margin, driving the camera gimbal to keep the target centered in FOV.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Limitations & Deployment Considerations */}
      <div className="enterprise-card p-6">
        <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Technical Limitations & Deployment Notes
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Honest technical characteristics for academic evaluation and production planning.
        </p>

        <div className="space-y-4 text-xs">
          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Hardware vs. CPU Throughput:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                When operating on host CPU without NVIDIA CUDA tensor cores, inference latency averages 80–120ms per frame (~8–12 FPS). Real-time 30 FPS surveillance requires an NVIDIA RTX/Orin GPU with TensorRT INT8 or FP16 optimization.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Relative Distance Monocular Approximation:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Single-camera range estimation is geometrically computed based on bounding-box pinhole projection against standard DJI Mavic dimensions (0.35m rotor-to-rotor). Physical LiDAR or calibrated stereo baseline is recommended for high-precision ballistic tracking.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">ONVIF Network Latency:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Physical PTZ cameras communicate over HTTP/XML ONVIF profiles. Round-trip control latency varies by network conditions (typically 50–200ms). The built-in Kinematic Simulation provides instantaneous servo feedback for testbeds without physical PTZ hardware.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
