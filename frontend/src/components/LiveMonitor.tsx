import React, { useState } from 'react';
import type { TelemetryPayload } from '../types/raven';
import { selectVideoSource, toggleIRMode, uploadVideoFile } from '../services/api';
import { tacticalAudio } from '../utils/tacticalAudio';
import {
  Camera,
  Flame,
  Upload,
  Video,
  ShieldAlert,
  Crosshair,
  Target,
  Download,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
  onSelectTarget?: (id: number | null) => void;
}

export const LiveMonitor: React.FC<Props> = ({ telemetry }) => {
  const [sourceType, setSourceType] = useState<string>('synthetic');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showHudOverlay, setShowHudOverlay] = useState<boolean>(true);

  const handleSourceChange = async (type: string) => {
    tacticalAudio.playClick();
    setSourceType(type);
    await selectVideoSource(type);
  };

  const handleIRToggle = async () => {
    tacticalAudio.playClick();
    const currentIR = telemetry?.source.ir_mode ?? false;
    await toggleIRMode(!currentIR);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      tacticalAudio.playClick();
      setIsUploading(true);
      try {
        await uploadVideoFile(file);
        setSourceType('video_file');
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSnapshotCapture = () => {
    tacticalAudio.playClick();
    if (!telemetry?.frame_image_base64) return;
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${telemetry.frame_image_base64}`;
    link.download = `RAVEN_MIL_SURVEILLANCE_EVIDENCE_${Date.now()}.jpg`;
    link.click();
  };

  const isIR = telemetry?.source.ir_mode ?? false;
  const inBoundary = telemetry?.boundary.in_boundary ?? false;
  const approaching = telemetry?.boundary.approaching ?? false;

  return (
    <div className="tactical-panel rounded border border-[#1e2a3f] p-4 flex flex-col gap-3 shadow-2xl">
      {/* 1. Tactical Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1c283d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold tracking-widest text-white uppercase font-mono">
                SEC-01 // OPTICAL SENSOR FEED (EO/IR)
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700">
                LIVE MIL-SPEC FEED
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              REAL-TIME DeTrAck ENSEMBLE: YOLO11s (PRIMARY) + VaL_CNN (SECONDARY VALIDATOR)
            </p>
          </div>
        </div>

        {/* Sensor & Stream Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          {/* FLIR IR Mode Toggle */}
          <button
            onClick={handleIRToggle}
            className={`px-2.5 py-1.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              isIR
                ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-[#0a101d] text-slate-300 border-[#1e2a3f] hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            {isIR ? 'WHITE-HOT (IR)' : 'DAYLIGHT (EO)'}
          </button>

          {/* Toggle Tactical Reticle Overlay */}
          <button
            onClick={() => {
              tacticalAudio.playClick();
              setShowHudOverlay(!showHudOverlay);
            }}
            className={`px-2 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 border ${
              showHudOverlay
                ? 'bg-sky-950/60 text-sky-400 border-sky-700'
                : 'bg-[#0a101d] text-slate-400 border-[#1e2a3f]'
            }`}
            title="Toggle Tactical HUD Reticle"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>HUD</span>
          </button>

          {/* Video Feed Source Select */}
          <div className="flex items-center gap-1 bg-[#0a101d] px-2 py-1 rounded border border-[#1e2a3f]">
            <SlidersHorizontal className="w-3 h-3 text-slate-400" />
            <select
              value={sourceType}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="bg-transparent text-slate-200 text-[11px] focus:outline-none cursor-pointer"
            >
              <option value="synthetic" className="bg-slate-900 text-slate-200">SYNTHETIC SORTIE (DEFENSE SIM)</option>
              <option value="webcam" className="bg-slate-900 text-slate-200">TACTICAL CAM / WEBCAM</option>
              <option value="rtsp" className="bg-slate-900 text-slate-200">ENCRYPTED RTSP IP FEED</option>
              <option value="video_file" className="bg-slate-900 text-slate-200">SORTIE MISSION REPLAY</option>
            </select>
          </div>

          {/* Upload Sortie Video */}
          <label className="cursor-pointer bg-[#0a101d] hover:bg-slate-800 text-slate-300 border border-[#1e2a3f] px-2.5 py-1.5 rounded text-[11px] flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>{isUploading ? 'INGESTING...' : 'INGEST FILE'}</span>
            <input type="file" accept="video/mp4,video/avi,video/mkv" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* Evidence Capture */}
          <button
            onClick={handleSnapshotCapture}
            className="bg-[#0a101d] hover:bg-slate-800 text-emerald-400 border border-[#1e2a3f] hover:border-emerald-700/60 px-2 py-1.5 rounded text-[11px] flex items-center gap-1"
            title="Export Evidence Image"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EVIDENCE</span>
          </button>
        </div>
      </div>

      {/* 2. Tactical Video Display Canvas */}
      <div className="relative aspect-video w-full bg-black rounded overflow-hidden border-2 border-[#1c283d] flex items-center justify-center group">
        
        {/* Live Imagery Stream */}
        {telemetry?.frame_image_base64 ? (
          <img
            src={`data:image/jpeg;base64,${telemetry.frame_image_base64}`}
            alt="RAVEN Tactical Video Stream"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-3">
            <div className="relative">
              <Video className="w-10 h-10 animate-pulse text-sky-600" />
              <div className="absolute inset-0 rounded-full border border-sky-500 animate-ping opacity-25" />
            </div>
            <div className="text-center">
              <span className="text-xs font-mono font-bold text-slate-300 block">ESTABLISHING ENCRYPTED C2 SENSOR STREAM</span>
              <span className="text-[10px] font-mono text-slate-500">AWAITING RTSP/SYNTHETIC FRAMES...</span>
            </div>
          </div>
        )}

        {/* 3. Military Tactical HUD Reticle Overlay */}
        {showHudOverlay && (
          <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
            {/* Corner Reticle Brackets */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-amber-400/80" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-amber-400/80" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-amber-400/80" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-amber-400/80" />

            {/* 10% Margin Boundary Guide Lines (Paper Specification) */}
            <div className="absolute inset-[10%] border border-dashed border-sky-500/30 rounded-sm">
              <span className="absolute -top-2 left-3 bg-black/80 px-1 text-[8px] font-mono text-sky-400/80 uppercase">
                10% PTZ TRIGGER MARGIN
              </span>
            </div>

            {/* Center Crosshair with Milliradian Ticks */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="w-10 h-px bg-amber-400/40" />
              <div className="h-10 w-px bg-amber-400/40 absolute" />
              <div className="w-3 h-3 rounded-full border border-amber-400/50" />
            </div>

            {/* Top-Left Tactical Telemetry HUD Block */}
            <div className="bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded border border-[#1e2a3f] text-[10px] font-mono text-slate-300 space-y-0.5 max-w-xs shadow-lg">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Target className="w-3 h-3 text-amber-400" />
                <span>OPTICAL SENSOR // BORESIGHT LOCKED</span>
              </div>
              <div className="text-slate-400">
                AZ: <strong className="text-slate-100">{telemetry?.ptz.pan_deg.toFixed(1) ?? '0.0'}°</strong> | 
                EL: <strong className="text-slate-100">{telemetry?.ptz.tilt_deg.toFixed(1) ?? '0.0'}°</strong> | 
                FOV: <strong className="text-slate-100">60.0°</strong>
              </div>
              <div className="text-slate-400">
                GRID REF: <strong className="text-sky-300">43R XN 8241 9302</strong>
              </div>
            </div>

            {/* Top-Right Feed Status HUD */}
            <div className="self-end bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded border border-[#1e2a3f] text-[10px] font-mono text-slate-300 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-bold">REC ● MIL-FEED</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">{telemetry ? `${telemetry.source.resolution[0]}x${telemetry.source.resolution[1]}` : '1280x720'}</span>
            </div>
          </div>
        )}

        {/* 4. PTZ 10% Margin Boundary Alert Banners */}
        {inBoundary && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/95 text-white text-xs px-4 py-1.5 rounded border-2 border-red-500 font-mono flex items-center gap-2 shadow-2xl backdrop-blur-md glow-threat-critical">
            <ShieldAlert className="w-4 h-4 text-red-200 animate-bounce" />
            <span className="font-bold">CRITICAL // PTZ BOUNDARY ENGAGED: TARGET REACHED 10% {telemetry?.boundary?.edge?.toUpperCase()} MARGIN</span>
          </div>
        )}
        {!inBoundary && approaching && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 text-xs px-4 py-1.5 rounded border border-amber-500 font-mono flex items-center gap-2 shadow-xl backdrop-blur-md glow-threat-watch">
            <Crosshair className="w-4 h-4 text-amber-300" />
            <span className="font-bold">CAUTION // TARGET APPROACHING 10% GIMBAL BOUNDARY</span>
          </div>
        )}

        {/* 5. Bottom Telemetry Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono text-slate-300 bg-black/90 backdrop-blur-md px-3 py-1.5 rounded border border-[#1e2a3f]">
          <div className="flex gap-4">
            <span>RES: <strong className="text-slate-100">{telemetry ? `${telemetry.source.resolution[0]}x${telemetry.source.resolution[1]}` : '---'}</strong></span>
            <span>FPS: <strong className="text-emerald-400">{telemetry?.performance.fps ?? '--'}</strong></span>
            <span>AIR CONTACTS: <strong className="text-sky-400">{telemetry?.tracks.length ?? 0} ACTIVE</strong></span>
          </div>
          <div className="flex gap-4">
            <span>PTZ AZ: <strong className="text-amber-400">{telemetry?.ptz.pan_deg ?? 0.0}°</strong></span>
            <span>PTZ EL: <strong className="text-amber-400">{telemetry?.ptz.tilt_deg ?? 0.0}°</strong></span>
            <span>GIMBAL: <strong className="text-slate-200">{telemetry?.ptz.mode === 'ONVIF' ? 'HARDWARE ONVIF' : 'SIMULATOR'}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
