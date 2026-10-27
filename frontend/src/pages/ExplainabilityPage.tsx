import React from 'react';
import type { TelemetryPayload } from '../types/raven';
import { ExplainabilityPanel } from '../components/ExplainabilityPanel';
import { BrainCircuit, Cpu } from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const ExplainabilityPage: React.FC<Props> = ({ telemetry }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-purple-950/80 border border-purple-700/60 text-purple-400">
            <BrainCircuit className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-06 // EXPLAINABLE AI (XAI) & AUDIT TRAIL LOG
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                DEFENSE ACCOUNTABILITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              MATHEMATICAL JUSTIFICATION LOG (S_Ens = 0.70·S_YOLO + 0.30·S_VaL) & CONVOLUTIONAL SALIENCY MAPS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#060a12] px-3 py-1.5 rounded border border-[#1e2a3f] font-mono text-xs text-slate-300">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>GRAD-CAM: <strong className="text-purple-400">LAYER 5 ACTIVE</strong></span>
        </div>
      </div>

      <ExplainabilityPanel explanations={telemetry?.explainability || []} />
    </div>
  );
};
