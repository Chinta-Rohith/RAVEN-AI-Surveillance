import React, { useState } from 'react';
import type { TelemetryPayload, TrackedUAV } from '../types/raven';
import { selectTrackTarget } from '../services/api';
import {
  Crosshair,
  Radio,
  Filter
} from 'lucide-react';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const ObjectTrackingPage: React.FC<Props> = ({ telemetry }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [filterState, setFilterState] = useState<string>('ALL');

  const tracks: TrackedUAV[] = telemetry?.tracks || [];

  const handleSelectTrack = async (id: number | null) => {
    setSelectedTargetId(id === selectedTargetId ? null : id);
    await selectTrackTarget(id === selectedTargetId ? null : id);
  };

  const filteredTracks = tracks.filter((t) => {
    if (filterState === 'ALL') return true;
    return t.situation_state === filterState;
  });

  const selectedTrack = tracks.find((t) => t.track_id === selectedTargetId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="enterprise-card p-6 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">DeepSORT Multi-Target Workspace</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Kalman State [x, y, a, h, vx, vy, va, vh]</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Object Tracking Management
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Track multi-object aerial targets with persistent IDs, bounding box trajectories, and Cosine Re-ID appearance embedding associations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Filter:</span>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">All Target States</option>
                <option value="NORMAL" className="bg-slate-900 text-slate-200">Normal Operations</option>
                <option value="WATCH" className="bg-slate-900 text-slate-200">Watch / Elevated</option>
                <option value="ANOMALY" className="bg-slate-900 text-slate-200">Anomaly / Incursions</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Track List Table and Detailed Track Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Track Matrix */}
        <div className={selectedTrack ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          <div className="enterprise-card">
            <div className="enterprise-card-header">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-200">Active Track Matrix ({filteredTracks.length})</h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Max Cosine Dist: 0.20</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left enterprise-table">
                <thead>
                  <tr>
                    <th>Target ID</th>
                    <th>Class</th>
                    <th>YOLO11</th>
                    <th>VaL_CNN</th>
                    <th>Ensemble</th>
                    <th>Hits / Age</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  {filteredTracks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500 italic">
                        No targets matching active filter. Scanning video stream...
                      </td>
                    </tr>
                  ) : (
                    filteredTracks.map((t) => {
                      const isSelected = t.track_id === selectedTargetId;
                      return (
                        <tr
                          key={t.track_id}
                          onClick={() => handleSelectTrack(t.track_id)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-cyan-950/30' : ''
                          }`}
                        >
                          <td className="font-bold text-slate-100">
                            #{t.track_id}
                          </td>
                          <td className="text-slate-300 font-sans">{t.class_name || 'UAV'}</td>
                          <td className="text-slate-300">{t.yolo_confidence.toFixed(2)}</td>
                          <td className="text-slate-300">{t.val_confidence.toFixed(2)}</td>
                          <td className="text-emerald-400 font-bold">
                            {(t.ensemble_confidence * 100).toFixed(1)}%
                          </td>
                          <td className="text-slate-400">{t.hits} / {t.age}</td>
                          <td className="text-cyan-400 font-semibold">{t.distance_m}m</td>
                          <td>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-sans font-medium ${
                              t.situation_state === 'ANOMALY' ? 'badge-alert' : t.situation_state === 'WATCH' ? 'badge-warning' : 'badge-online'
                            }`}>
                              {t.situation_state}
                            </span>
                          </td>
                          <td className="text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectTrack(t.track_id);
                              }}
                              className={`px-2.5 py-1 rounded text-xs font-sans transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Inspect'}
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
        </div>

        {/* Right Column: Track Inspector Details */}
        {selectedTrack && (
          <div className="lg:col-span-4 space-y-4">
            <div className="enterprise-card">
              <div className="enterprise-card-header">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Track #{selectedTrack.track_id} Telemetry</h3>
                </div>
                <button
                  onClick={() => setSelectedTargetId(null)}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="enterprise-card-body space-y-4">
                {/* Confidence Scores Card */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confidence Scores</h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                    <div className="p-2 enterprise-subcard">
                      <span className="text-[10px] text-slate-400 block">YOLO11</span>
                      <span className="font-bold text-slate-200">{selectedTrack.yolo_confidence.toFixed(2)}</span>
                    </div>
                    <div className="p-2 enterprise-subcard">
                      <span className="text-[10px] text-slate-400 block">VaL_CNN</span>
                      <span className="font-bold text-slate-200">{selectedTrack.val_confidence.toFixed(2)}</span>
                    </div>
                    <div className="p-2 enterprise-subcard">
                      <span className="text-[10px] text-slate-400 block">Ensemble</span>
                      <span className="font-bold text-emerald-400">{selectedTrack.ensemble_confidence.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Spatial Coordinates & Bounding Box */}
                <div className="space-y-2 text-xs">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spatial Estimates</h4>
                  <div className="p-3 enterprise-subcard space-y-1.5 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Distance (Monocular):</span>
                      <span className="text-cyan-400 font-bold">{selectedTrack.distance_m} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Velocity Vector:</span>
                      <span>({selectedTrack.velocity[0].toFixed(1)}, {selectedTrack.velocity[1].toFixed(1)}) px/frame</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bounding Box:</span>
                      <span className="text-[11px] text-slate-400">[{selectedTrack.bbox.map(Math.round).join(', ')}]</span>
                    </div>
                  </div>
                </div>

                {/* Tracking Duration & Continuity */}
                <div className="space-y-2 text-xs">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Continuity & Longevity</h4>
                  <div className="p-3 enterprise-subcard space-y-1.5 font-mono text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frames Confirmed:</span>
                      <span className="font-bold">{selectedTrack.hits} frames</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Track Age:</span>
                      <span>{selectedTrack.age} frames</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Track Continuity:</span>
                      <span className="text-emerald-400 font-semibold">Continuous (No ID Switch)</span>
                    </div>
                  </div>
                </div>

                {/* Center PTZ Camera Button */}
                <button
                  onClick={() => handleSelectTrack(selectedTrack.track_id)}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Lock PTZ Camera on Target #{selectedTrack.track_id}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
