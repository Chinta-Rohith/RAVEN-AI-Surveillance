import React, { useState } from 'react';
import type { TelemetryPayload, TrackedUAV } from '../types/raven';
import {
  selectVideoSource,
  toggleIRMode,
  uploadVideoFile,
  togglePipeline,
  pausePipeline,
  selectTrackTarget,
  getExportLogsUrl
} from '../services/api';
import {
  Play,
  Pause,
  Square,
  Upload,
  Camera,
  Layers,
  Crosshair,
  Flame,
  Download,
  ChevronRight,
  ChevronLeft,
  Compass,
  ShieldAlert
} from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const LiveMonitoringPage: React.FC<Props> = ({ telemetry }) => {
  const [sourceType, setSourceType] = useState<string>('synthetic');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Overlay visualization toggles
  const [showDebugHUD, setShowDebugHUD] = useState<boolean>(true);

  // Layout panels
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(true);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  const handleSourceChange = async (type: string) => {
    setSourceType(type);
    await selectVideoSource(type);
  };

  const handleIRToggle = async () => {
    const currentIR = telemetry?.source.ir_mode ?? false;
    await toggleIRMode(!currentIR);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const handleToggleRunning = async () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    await togglePipeline(nextState);
  };

  const handleTogglePause = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    await pausePipeline(nextState);
  };

  const handleSelectTrack = async (id: number | null) => {
    setSelectedTrackId(id);
    await selectTrackTarget(id);
  };

  const handleCaptureScreenshot = () => {
    if (!telemetry?.frame_image_base64) return;
    const a = document.createElement('a');
    a.href = `data:image/jpeg;base64,${telemetry.frame_image_base64}`;
    a.download = `raven_surveillance_frame_${Date.now()}.jpg`;
    a.click();
  };

  const isIR = telemetry?.source.ir_mode ?? false;
  const inBoundary = telemetry?.boundary.in_boundary ?? false;
  const approaching = telemetry?.boundary.approaching ?? false;

  const tracks = telemetry?.tracks || [];
  const selectedTrack: TrackedUAV | undefined = tracks.find((t) => t.track_id === selectedTrackId) || tracks[0];

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="enterprise-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Source & Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Start/Stop Processing */}
          <button
            onClick={handleToggleRunning}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRunning
                ? 'bg-red-950/80 text-red-400 border border-red-800 hover:bg-red-900/60'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            title={isRunning ? 'Stop Processing Engine' : 'Start Processing Engine'}
          >
            {isRunning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Stop' : 'Start'}</span>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={handleTogglePause}
            disabled={!isRunning}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              isPaused
                ? 'bg-amber-950/80 text-amber-300 border-amber-700 hover:bg-amber-900/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          {/* Source Selection Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Source:</span>
            <select
              value={sourceType}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="bg-slate-900 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="synthetic">Synthetic Demonstration (Procedural)</option>
              <option value="webcam">Local Camera / USB Webcam</option>
              <option value="rtsp">Configured RTSP Stream</option>
              <option value="video_file">Uploaded Video File</option>
            </select>
          </div>

          {/* Upload Button */}
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isUploading ? 'Uploading...' : 'Upload Video'}</span>
            <input type="file" accept="video/mp4,video/avi,video/mkv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* View Options & Actions */}
        <div className="flex items-center gap-2">
          {/* Thermal / IR Mode */}
          <button
            onClick={handleIRToggle}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isIR
                ? 'bg-amber-950/60 text-amber-300 border-amber-700'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{isIR ? 'IR Mode: White-Hot' : 'Simulate IR'}</span>
          </button>

          {/* Toggle HUD Overlay */}
          <button
            onClick={() => setShowDebugHUD(!showDebugHUD)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              showDebugHUD
                ? 'bg-cyan-950/50 text-cyan-400 border-cyan-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Debug HUD"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>HUD</span>
          </button>

          {/* Capture Screenshot */}
          <button
            onClick={handleCaptureScreenshot}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Save Snapshot"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Snapshot</span>
          </button>

          {/* Export Event CSV */}
          <a
            href={getExportLogsUrl()}
            download="raven_events.csv"
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Export CSV Events"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </a>

          {/* Toggle Side Panel */}
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isSidePanelOpen ? 'Collapse Inspector' : 'Expand Inspector'}
          >
            {isSidePanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Contextual Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Central Video Canvas */}
        <div className={isSidePanelOpen ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="enterprise-card relative overflow-hidden bg-black flex items-center justify-center min-h-[460px] aspect-video border-slate-800">
            {/* Live Frame Image */}
            {telemetry?.frame_image_base64 ? (
              <img
                src={`data:image/jpeg;base64,${telemetry.frame_image_base64}`}
                alt="RAVEN Surveillance Stream"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-slate-500 flex flex-col items-center gap-2 p-12">
                <Camera className="w-10 h-10 animate-pulse text-slate-600" />
                <span className="text-xs font-mono">Connecting to computer-vision inference engine...</span>
              </div>
            )}

            {/* Boundary Warning Banners */}
            {inBoundary && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-900/90 text-white text-xs px-4 py-1.5 rounded-full font-sans font-medium flex items-center gap-2 shadow-lg backdrop-blur-sm border border-red-700">
                <ShieldAlert className="w-4 h-4 text-red-200" />
                <span>Target reached 10% frame boundary margin ({telemetry?.boundary?.edge}) — PTZ recentering engaged</span>
              </div>
            )}
            {!inBoundary && approaching && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/90 text-amber-100 text-xs px-4 py-1.5 rounded-full font-sans font-medium flex items-center gap-2 shadow-lg backdrop-blur-sm border border-amber-700">
                <Crosshair className="w-4 h-4 text-amber-300" />
                <span>Target approaching 10% frame boundary margin</span>
              </div>
            )}

            {/* Technical HUD Overlay */}
            {showDebugHUD && (
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center text-xs font-mono text-slate-300 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800">
                <div className="flex gap-4">
                  <span>RES: <strong className="text-slate-100">{telemetry ? `${telemetry.source.resolution[0]}x${telemetry.source.resolution[1]}` : '--'}</strong></span>
                  <span>FPS: <strong className="text-emerald-400">{telemetry?.performance.fps ?? '--'}</strong></span>
                  <span>LATENCY: <strong className="text-cyan-400">{telemetry?.performance.total_latency_ms?.toFixed(1) ?? '--'} ms</strong></span>
                  <span>TARGETS: <strong className="text-amber-400">{tracks.length}</strong></span>
                </div>
                <div className="flex gap-4">
                  <span>PTZ PAN: <strong className="text-slate-200">{telemetry?.ptz.pan_deg.toFixed(1) ?? '0.0'}°</strong></span>
                  <span>PTZ TILT: <strong className="text-slate-200">{telemetry?.ptz.tilt_deg.toFixed(1) ?? '0.0'}°</strong></span>
                  <span>MODE: <strong className="text-cyan-400">{telemetry?.ptz.mode ?? 'SIM'}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Active Track Bar */}
          <div className="enterprise-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Tracked Target Roster ({tracks.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">DeTrAck Multi-Target Tracking</span>
              </div>
              <span className="text-[11px] text-slate-400">Click a target to lock camera</span>
            </div>

            {tracks.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-xs italic">
                Scanning frame. No active aerial targets detected.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {tracks.map((t) => {
                  const isSelected = t.track_id === selectedTrackId;
                  return (
                    <div
                      key={t.track_id}
                      onClick={() => handleSelectTrack(isSelected ? null : t.track_id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'enterprise-subcard hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                          Target #{t.track_id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          YOLO: {t.yolo_confidence.toFixed(2)} | VaL: {t.val_confidence.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {(t.ensemble_confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {t.distance_m}m
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Collapsible Right Contextual Panel */}
        {isSidePanelOpen && (
          <div className="lg:col-span-4 space-y-4">
            {/* Target Inspector Card */}
            <div className="enterprise-card">
              <div className="enterprise-card-header">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Target Inspector
                  </h3>
                </div>
                {selectedTrack && (
                  <span className="badge-online px-2 py-0.5 rounded text-[11px] font-mono">
                    Track #{selectedTrack.track_id}
                  </span>
                )}
              </div>
              <div className="enterprise-card-body space-y-3.5">
                {selectedTrack ? (
                  <>
                    {/* Confidence Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="p-2 enterprise-subcard">
                        <span className="text-[10px] text-slate-400 block">YOLO11</span>
                        <span className="text-sm font-bold text-slate-200">
                          {selectedTrack.yolo_confidence.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2 enterprise-subcard">
                        <span className="text-[10px] text-slate-400 block">VaL_CNN</span>
                        <span className="text-sm font-bold text-slate-200">
                          {selectedTrack.val_confidence.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-2 enterprise-subcard">
                        <span className="text-[10px] text-slate-400 block">Ensemble</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {selectedTrack.ensemble_confidence.toFixed(3)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata items */}
                    <div className="text-xs space-y-2 text-slate-300">
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Classification:</span>
                        <span className="font-medium text-slate-200">{selectedTrack.class_name || 'UAV / Drone'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Estimated Distance:</span>
                        <span className="font-mono text-cyan-400 font-semibold">{selectedTrack.distance_m} meters</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Tracking Duration:</span>
                        <span className="font-mono">{selectedTrack.hits} frames ({((selectedTrack.hits / Math.max(1, telemetry?.performance.fps || 25))).toFixed(1)}s)</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-slate-400">Bounding Box:</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          [{selectedTrack.bbox.map(Math.round).join(', ')}]
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Situation State:</span>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          selectedTrack.situation_state === 'ANOMALY' ? 'badge-alert' : selectedTrack.situation_state === 'WATCH' ? 'badge-warning' : 'badge-online'
                        }`}>
                          {selectedTrack.situation_state}
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => handleSelectTrack(selectedTrack.track_id)}
                      className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>Center PTZ on Target #{selectedTrack.track_id}</span>
                    </button>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    Select a target to inspect detailed confidence scores and telemetry.
                  </div>
                )}
              </div>
            </div>

            {/* Camera Gimbal Quick Control */}
            <div className="enterprise-card">
              <div className="enterprise-card-header">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Camera Orientation
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {telemetry?.ptz.mode === 'ONVIF' ? 'Hardware ONVIF' : 'Simulation'}
                </span>
              </div>
              <div className="enterprise-card-body space-y-3 font-mono text-xs">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 enterprise-subcard">
                    <span className="text-[10px] text-slate-400 block">Pan</span>
                    <span className="font-bold text-amber-400">{telemetry?.ptz.pan_deg.toFixed(1) ?? '0.0'}°</span>
                  </div>
                  <div className="p-2 enterprise-subcard">
                    <span className="text-[10px] text-slate-400 block">Tilt</span>
                    <span className="font-bold text-amber-400">{telemetry?.ptz.tilt_deg.toFixed(1) ?? '0.0'}°</span>
                  </div>
                  <div className="p-2 enterprise-subcard">
                    <span className="text-[10px] text-slate-400 block">Zoom</span>
                    <span className="font-bold text-cyan-400">{telemetry?.ptz.zoom_level.toFixed(1) ?? '1.0'}x</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
                  <span>Controller Action:</span>
                  <span className="font-bold text-emerald-400">{telemetry?.ptz_command.action ?? 'IDLE'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
