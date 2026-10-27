import React from 'react';
import type { SituationReport } from '../types/raven';
import { ShieldCheck, AlertTriangle, AlertOctagon, Radio } from 'lucide-react';

interface Props {
  situation: SituationReport | undefined;
}

export const SituationBanner: React.FC<Props> = ({ situation }) => {
  const state = situation?.state ?? 'NORMAL';

  let bannerStyle = 'bg-[#091512] border-emerald-700/60 text-emerald-200';
  let Icon = ShieldCheck;
  let badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-600';
  let statusText = 'CONDITION GREEN // AIRSPACE NOMINAL';

  if (state === 'ANOMALY') {
    bannerStyle = 'bg-[#180a0a] border-red-600 text-red-200 glow-threat-critical';
    Icon = AlertOctagon;
    badgeStyle = 'bg-red-950 text-red-300 border-red-500 animate-pulse';
    statusText = 'CONDITION RED // CRITICAL AIR DEFENSE ANOMALY';
  } else if (state === 'WATCH') {
    bannerStyle = 'bg-[#181207] border-amber-600 text-amber-200 glow-threat-watch';
    Icon = AlertTriangle;
    badgeStyle = 'bg-amber-950 text-amber-300 border-amber-500';
    statusText = 'CONDITION AMBER // ELEVATED AIRSPACE SURVEILLANCE';
  }

  return (
    <div className={`border-2 rounded p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xl transition-all ${bannerStyle}`}>
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded bg-black/50 border border-white/10 shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              AIR DEFENCE SITUATION ASSESSMENT (SITREP):
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-wider border ${badgeStyle}`}>
              {statusText}
            </span>
          </div>
          <p className="text-xs mt-1 font-mono font-semibold tracking-wide leading-relaxed">
            {situation?.primary_reason || 'Airspace perimeter secure. Zero unauthorized loitering or perimeter incursions detected.'}
          </p>
        </div>
      </div>

      {/* Active Tactical Alert Pills */}
      {situation?.alerts && situation.alerts.length > 0 && (
        <div className="flex flex-wrap gap-2 self-stretch md:self-auto">
          {situation.alerts.map((a, i) => (
            <span
              key={i}
              className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-black/60 border border-slate-700/80 text-slate-200 flex items-center gap-1.5 shadow"
            >
              <Radio className="w-3 h-3 text-red-400 animate-ping" />
              <span>{a.message}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
