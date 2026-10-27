import React from 'react';
import type { ExplainabilityCard } from '../types/raven';
import { BrainCircuit, CheckCircle, XCircle, Eye } from 'lucide-react';

interface Props {
  explanations: ExplainabilityCard[];
}

export const ExplainabilityPanel: React.FC<Props> = ({ explanations }) => {
  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c283d] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-950/80 border border-purple-700/60 text-purple-400">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">
              SEC-06 // EXPLAINABLE AI (XAI) & AUDIT TRAIL
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              DEFENSE AUDIT JUSTIFICATION: S_Ens = 0.70·S_det + 0.30·S_val &gt;= 0.50
            </p>
          </div>
        </div>

        <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-[#1e2a3f]">
          EVALUATED: <strong className="text-purple-400">{explanations.length} PATCHES</strong>
        </span>
      </div>

      {/* 2. Audit Trail Cards */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {explanations.length === 0 ? (
          <div className="text-center py-6 text-slate-500 font-mono text-xs italic tactical-subpanel rounded p-4">
            SCANNING AIRSPACE... NO CANDIDATE PATCHES EVALUATED ON CURRENT SENSOR FRAME.
          </div>
        ) : (
          explanations.map((exp, idx) => (
            <div
              key={idx}
              className={`p-3 rounded border text-xs font-mono transition-colors ${
                exp.is_accepted
                  ? 'bg-[#08121f] border-emerald-800/80'
                  : 'bg-[#180a0a] border-red-900/60 text-slate-400'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {exp.is_accepted ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="font-bold text-slate-100">
                    {exp.target_id ? `TARGET TRK-0${exp.target_id}` : `CANDIDATE ROI #${idx + 1}`}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                    exp.is_accepted
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-red-950 text-red-300 border-red-700'
                  }`}
                >
                  {exp.is_accepted ? 'CONFIRMED TARGET' : 'FALSE ALARM VETOED'}
                </span>
              </div>

              {/* Confidence Weights Breakdown */}
              <div className="grid grid-cols-3 gap-1.5 mb-2 text-center text-[10px]">
                <div className="bg-[#050912] p-1.5 rounded border border-[#172236]">
                  <span className="text-slate-500 block">YOLO11 (70%)</span>
                  <span className="font-bold text-cyan-400">{exp.yolo_confidence.toFixed(2)}</span>
                </div>
                <div className="bg-[#050912] p-1.5 rounded border border-[#172236]">
                  <span className="text-slate-500 block">VaL_CNN (30%)</span>
                  <span className="font-bold text-emerald-400">{exp.val_confidence.toFixed(2)}</span>
                </div>
                <div className="bg-[#050912] p-1.5 rounded border border-[#172236]">
                  <span className="text-slate-500 block">S_ENS SCORE</span>
                  <span className={`font-black ${exp.is_accepted ? 'text-amber-400' : 'text-red-400'}`}>
                    {exp.ensemble_confidence.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Military Audit Rationale */}
              <div className="text-[10px] text-slate-300 bg-black/60 p-2 rounded border border-slate-800 leading-relaxed">
                <span className="text-amber-400 font-bold block mb-0.5">AUDIT JUSTIFICATION:</span>
                {exp.rationale}
              </div>

              {/* Grad-CAM Saliency Map */}
              {exp.gradcam_image_base64 && (
                <div className="mt-2 flex items-center gap-2.5 bg-[#050912] p-2 rounded border border-[#172236]">
                  <img
                    src={`data:image/jpeg;base64,${exp.gradcam_image_base64}`}
                    alt="Grad-CAM 64x64 Heatmap"
                    className="w-12 h-12 rounded object-cover border border-purple-500/60"
                  />
                  <div className="text-[10px] text-slate-400">
                    <span className="text-purple-400 font-bold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Grad-CAM Saliency (Layer 5)
                    </span>
                    <span>Visualizing convolutional activation over 64x64 ROI patch.</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
