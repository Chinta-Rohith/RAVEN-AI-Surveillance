import React from 'react';
import type { TelemetryPayload } from '../types/raven';
import { DigitalTwin } from '../components/DigitalTwin';
import { Radar, Compass, Radio } from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const DigitalTwinPage: React.FC<Props> = ({ telemetry }) => {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-sky-950/80 border border-sky-700/60 text-sky-400">
            <Radar className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-02 // DIGITAL TWIN & AIRSPACE GEOLOCATION MATRIX
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                POLAR COORDINATE DOMAIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              REAL-TIME MONOCULAR PINHOLE RANGING (D = F · W_real / W_pixel) & AZIMUTH RADAR MAPPING
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-[#060a12] px-3 py-1.5 rounded border border-[#1e2a3f] text-slate-300">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>BORESIGHT AZ: <strong className="text-amber-400">{telemetry?.ptz.pan_deg.toFixed(1) || 0}°</strong></span>
          </div>
          <div className="flex items-center gap-2 bg-[#060a12] px-3 py-1.5 rounded border border-[#1e2a3f] text-slate-300">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>RADAR BLIPS: <strong className="text-emerald-400">{telemetry?.digital_twin.objects.length || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Main Radar Scope */}
      <DigitalTwin
        cameraPan={telemetry?.ptz.pan_deg || 0.0}
        cameraTilt={telemetry?.ptz.tilt_deg || 0.0}
        objects={telemetry?.digital_twin.objects || []}
      />
    </div>
  );
};
