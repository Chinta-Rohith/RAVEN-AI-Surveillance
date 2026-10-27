import React from 'react';
import type { TrackedUAV } from '../types/raven';
import { tacticalAudio } from '../utils/tacticalAudio';
import { Crosshair, Radio, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Props {
  tracks: TrackedUAV[];
  selectedTargetId: number | null;
  onSelectTarget: (id: number | null) => void;
}

export const TrackList: React.FC<Props> = ({ tracks, selectedTargetId, onSelectTarget }) => {
  const handleLockToggle = (id: number | null) => {
    tacticalAudio.playClick();
    onSelectTarget(id);
  };

  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Panel Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c283d] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-400">
            <Radio className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">
              SEC-03 // DEEPSORT PERSISTENT TARGET MATRIX ({tracks.length} CONTACTS)
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              8-STATE KALMAN FILTER [x, y, a, h, vx, vy, va, vh] + COSINE RE-IDENTIFICATION METRIC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#1e2a3f]">
            MIN HITS: <strong className="text-emerald-400">3 FRAMES</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#1e2a3f]">
            MAX AGE: <strong className="text-amber-400">30 FRAMES</strong>
          </span>
        </div>
      </div>

      {/* 2. Target Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="border-b border-[#1c283d] bg-[#070b14] text-slate-400 text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3">TARGET DESIGNATION</th>
              <th className="py-2.5 px-2">YOLO11s</th>
              <th className="py-2.5 px-2">VaL_CNN</th>
              <th className="py-2.5 px-2">S_ENS (0.7/0.3)</th>
              <th className="py-2.5 px-2">HITS</th>
              <th className="py-2.5 px-2">EST RANGE</th>
              <th className="py-2.5 px-2">THREAT CONDITION</th>
              <th className="py-2.5 px-3 text-right">GIMBAL FIRE-CONTROL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#152033]">
            {tracks.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-500 italic bg-[#060a12]/50">
                  <div className="flex flex-col items-center gap-2">
                    <Crosshair className="w-6 h-6 text-slate-600 animate-pulse" />
                    <span>AIRSPACE CLEAR. NO ACTIVE UAV TRACKS IN DESIGNATED PATROL CONE.</span>
                  </div>
                </td>
              </tr>
            ) : (
              tracks.map((t) => {
                const isSelected = t.track_id === selectedTargetId;
                const isAnomaly = t.situation_state === 'ANOMALY';
                const isWatch = t.situation_state === 'WATCH';

                const stateBadge = isAnomaly
                  ? 'bg-red-950 text-red-300 border-red-700 glow-threat-critical'
                  : isWatch
                  ? 'bg-amber-950 text-amber-300 border-amber-700'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-800';

                return (
                  <tr
                    key={t.track_id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-amber-950/25 border-l-4 border-amber-400'
                        : isAnomaly
                        ? 'bg-red-950/15 hover:bg-red-950/25'
                        : 'hover:bg-[#0c1424]'
                    }`}
                  >
                    {/* Target ID */}
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      TRK-0{t.track_id}
                      <span className="text-[9px] text-slate-400 font-normal">
                        ({t.class_name ? t.class_name.toUpperCase() : 'UAV-QUAD'})
                      </span>
                    </td>

                    {/* YOLO11s Score */}
                    <td className="py-3 px-2 text-slate-300">
                      {(t.yolo_confidence * 100).toFixed(1)}%
                    </td>

                    {/* VaL_CNN Score */}
                    <td className="py-3 px-2 text-slate-300">
                      {(t.val_confidence * 100).toFixed(1)}%
                    </td>

                    {/* Ensemble Weighted Score */}
                    <td className="py-3 px-2 font-bold text-emerald-400">
                      {t.ensemble_confidence.toFixed(3)}
                    </td>

                    {/* Hits */}
                    <td className="py-3 px-2 text-slate-400">
                      {t.hits} fr
                    </td>

                    {/* Relative Distance */}
                    <td className="py-3 px-2 font-bold text-cyan-400">
                      {t.distance_m.toFixed(1)}m
                    </td>

                    {/* Threat State */}
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1 w-fit ${stateBadge}`}>
                        {isAnomaly ? <ShieldAlert className="w-3 h-3 text-red-400" /> : isWatch ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                        {t.situation_state}
                      </span>
                    </td>

                    {/* Gimbal Fire-Control Action */}
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleLockToggle(isSelected ? null : t.track_id)}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all border flex items-center gap-1.5 ml-auto shadow ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                            : 'bg-[#0e1726] hover:bg-slate-800 text-slate-200 border-[#1e2a3f]'
                        }`}
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        {isSelected ? 'GIMBAL LOCKED' : 'ENGAGE LOCK'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
