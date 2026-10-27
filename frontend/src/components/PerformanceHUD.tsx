import React from 'react';
import type { PerformanceMetrics } from '../types/raven';
import { Activity, Gauge, CheckCircle } from 'lucide-react';

interface Props {
  metrics: PerformanceMetrics | undefined;
}

export const PerformanceHUD: React.FC<Props> = ({ metrics }) => {
  const fps = metrics?.fps ?? 0.0;
  const total = metrics?.total_latency_ms ?? 0.0;
  const yolo = metrics?.yolo_latency_ms ?? 0.0;
  const val = metrics?.val_cnn_latency_ms ?? 0.0;
  const track = metrics?.tracking_latency_ms ?? 0.0;

  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c283d] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">
              SEC-05 // INFERENCE LATENCY & COMPUTE
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              REAL-TIME EDGE PIPELINE LATENCY PROFILING
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#060a12] border border-[#1e2a3f] font-mono text-xs">
          <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-black text-emerald-400">{fps.toFixed(1)} FPS</span>
        </div>
      </div>

      {/* 2. Pipeline Latency Breakdown Meters */}
      <div className="space-y-2.5 text-xs font-mono">
        {/* YOLO11 Stage */}
        <div className="tactical-subpanel p-2 rounded border border-[#172236]">
          <div className="flex justify-between text-slate-300 text-[10px] mb-1">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              STAGE 1: YOLO11s DETECTION
            </span>
            <span className="font-bold text-cyan-400">{yolo.toFixed(1)} ms</span>
          </div>
          <div className="h-1.5 w-full bg-[#070c16] rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (yolo / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* VaL_CNN Stage */}
        <div className="tactical-subpanel p-2 rounded border border-[#172236]">
          <div className="flex justify-between text-slate-300 text-[10px] mb-1">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              STAGE 2: VaL_CNN 64x64 VALIDATION
            </span>
            <span className="font-bold text-emerald-400">{val.toFixed(1)} ms</span>
          </div>
          <div className="h-1.5 w-full bg-[#070c16] rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (val / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* DeepSORT Stage */}
        <div className="tactical-subpanel p-2 rounded border border-[#172236]">
          <div className="flex justify-between text-slate-300 text-[10px] mb-1">
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              STAGE 3: DeepSORT KALMAN / RE-ID
            </span>
            <span className="font-bold text-purple-400">{track.toFixed(1)} ms</span>
          </div>
          <div className="h-1.5 w-full bg-[#070c16] rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-purple-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (track / Math.max(1, total)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Total Latency Rollup */}
        <div className="pt-2 border-t border-[#1a2538] flex justify-between items-center text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            END-TO-END PIPELINE LATENCY:
          </span>
          <span className="text-emerald-400 font-black text-sm">{total.toFixed(1)} ms</span>
        </div>
      </div>
    </div>
  );
};
