import React, { useState, useEffect } from 'react';
import type { TelemetryPayload } from '../types/raven';
import { fetchSystemStatus, fetchRecentLogs } from '../services/api';
import {
  Activity,
  Cpu,
  Eye,
  Camera,
  Layers,
  Clock,
  ArrowUpRight,
  Play,
  FileText,
  Sliders
} from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
  onNavigate: (tabId: string) => void;
}

export const OverviewPage: React.FC<Props> = ({ telemetry, onNavigate }) => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [status, logs] = await Promise.all([
          fetchSystemStatus().catch(() => null),
          fetchRecentLogs(10).catch(() => [])
        ]);
        setSystemStatus(status);
        setRecentEvents(logs || []);
      } catch (err) {
        console.error('Failed to load overview data', err);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fps = telemetry?.performance?.fps ?? systemStatus?.performance?.fps ?? 0;
  const totalLatency = telemetry?.performance?.total_latency_ms ?? 0;
  const activeTracksCount = telemetry?.tracks?.length ?? 0;
  
  // Calculate average confidence from active tracks
  const avgConfidence = telemetry?.tracks?.length
    ? (telemetry.tracks.reduce((acc, t) => acc + t.ensemble_confidence, 0) / telemetry.tracks.length)
    : 0;

  const isCameraConnected = telemetry?.ptz?.connected ?? true;
  const cameraMode = telemetry?.ptz?.mode ?? systemStatus?.ptz?.mode ?? 'SIMULATION';
  const yoloLoaded = systemStatus?.yolo_detector?.loaded ?? true;
  const valCnnLoaded = systemStatus?.val_cnn_validator?.loaded ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Intro */}
      <div className="enterprise-card p-6 border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Executive Dashboard</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">DeTrAck Reference Architecture (YOLO11s → VaL_CNN → DeepSORT)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              RAVEN AI Surveillance Platform
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time multi-stage aerial object detection, secondary CNN verification, persistent trajectory tracking, and automated pan-tilt-zoom camera management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('live_monitoring')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Open Live Monitoring</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Processing FPS */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Processing Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {fps > 0 ? fps.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-400">FPS</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${fps >= 20 ? 'badge-online' : 'badge-warning'}`}>
              {fps >= 20 ? 'Real-time Nominal' : 'Sub-realtime'}
            </span>
            <span className="text-slate-500 text-[11px]">Target: 30 FPS</span>
          </div>
        </div>

        {/* Inference Latency */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Pipeline Latency</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {totalLatency > 0 ? totalLatency.toFixed(1) : '--'}
            </span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <span>YOLO: {telemetry?.performance?.yolo_latency_ms?.toFixed(1) ?? '--'} ms</span>
            <span className="mx-1 text-slate-600">|</span>
            <span>VaL: {telemetry?.performance?.val_cnn_latency_ms?.toFixed(1) ?? '--'} ms</span>
          </div>
        </div>

        {/* Active Tracked Objects */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Tracks</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {activeTracksCount}
            </span>
            <span className="text-xs text-slate-400">targets</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>DeepSORT Kalman</span>
            <span className="text-cyan-400 cursor-pointer hover:underline" onClick={() => onNavigate('object_tracking')}>
              Inspect Tracks →
            </span>
          </div>
        </div>

        {/* Mean Ensemble Confidence */}
        <div className="enterprise-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Mean Confidence</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {avgConfidence > 0 ? (avgConfidence * 100).toFixed(1) + '%' : 'N/A'}
            </span>
            <span className="text-xs text-slate-400">S_Ens</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            <span>Ensemble Alpha: {systemStatus?.ensemble?.alpha ?? 0.70}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Model/Source Status and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Subsystem Status & Quick Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Subsystem Health Card */}
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <h2 className="text-sm font-semibold text-slate-200">Subsystem Diagnostics</h2>
              <span className="badge-online px-2 py-0.5 rounded text-xs font-medium">All Services Online</span>
            </div>
            <div className="enterprise-card-body space-y-3.5">
              {/* YOLO Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${yoloLoaded ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-slate-300 font-medium">Primary Detector (YOLO11s)</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {yoloLoaded ? (systemStatus?.yolo_detector?.device?.toUpperCase() || 'CPU') : 'Not Loaded'}
                </span>
              </div>

              {/* VaL_CNN Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${valCnnLoaded ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="text-slate-300 font-medium">Secondary Validator (VaL_CNN)</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {valCnnLoaded ? 'Trained Checkpoint' : 'Initialized (Fallback)'}
                </span>
              </div>

              {/* DeepSORT Tracker */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">Multi-Target Tracker (DeepSORT)</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {activeTracksCount} Active
                </span>
              </div>

              {/* PTZ Camera Link */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCameraConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-slate-300 font-medium">Camera Servo / Gimbal</span>
                </div>
                <span className="text-amber-400 font-mono text-[11px]">
                  {cameraMode === 'ONVIF' ? 'Hardware ONVIF' : 'Simulation Mode'}
                </span>
              </div>

              {/* Telemetry Database */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-300 font-medium">Telemetry Logging (SQLite)</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">Active</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <h2 className="text-sm font-semibold text-slate-200">Quick Navigation</h2>
            </div>
            <div className="enterprise-card-body grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('camera_ptz')}
                className="p-3 enterprise-subcard text-left hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-slate-200">Camera & PTZ</div>
                <div className="text-[11px] text-slate-500">Servos and diagnostics</div>
              </button>

              <button
                onClick={() => onNavigate('analytics')}
                className="p-3 enterprise-subcard text-left hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-slate-200">Ablation Studies</div>
                <div className="text-[11px] text-slate-500">Benchmark configs A–E</div>
              </button>

              <button
                onClick={() => onNavigate('model_lab')}
                className="p-3 enterprise-subcard text-left hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-slate-200">Model Lab</div>
                <div className="text-[11px] text-slate-500">Weights and training</div>
              </button>

              <button
                onClick={() => onNavigate('settings_about')}
                className="p-3 enterprise-subcard text-left hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs font-semibold text-slate-200">Settings & About</div>
                <div className="text-[11px] text-slate-500">Parameters and info</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Detection & Event History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Surveillance Target Snapshot */}
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Active Detected Targets</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {telemetry?.tracks?.length ?? 0} In Frame
              </span>
            </div>
            <div className="enterprise-card-body">
              {telemetry?.tracks && telemetry.tracks.length > 0 ? (
                <div className="space-y-2.5">
                  {telemetry.tracks.map((t) => (
                    <div
                      key={t.track_id}
                      onClick={() => onNavigate('object_tracking')}
                      className="p-3 enterprise-subcard flex items-center justify-between hover:border-cyan-500/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                          #{t.track_id}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-200">
                            {t.class_name ? t.class_name.toUpperCase() : 'UAV / DRONE'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            YOLO: {t.yolo_confidence.toFixed(2)} | VaL: {t.val_confidence.toFixed(2)} | Dist: {t.distance_m}m
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-cyan-400">
                          Ens: {(t.ensemble_confidence * 100).toFixed(1)}%
                        </div>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] mt-1 font-medium ${
                          t.situation_state === 'ANOMALY' ? 'badge-alert' : t.situation_state === 'WATCH' ? 'badge-warning' : 'badge-online'
                        }`}>
                          {t.situation_state}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p>No active targets detected in current frame.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Video stream is active and monitoring.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Event Log Stream */}
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-200">Recent Surveillance Events</h2>
              </div>
              <button
                onClick={() => onNavigate('event_history')}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                View Full Log →
              </button>
            </div>
            <div className="enterprise-card-body">
              {recentEvents && recentEvents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left enterprise-table">
                    <thead>
                      <tr>
                        <th>Time (UTC)</th>
                        <th>Target</th>
                        <th>Confidence</th>
                        <th>Distance</th>
                        <th>PTZ Action</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {recentEvents.slice(0, 5).map((ev: any) => (
                        <tr key={ev.id}>
                          <td className="text-slate-400 text-[11px] whitespace-nowrap">{ev.timestamp?.substring(11, 19) || ev.timestamp}</td>
                          <td className="text-cyan-400 font-bold">#{ev.track_id}</td>
                          <td className="text-slate-300">{(ev.ensemble_confidence * 100).toFixed(0)}%</td>
                          <td className="text-slate-300">{ev.distance_m ? `${ev.distance_m}m` : '--'}</td>
                          <td className="text-amber-400">{ev.ptz_command || 'IDLE'}</td>
                          <td>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-sans font-medium ${
                              ev.situation_state === 'ANOMALY' ? 'badge-alert' : ev.situation_state === 'WATCH' ? 'badge-warning' : 'badge-online'
                            }`}>
                              {ev.situation_state || 'NORMAL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No historical event records logged yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
