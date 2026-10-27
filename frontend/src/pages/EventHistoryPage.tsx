import React, { useState, useEffect } from 'react';
import { fetchRecentLogs, getExportLogsUrl } from '../services/api';
import type { TelemetryEventRecord } from '../types/raven';
import {
  Download,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

export const EventHistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<TelemetryEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTarget, setSearchTarget] = useState<string>('');
  const [filterThreat, setFilterThreat] = useState<string>('ALL');

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRecentLogs(200);
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

  const filteredLogs = logs.filter((log) => {
    const matchesTarget =
      !searchTarget ||
      (log.track_id !== undefined &&
        log.track_id.toString().includes(searchTarget.trim()));

    const matchesThreat =
      filterThreat === 'ALL' ||
      (log.situation_state &&
        log.situation_state.toUpperCase() === filterThreat.toUpperCase());

    return matchesTarget && matchesThreat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Event History</h1>
            <span className="badge-online text-xs px-2 py-0.5 font-medium">SQLite Persistent</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Historical audit ledger of candidate detections, ensemble validation decisions, and camera servo commands.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
          <a
            href={getExportLogsUrl()}
            download="RAVEN_TELEMETRY_LOG.csv"
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="enterprise-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Track ID..."
              value={searchTarget}
              onChange={(e) => setSearchTarget(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterThreat}
              onChange={(e) => setFilterThreat(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NOMINAL">Nominal</option>
              <option value="WATCH">Watch</option>
              <option value="ANOMALY">Anomaly</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-white">{filteredLogs.length}</span> of {logs.length} records
        </div>
      </div>

      {/* Ledger Table */}
      <div className="enterprise-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Track ID</th>
                <th>Bounding Box [X, Y, W, H]</th>
                <th>YOLO11</th>
                <th>VaL_CNN</th>
                <th>Ensemble (S_Ens)</th>
                <th>Est. Distance</th>
                <th>PTZ Position</th>
                <th>PTZ Command</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 italic">
                    {isLoading ? 'Querying telemetry database...' : 'No telemetry records matching filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => (
                  <tr key={row.id}>
                    <td className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {row.timestamp}
                    </td>
                    <td className="font-semibold text-white">
                      <span className="font-mono text-xs text-sky-400">#{row.track_id ?? '—'}</span>
                    </td>
                    <td className="font-mono text-[11px] text-slate-400">
                      {Array.isArray(row.bbox) ? `[${row.bbox.map((n) => Math.round(n)).join(', ')}]` : '—'}
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {(row.yolo_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {(row.val_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="font-mono text-xs font-semibold text-sky-400">
                      {(row.ensemble_confidence * 100).toFixed(1)}%
                    </td>
                    <td className="font-mono text-xs text-slate-300">
                      {row.distance_m !== null && row.distance_m !== undefined ? `${row.distance_m.toFixed(1)}m` : '—'}
                    </td>
                    <td className="font-mono text-[11px] text-slate-400">
                      Az: {row.ptz_pan?.toFixed(1) ?? '0.0'}° / El: {row.ptz_tilt?.toFixed(1) ?? '0.0'}°
                    </td>
                    <td>
                      <span className="font-mono text-[11px] text-slate-300">
                        {row.ptz_command || 'HOLD'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          row.situation_state === 'ANOMALY'
                            ? 'badge-alert'
                            : row.situation_state === 'WATCH'
                            ? 'badge-warning'
                            : 'badge-online'
                        }`}
                      >
                        {row.situation_state || 'NOMINAL'}
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
