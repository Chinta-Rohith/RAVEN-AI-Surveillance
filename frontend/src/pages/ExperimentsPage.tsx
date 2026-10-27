import React, { useState, useEffect } from 'react';
import { fetchAblationResults, runAblationBenchmark } from '../services/api';
import { tacticalAudio } from '../utils/tacticalAudio';
import { Beaker, Play, Download, ShieldCheck, Cpu, CheckCircle2 } from 'lucide-react';

export const ExperimentsPage: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const loadResults = async () => {
    try {
      const data = await fetchAblationResults();
      setResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleRunBenchmark = async () => {
    tacticalAudio.playClick();
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
    tacticalAudio.playClick();
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RAVEN_ABLATION_BENCHMARK_REPORT.json';
    a.click();
  };

  const configs = results?.configs || {};
  const hasResults = Object.keys(configs).length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-950/80 border border-amber-700/60 text-amber-400">
            <Beaker className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-slate-100 uppercase font-mono">
                SEC-03 // DeTrAck ABLATION STUDY & BENCHMARK SUITE
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                EMPIRICAL VERIFICATION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              COMPARATIVE BENCHMARK MATRIX ACROSS ARCHITECTURAL CONFIGURATIONS A THROUGH E
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <button
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-black font-bold rounded flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'EXECUTING BENCHMARK...' : 'EXECUTE BENCHMARK'}
          </button>

          {hasResults && (
            <button
              onClick={handleExportJSON}
              className="px-3 py-2 bg-[#0a101d] hover:bg-slate-800 text-slate-200 rounded flex items-center gap-1.5 border border-[#1e2a3f]"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              EXPORT REPORT
            </button>
          )}
        </div>
      </div>

      {/* 2. Research Integrity & Official Standard Callout */}
      <div className="tactical-subpanel rounded border border-[#1c283d] p-3 text-xs font-mono text-slate-300 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold text-emerald-400 uppercase">DEFENSE ACADEMIC INTEGRITY DIRECTIVE:</span>{' '}
          <span className="text-slate-400">
            Benchmark latencies and frame rates are measured on the live execution hardware. Zero simulated figures are injected.
          </span>
        </div>
      </div>

      {/* 3. Configurations Matrix Table */}
      <div className="tactical-panel rounded border border-[#1e2a3f] p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1c283d] pb-3 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            ABLATION MATRIX: CONFIGURATIONS A–E (DeTrAck SPECIFICATION)
          </h3>
          <span className="text-[10px] font-mono text-slate-500">IEEE ACCESS 2025</span>
        </div>

        {!hasResults ? (
          <div className="text-center py-14 text-slate-500 font-mono text-xs tactical-subpanel rounded border border-dashed border-[#1a2538] p-6">
            <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
            <p className="font-bold text-slate-300 uppercase">NO EXPERIMENTAL RESULT LOGGED IN CURRENT SESSION</p>
            <p className="text-[11px] text-slate-500 mt-1">Click "EXECUTE BENCHMARK" to evaluate configurations A through E across 30 live pipeline frames.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#1c283d] bg-[#070b14] text-slate-400 text-[10px] uppercase">
                  <th className="py-2.5 px-3">PIPELINE ARCHITECTURE</th>
                  <th className="py-2.5 px-3">MEAN LATENCY</th>
                  <th className="py-2.5 px-3">THROUGHPUT (FPS)</th>
                  <th className="py-2.5 px-3">FALSE POSITIVE SUPPRESSION</th>
                  <th className="py-2.5 px-3">TRACKING CONTINUITY</th>
                  <th className="py-2.5 px-3">PTZ CLOSED-LOOP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152033]">
                {Object.entries(configs).map(([name, data]: [string, any]) => (
                  <tr key={name} className="hover:bg-[#0c1424] transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {name}
                    </td>
                    <td className="py-3 px-3 text-cyan-400 font-bold">{data.average_latency_ms} ms</td>
                    <td className="py-3 px-3 font-black text-emerald-400">{data.fps} FPS</td>
                    <td className="py-3 px-3 text-slate-300">{data.false_positives_filtered}</td>
                    <td className="py-3 px-3 text-slate-300">{data.tracking_continuity}</td>
                    <td className="py-3 px-3 text-amber-300 font-semibold">{data.ptz_recenter_loop}</td>
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
