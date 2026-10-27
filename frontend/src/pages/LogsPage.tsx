import React, { useState, useEffect } from 'react';
import { fetchRecentLogs, getExportLogsUrl } from '../services/api';
import type { TelemetryEventRecord } from '../types/raven';
import { tacticalAudio } from '../utils/tacticalAudio';
import { FileText, Download, RefreshCw } from 'lucide-react';

export const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<TelemetryEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadLogs = async () => {
    tacticalAudio.playClick();
    setIsLoading(true);
    try {
      const data = await fetchRecentLogs(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-07 // MISSION TELEMETRY ARCHIVE & DECISION AUDIT LOG
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                SQLITE PERSISTENT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              TAMPER-EVIDENT HISTORICAL RECORDING OF BBOX COORDINATES, ENSEMBLE DECISIONS, AND SERVO STEERING ACTIONS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3 py-2 bg-[#0a101d] hover:bg-slate-800 text-slate-200 rounded flex items-center gap-1.5 border border-[#1e2a3f]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            REFRESH LEDGER
          </button>

          <a
            href={getExportLogsUrl()}
            download="RAVEN_MISSION_TELEMETRY_LOG.csv"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
          >
            <Download className="w-3.5 h-3.5 fill-current" />
            EXPORT CSV LEDGER
          </a>
        </div>
      </div>

      {/* 2. Mission Logs Ledger Table */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-4 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1c283d] bg-[#070b14] text-slate-400 text-[10px] uppercase">
                <th className="py-2.5 px-3">TIMESTAMP (UTC)</th>
                <th className="py-2.5 px-3">TARGET</th>
                <th className="py-2.5 px-3">BBOX [X, Y, W, H]</th>
                <th className="py-2.5 px-3">YOLO11</th>
                <th className="py-2.5 px-3">VaL_CNN</th>
                <th className="py-2.5 px-3">S_ENS</th>
                <th className="py-2.5 px-3">EST RANGE</th>
                <th className="py-2.5 px-3">PTZ AZ / EL</th>
                <th className="py-2.5 px-3">PTZ ACTION</th>
                <th className="py-2.5 px-3">THREAT STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152033] text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-slate-500 italic bg-[#060a12]/50">
                    {isLoading ? 'QUERYING CLASSIFIED EVENT DATABASE...' : 'NO MISSION TELEMETRY RECORDS FOUND.'}
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="hover:bg-[#0c1424] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 text-[10px] whitespace-nowrap">{row.timestamp}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">TRK-0{row.track_id}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10px]">{JSON.stringify(row.bbox)}</td>
                    <td className="py-2.5 px-3 text-slate-300">{(row.yolo_confidence * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 text-slate-300">{(row.val_confidence * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{row.ensemble_confidence.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{row.distance_m ? `${row.distance_m}m` : '---'}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">
                      {row.ptz_pan}° / {row.ptz_tilt}°
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[10px]">{row.ptz_command}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          row.situation_state === 'ANOMALY'
                            ? 'bg-red-950 text-red-300 border-red-700'
                            : row.situation_state === 'WATCH'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {row.situation_state}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
