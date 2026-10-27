import React, { useState, useEffect } from 'react';
import { fetchSystemStatus } from '../services/api';
import { Layers, Info, Cpu } from 'lucide-react';

export const ModelsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetchSystemStatus().then(setStatus).catch(console.error);
  }, []);

  const yolo = status?.yolo_detector;
  const valCnn = status?.val_cnn_validator;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-sky-950/80 border border-sky-700/60 text-sky-400">
            <Layers className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-05 // NEURAL MODEL ARSENAL & CHECKPOINT REGISTRY
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                ACTIVE INFERENCE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              STATUS OF PRIMARY YOLO11s EXTRACTOR AND SECONDARY VaL_CNN 64x64 CLASSIFICATION LAYERS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#060a12] px-3 py-1.5 rounded border border-[#1e2a3f] font-mono text-xs text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>DEVICE: <strong className="text-emerald-400">{yolo?.device?.toUpperCase() || 'CPU'}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 2. YOLO11 Detector Model Card */}
        <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1c283d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <h3 className="font-bold text-slate-100 uppercase">1. PRIMARY DETECTOR: YOLO11s</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                yolo?.loaded
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-red-950 text-red-300 border-red-700'
              }`}
            >
              {yolo?.loaded ? 'OPERATIONAL' : 'OFFLINE'}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div>
              <span className="text-slate-500 text-[10px] block">CHECKPOINT PATH:</span>
              <code className="text-slate-200 bg-[#060a12] px-2 py-1 rounded block mt-0.5 border border-[#172236]">
                {yolo?.model_path || 'models/yolo11s.pt'}
              </code>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">WEIGHT SPECIFICATION:</span>
              <span className={yolo?.custom_uav_weights ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {yolo?.custom_uav_weights ? 'FINE-TUNED UAV WEIGHTS' : 'BASE PRETRAINED YOLO11 WEIGHTS'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">COMPUTE RUNTIME:</span>
              <span className="text-slate-200 font-bold">{yolo?.device?.toUpperCase() || 'CPU'}</span>
            </div>
          </div>

          <div className="tactical-subpanel p-3 rounded border border-[#172236] text-[11px] text-slate-400 space-y-1.5">
            <div className="text-slate-200 font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" /> TRAINING COMMAND:
            </div>
            <p className="text-[10px]">Execute terminal training on the custom UAV dataset:</p>
            <code className="block bg-[#050810] p-1.5 rounded text-cyan-300 border border-[#152033]">
              python training/yolo/train.py --epochs 50 --batch 16
            </code>
            <p className="text-[10px] text-slate-500">
              Checkpoint artifacts output to <code className="text-slate-400">models/yolo11s_uav.pt</code>.
            </p>
          </div>
        </div>

        {/* 3. VaL_CNN Secondary Validation Network Model Card */}
        <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1c283d] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="font-bold text-slate-100 uppercase">2. VALIDATION NETWORK: VaL_CNN</h3>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                valCnn?.loaded
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}
            >
              {valCnn?.loaded ? 'TRAINED WEIGHTS' : 'INITIALIZED (FALLBACK MODE)'}
            </span>
          </div>

          <div className="space-y-2 text-slate-300">
            <div>
              <span className="text-slate-500 text-[10px] block">CHECKPOINT PATH:</span>
              <code className="text-slate-200 bg-[#060a12] px-2 py-1 rounded block mt-0.5 border border-[#172236]">
                {valCnn?.model_path || 'models/val_cnn.pt'}
              </code>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">ARCHITECTURE TOPOLOGY:</span>
              <span className="text-slate-200">5-Layer Hidden Conv, 2 Dropout Layers, 64x64 ROI Input, Binary Output</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">DIAGNOSTIC STATUS:</span>
              <p className="text-amber-400 text-[11px] leading-relaxed mt-0.5">{valCnn?.status}</p>
            </div>
          </div>

          <div className="tactical-subpanel p-3 rounded border border-[#172236] text-[11px] text-slate-400 space-y-1.5">
            <div className="text-slate-200 font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" /> TRAINING COMMAND:
            </div>
            <p className="text-[10px]">Train the 5-layer VaL_CNN model on 64x64 ROI patches:</p>
            <code className="block bg-[#050810] p-1.5 rounded text-cyan-300 border border-[#152033]">
              python training/val_cnn/train.py
            </code>
            <p className="text-[10px] text-slate-500">
              Checkpoint artifacts output to <code className="text-slate-400">models/val_cnn.pt</code> upon loss convergence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
