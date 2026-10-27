import React, { useRef, useEffect } from 'react';
import type { DigitalTwinObject } from '../types/raven';
import { Radar, ShieldAlert, Crosshair, MapPin } from 'lucide-react';

interface Props {
  cameraPan: number;
  cameraTilt: number;
  objects: DigitalTwinObject[];
}

export const DigitalTwin: React.FC<Props> = ({ cameraPan, cameraTilt: _cameraTilt, objects }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height - 45; // Camera sensor base
      const maxRadius = Math.min(width / 2 - 25, height - 75);

      // Advance sweep angle
      sweepAngleRef.current = (sweepAngleRef.current + 1.2) % 360;

      // 1. Radar Background
      ctx.fillStyle = '#050912';
      ctx.fillRect(0, 0, width, height);

      // 2. Polar Range Rings (20m, 40m, 60m, 80m, 100m)
      const ranges = [20, 40, 60, 80, 100];
      ctx.strokeStyle = '#152238';
      ctx.lineWidth = 1;

      ranges.forEach((r) => {
        const radiusPx = (r / 100) * maxRadius;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPx, Math.PI, 2 * Math.PI);
        ctx.stroke();

        // Range text with tactical green/cyan tone
        ctx.fillStyle = '#22d3ee';
        ctx.font = '9px monospace';
        ctx.fillText(`${r}M`, centerX + 4, centerY - radiusPx + 11);
      });

      // 3. Radial Bearing Lines (-75°, -60°, -45°, -30°, -15°, 0°, +15°, +30°, +45°, +60°, +75°)
      const angles = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
      angles.forEach((ang) => {
        const rad = ((ang - 90) * Math.PI) / 180;
        const x = centerX + maxRadius * Math.cos(rad);
        const y = centerY + maxRadius * Math.sin(rad);

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = ang === 0 ? '#1e3a5f' : '#0f172a';
        ctx.lineWidth = ang === 0 ? 1.5 : 1;
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(`${ang > 0 ? '+' : ''}${ang}°`, x - 8, y - 4);
      });

      // 4. Rotating Military Radar Sweep Beam
      const sweepRad = ((sweepAngleRef.current - 90) * Math.PI) / 180;
      // Only draw sweep in upper hemisphere
      if (Math.sin(sweepRad) <= 0.05) {
        const sx = centerX + maxRadius * Math.cos(sweepRad);
        const sy = centerY + maxRadius * Math.sin(sweepRad);

        const gradient = ctx.createLinearGradient(centerX, centerY, sx, sy);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, sweepRad - 0.25, sweepRad);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      // 5. Active Camera Sensor FOV Cone (60° Optical Coverage)
      const camRad = ((cameraPan - 90) * Math.PI) / 180;
      const fovHalf = (30 * Math.PI) / 180;

      ctx.fillStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, camRad - fovHalf, camRad + fovHalf);
      ctx.closePath();
      ctx.fill();

      // Camera Optical Centerline
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + maxRadius * Math.cos(camRad), centerY + maxRadius * Math.sin(camRad));
      ctx.stroke();
      ctx.setLineDash([]);

      // Camera Origin Marker
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PTZ BASE [0,0]', centerX - 36, centerY + 20);

      // 6. Plot Tracked Military Air Contacts
      objects.forEach((obj) => {
        const distClamp = Math.min(100, Math.max(5, obj.distance_m));
        const rPx = (distClamp / 100) * maxRadius;
        const targetRad = ((obj.azimuth_deg - 90) * Math.PI) / 180;
        const tx = centerX + rPx * Math.cos(targetRad);
        const ty = centerY + rPx * Math.sin(targetRad);

        let color = '#10b981'; // Routine / Normal
        if (obj.situation_state === 'ANOMALY') color = '#ef4444'; // Hostile Anomaly
        else if (obj.situation_state === 'WATCH') color = '#f59e0b'; // Caution Watch

        // Draw Military Symbology
        if (obj.situation_state === 'ANOMALY') {
          // Hostile: Diamond
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 6);
          ctx.lineTo(tx + 6, ty);
          ctx.lineTo(tx, ty + 6);
          ctx.lineTo(tx - 6, ty);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.fill();
        } else if (obj.situation_state === 'WATCH') {
          // Watch: Triangle
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(tx, ty - 6);
          ctx.lineTo(tx + 6, ty + 5);
          ctx.lineTo(tx - 6, ty + 5);
          ctx.closePath();
          ctx.stroke();
          ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
          ctx.fill();
        } else {
          // Routine: Dot with ring
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(tx, ty, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          ctx.beginPath();
          ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
          ctx.stroke();
        }

        // Velocity Heading Arrow
        const vx = obj.velocity[0];
        const vy = obj.velocity[1];
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx + vx * 3, ty + vy * 3);
        ctx.stroke();

        // Tactical Target Designation Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`TRK-${obj.track_id} [${obj.distance_m}m]`, tx + 9, ty - 4);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraPan, _cameraTilt, objects]);

  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1c283d] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-sky-950/80 border border-sky-700/60 text-sky-400">
            <Radar className="w-4 h-4 animate-spin text-sky-400" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100 font-mono">
              SEC-02 // DIGITAL TWIN & 2D POLAR RADAR SCOPE
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              REAL-TIME MONOCULAR PINHOLE GEOMETRY (D = F · W_real / W_px) & AZIMUTH PROJECTION
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#1e2a3f] text-slate-300 text-[10px]">
            MAX RANGE: <strong className="text-cyan-400">100.0M</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-[#1e2a3f] text-slate-300 text-[10px]">
            GIMBAL AZ: <strong className="text-amber-400">{cameraPan.toFixed(1)}°</strong>
          </span>
        </div>
      </div>

      {/* 2. Tactical Radar Canvas */}
      <div className="relative w-full aspect-square md:aspect-4/3 max-h-[400px] bg-[#050912] rounded overflow-hidden border border-[#1a2538] flex items-center justify-center">
        <canvas ref={canvasRef} width={560} height={400} className="w-full h-full object-contain" />
        
        {/* Radar Corner Decals */}
        <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-500 pointer-events-none">
          AIR DEFENSE SECTOR 04 // POLAR RADAR
        </div>
        <div className="absolute top-2 right-2 text-[9px] font-mono text-emerald-400 pointer-events-none flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          SWEEP ACTIVE
        </div>
      </div>

      {/* 3. Tactical Target Track Dossiers */}
      <div className="tactical-subpanel p-3 rounded border border-[#1a2538] text-[11px] font-mono text-slate-300 flex flex-col gap-2">
        <div className="flex items-center justify-between text-slate-400 border-b border-[#162032] pb-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold">
            <MapPin className="w-3.5 h-3.5" />
            <span>ACTIVE AIR CONTACT DOSSIER ({objects.length} TARGETS)</span>
          </div>
          <span className="text-[10px] text-slate-500">MGRS RELATIVE GRID</span>
        </div>

        {objects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {objects.map((o) => {
              const isAnomaly = o.situation_state === 'ANOMALY';
              const isWatch = o.situation_state === 'WATCH';
              const borderClass = isAnomaly
                ? 'border-red-600/80 bg-red-950/30'
                : isWatch
                ? 'border-amber-600/80 bg-amber-950/30'
                : 'border-emerald-600/60 bg-emerald-950/20';

              return (
                <div key={o.track_id} className={`p-2 rounded border ${borderClass} flex flex-col gap-1`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 flex items-center gap-1">
                      {isAnomaly ? <ShieldAlert className="w-3 h-3 text-red-400" /> : <Crosshair className="w-3 h-3 text-cyan-400" />}
                      TRK-0{o.track_id}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isAnomaly ? 'text-red-400 bg-red-950 border border-red-800' : isWatch ? 'text-amber-400 bg-amber-950 border border-amber-800' : 'text-emerald-400 bg-emerald-950 border border-emerald-800'
                    }`}>
                      {o.situation_state}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <div>RANGE: <strong className="text-cyan-300">{o.distance_m}m</strong> | AZ: <strong className="text-amber-300">{o.azimuth_deg}°</strong></div>
                    <div>CARTESIAN: ({o.pos_x}m, {o.pos_y}m)</div>
                    <div>VELOCITY: ({o.velocity[0]}m/s, {o.velocity[1]}m/s)</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-slate-500 italic py-2 text-center text-xs">
            NO RADAR CONTACTS DETECTED. SECTOR AIRSPACE CLEAR.
          </div>
        )}
      </div>
    </div>
  );
};
