import React, { useState, useEffect } from 'react';
import { fetchSystemStatus, fetchConfig, updateConfig } from '../services/api';
import {
  Layers,
  Cpu,
  Sliders,
  CheckCircle2,
  Copy,
  Check,
  Terminal,
  Save,
  HardDrive
} from 'lucide-react';

export const ModelLabPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable threshold states
  const [alpha, setAlpha] = useState<number>(0.70);
  const [threshold, setThreshold] = useState<number>(0.50);

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(console.error);
    fetchConfig().then((cfg) => {
      if (cfg) {
        if (cfg.ensemble_alpha !== undefined) setAlpha(cfg.ensemble_alpha);
        if (cfg.ensemble_threshold !== undefined) setThreshold(cfg.ensemble_threshold);
      }
    }).catch(console.error);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateConfig({
        ensemble_alpha: alpha,
        ensemble_threshold: threshold
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const yolo = status?.yolo_detector;
  const valCnn = status?.val_cnn_validator;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Model Laboratory</h1>
            <span className="badge-info text-xs px-2 py-0.5 font-medium">DeTrAck Neural Pipeline</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Inspection, checkpoint validation, and hyperparameter tuning for YOLO11s and VaL_CNN networks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="enterprise-subcard px-3 py-1.5 flex items-center gap-2 text-xs text-slate-300">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Runtime: <strong className="text-white">{yolo?.device?.toUpperCase() || 'CPU'}</strong></span>
          </div>
        </div>
      </div>

      {/* Grid of Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model 1: Primary Detector (YOLO11s) */}
        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Primary Detector: YOLO11s</h2>
                  <p className="text-xs text-slate-400">Full-frame candidate extraction</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                yolo?.loaded ? 'badge-online' : 'badge-alert'
              }`}>
                {yolo?.loaded ? 'Operational' : 'Offline'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Checkpoint Path</span>
                <span className="font-mono text-xs text-slate-200">{yolo?.model_path || 'models/yolo11s.pt'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Weights Type</span>
                <span className={`text-xs font-medium ${yolo?.custom_uav_weights ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {yolo?.custom_uav_weights ? 'Fine-Tuned UAV Weights' : 'Base Pretrained (Ultralytics)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Input Resolution</span>
                <span className="font-mono text-xs text-slate-200">640 × 640 RGB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Hardware Device</span>
                <span className="font-mono text-xs text-slate-200">{yolo?.device?.toUpperCase() || 'CPU'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 text-xs">Target Classes</span>
                <span className="text-xs text-slate-200">Class 0: Drone / UAV</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" /> CLI Training Command
              </span>
              <button
                onClick={() => handleCopy('python training/yolo/train.py --epochs 50 --batch 16', 'yolo')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedCmd === 'yolo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd === 'yolo' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="enterprise-subcard p-2.5 rounded text-xs font-mono text-sky-300 overflow-x-auto">
              python training/yolo/train.py --epochs 50 --batch 16
            </pre>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Trained weights output to <code className="text-slate-400">models/yolo11s_uav.pt</code>.
            </p>
          </div>
        </div>

        {/* Model 2: Secondary Validation Network (VaL_CNN) */}
        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Validation Network: VaL_CNN</h2>
                  <p className="text-xs text-slate-400">ROI patch false-positive filter</p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                valCnn?.loaded ? 'badge-online' : 'badge-warning'
              }`}>
                {valCnn?.loaded ? 'Trained Checkpoint' : 'Initialized (Fallback)'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Checkpoint Path</span>
                <span className="font-mono text-xs text-slate-200">{valCnn?.model_path || 'models/val_cnn.pt'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Architecture Topology</span>
                <span className="text-xs text-slate-200">5-Layer Conv + 2 Dropout + Linear</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Input Patch Dimension</span>
                <span className="font-mono text-xs text-slate-200">64 × 64 × 3 RGB ROI</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400 text-xs">Output Format</span>
                <span className="text-xs text-slate-200">Binary Softmax (0: BG, 1: Drone)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 text-xs">Validation Role</span>
                <span className="text-xs text-slate-200">Rejects clutter, birds, clouds</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> CLI Training Command
              </span>
              <button
                onClick={() => handleCopy('python training/val_cnn/train.py', 'valcnn')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedCmd === 'valcnn' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCmd === 'valcnn' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="enterprise-subcard p-2.5 rounded text-xs font-mono text-emerald-300 overflow-x-auto">
              python training/val_cnn/train.py
            </pre>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Trains on 64×64 ROI patches and exports weights to <code className="text-slate-400">models/val_cnn.pt</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Ensemble Calibration Card */}
      <div className="enterprise-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">DeTrAck Ensemble Calibration</h2>
              <p className="text-xs text-slate-400">
                Formula: <span className="font-mono text-amber-300">S_Ens = α · S_YOLO + (1 - α) · S_VaL</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="btn-primary self-start sm:self-auto flex items-center gap-2 text-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved Successfully</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Apply Calibration'}</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Alpha Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-medium text-slate-200">Ensemble Weight (α)</label>
                <p className="text-[11px] text-slate-400">Balances YOLO vs VaL_CNN influence</p>
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
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0.0 (VaL_CNN Only)</span>
              <span className="text-sky-400 font-medium">0.70 (DeTrAck Optimal)</span>
              <span>1.0 (YOLO Only)</span>
            </div>
          </div>

          {/* Threshold Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-medium text-slate-200">Acceptance Threshold (S_Ens)</label>
                <p className="text-[11px] text-slate-400">Minimum ensemble confidence required for DeepSORT tracking</p>
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
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0.10 (Permissive)</span>
              <span className="text-amber-400 font-medium">0.50 (Standard Cutoff)</span>
              <span>0.90 (High Precision)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Weight Checkpoint Guide */}
      <div className="enterprise-card p-6">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Model Checkpoint Guidelines & Deployment
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          For university evaluations and client demonstrations, the platform operates with fallback PyTorch weights if custom trained checkpoints are not found in the <code className="text-slate-300">models/</code> directory.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="enterprise-subcard p-3 rounded">
            <span className="text-slate-300 font-medium block mb-1">1. YOLO11s Checkpoint</span>
            <p className="text-slate-400 text-[11px]">Place pre-trained or fine-tuned weights in <code className="text-sky-300">models/yolo11s.pt</code>. Downloadable via Ultralytics API.</p>
          </div>
          <div className="enterprise-subcard p-3 rounded">
            <span className="text-slate-300 font-medium block mb-1">2. VaL_CNN Weights</span>
            <p className="text-slate-400 text-[11px]">Save PyTorch state dict in <code className="text-emerald-300">models/val_cnn.pt</code>. If missing, random initialization operates in simulated validation mode.</p>
          </div>
          <div className="enterprise-subcard p-3 rounded">
            <span className="text-slate-300 font-medium block mb-1">3. DeepSORT Embedder</span>
            <p className="text-slate-400 text-[11px]">MobileNet / OSNet feature extractor is cached under PyTorch hub cache for appearance re-identification.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
