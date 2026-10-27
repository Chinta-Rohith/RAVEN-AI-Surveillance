import React, { useState, useEffect } from 'react';
import { fetchAblationResults, runAblationBenchmark } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Play,
  Download,
  Cpu,
  FileText,
  Info
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const loadResults = async () => {
    try {
      const data = await fetchAblationResults();
      setResults(data);
    } catch (err) {
      console.error('Failed to load ablation results', err);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    try {
      const data = await runAblationBenchmark(30);
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raven_ablation_evaluation.json';
    a.click();
  };

  const handleExportCSV = () => {
    if (!results?.configs) return;
    const headers = ['Configuration', 'Average Latency (ms)', 'FPS', 'False Positives Filtered', 'Tracking Continuity', 'PTZ Recenter Loop'];
    const rows = Object.entries(results.configs).map(([name, data]: [string, any]) => [
      `"${name}"`,
      data.average_latency_ms,
      data.fps,
      data.false_positives_filtered,
      `"${data.tracking_continuity}"`,
      `"${data.ptz_recenter_loop}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raven_ablation_evaluation.csv';
    a.click();
  };

  const configs = results?.configs || {};
  const hasResults = Object.keys(configs).length > 0;

  // Chart data formatting
  const chartData = Object.entries(configs).map(([name, data]: [string, any]) => ({
    name: name.replace('Configuration ', 'Config '),
    latency: data.average_latency_ms,
    fps: data.fps
  }));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="enterprise-card p-6 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Research Evaluation</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">DeTrAck Empirical Ablation Study</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Analytics &amp; Model Comparison
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Comparative benchmark evaluating architectural Configurations A through E across latency, throughput, false-positive suppression, and PTZ servo stability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunBenchmark}
              disabled={isRunning}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isRunning ? 'Running Benchmark (30 frames)...' : 'Run Live Benchmark'}</span>
            </button>

            {hasResults && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>JSON</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Methodology Note */}
      <div className="enterprise-subcard p-4 flex items-center gap-3 text-xs text-slate-400">
        <Info className="w-5 h-5 text-cyan-400 shrink-0" />
        <span>
          <strong>Evaluation Standard:</strong> Results reflect measured throughput and execution latency on the host CPU/GPU runtime. Configurations A–E reproduce the comparative configurations reported in the DeTrAck methodology.
        </span>
      </div>

      {/* Visual Chart if results exist */}
      {hasResults && chartData.length > 0 && (
        <div className="enterprise-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Throughput &amp; Latency Profile Across Configurations</h2>
              <p className="text-xs text-slate-400 mt-0.5">Empirical trade-off between false-positive verification overhead and real-time processing FPS</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="latency" name="Latency (ms)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fps" name="Throughput (FPS)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Configuration Comparison Matrix Table */}
      <div className="enterprise-card">
        <div className="enterprise-card-header">
          <h2 className="text-sm font-semibold text-slate-200">Architectural Configurations A–E Matrix</h2>
          <span className="text-xs text-slate-400 font-mono">Reference Study: IEEE Access 2025</span>
        </div>

        {!hasResults ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-400">No benchmark evaluations recorded in current session.</p>
            <p className="mt-1 text-slate-500">Click "Run Live Benchmark" above to test all 5 configurations on live frames.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left enterprise-table">
              <thead>
                <tr>
                  <th>Configuration</th>
                  <th>Mean Latency</th>
                  <th>Throughput</th>
                  <th>False-Positive Filter</th>
                  <th>Tracking Continuity</th>
                  <th>PTZ Closed-Loop</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {Object.entries(configs).map(([name, data]: [string, any]) => (
                  <tr key={name}>
                    <td className="font-sans font-semibold text-slate-200">{name}</td>
                    <td className="text-cyan-400 font-bold">{data.average_latency_ms} ms</td>
                    <td className="text-emerald-400 font-bold">{data.fps} FPS</td>
                    <td className="text-slate-300 font-sans">{data.false_positives_filtered}</td>
                    <td className="text-slate-300 font-sans">{data.tracking_continuity}</td>
                    <td className="text-amber-400 font-sans">{data.ptz_recenter_loop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
