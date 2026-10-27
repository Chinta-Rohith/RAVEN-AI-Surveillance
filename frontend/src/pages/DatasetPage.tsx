import React, { useState, useEffect } from 'react';
import { fetchDatasetSummary } from '../services/api';
import { Database, FolderTree, Layers, HardDrive, AlertCircle } from 'lucide-react';

export const DatasetPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatasetSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const valCnn = summary?.val_cnn_dataset;
  const yolo = summary?.yolo_dataset;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Dataset Management</h1>
            <span className="badge-online text-xs px-2 py-0.5 font-medium">Disk Verified</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Physical disk audit of UAV training data, validation splits, and class distribution counts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="enterprise-subcard px-3 py-1.5 flex items-center gap-2 text-xs text-slate-300">
            <HardDrive className="w-4 h-4 text-sky-400" />
            <span>Repository: <strong className="text-white">datasets/</strong></span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="enterprise-card p-12 text-center text-slate-400 text-sm">
          Scanning filesystem for dataset repositories...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: VaL_CNN Patch Dataset */}
          <div className="enterprise-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">VaL_CNN Patch Dataset</h2>
                    <p className="text-xs text-slate-400">64 × 64 ROI classification patches</p>
                  </div>
                </div>
                <span className="badge-info text-xs px-2.5 py-1">
                  {valCnn?.total_images ?? 0} Patches
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 text-xs">Directory Location</span>
                  <code className="font-mono text-xs text-sky-300">datasets/val_cnn/</code>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 text-xs">Class Distribution</span>
                  <span className="text-xs text-slate-200">
                    <span className="text-emerald-400 font-medium">0: Background</span>,{' '}
                    <span className="text-sky-400 font-medium">1: Drone / UAV</span>
                  </span>
                </div>
              </div>

              {/* Splits Breakdown */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">Partition Counts</h3>
                <div className="enterprise-subcard p-3 rounded space-y-2">
                  {valCnn?.splits && Object.keys(valCnn.splits).length > 0 ? (
                    Object.entries(valCnn.splits).map(([split, counts]: [string, any]) => (
                      <div key={split} className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="capitalize font-medium text-slate-300">{split}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Drone: <strong className="text-sky-400">{counts.drone_count}</strong> | BG:{' '}
                          <strong className="text-emerald-400">{counts.background_count}</strong> (Total:{' '}
                          <strong className="text-white">{counts.total}</strong>)
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 py-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>No images found in <code className="text-slate-400">datasets/val_cnn/</code></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400 block mb-1.5">Expected Directory Structure</span>
              <pre className="enterprise-subcard p-2.5 rounded text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto">
{`datasets/val_cnn/
├── train/
│   ├── drone/
│   └── background/
├── val/
│   ├── drone/
│   └── background/
└── test/
    ├── drone/
    └── background/`}
              </pre>
            </div>
          </div>

          {/* Card 2: YOLO11 Dataset */}
          <div className="enterprise-card p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">YOLO11 Detection Dataset</h2>
                    <p className="text-xs text-slate-400">Full-frame annotated bounding boxes</p>
                  </div>
                </div>
                <span className="badge-info text-xs px-2.5 py-1">
                  {yolo?.total_images ?? 0} Images
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 text-xs">Directory Location</span>
                  <code className="font-mono text-xs text-sky-300">datasets/yolo/</code>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400 text-xs">Annotation Standard</span>
                  <span className="text-xs text-slate-200">Darknet / Ultralytics TXT (Normalized cx, cy, w, h)</span>
                </div>
              </div>

              {/* Splits Breakdown */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-300 mb-2">Partition Counts</h3>
                <div className="enterprise-subcard p-3 rounded space-y-2">
                  {yolo?.splits && Object.keys(yolo.splits).length > 0 ? (
                    Object.entries(yolo.splits).map(([split, counts]: [string, any]) => (
                      <div key={split} className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-1.5 last:border-b-0 last:pb-0">
                        <span className="capitalize font-medium text-slate-300">{split}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          Images: <strong className="text-sky-400">{counts.images}</strong> | Labels:{' '}
                          <strong className="text-amber-400">{counts.labels}</strong>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 py-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>No images found in <code className="text-slate-400">datasets/yolo/</code></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400 block mb-1.5">Expected Directory Structure</span>
              <pre className="enterprise-subcard p-2.5 rounded text-[11px] font-mono text-slate-400 leading-relaxed overflow-x-auto">
{`datasets/yolo/
├── data.yaml
├── images/
│   ├── train/
│   ├── val/
│   └── test/
└── labels/
    ├── train/
    ├── val/
    └── test/`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Ingestion Notice */}
      <div className="enterprise-card p-6">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-sky-400" />
          Adding Custom Surveillance Data
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          To benchmark RAVEN on new optical or thermal drone recordings, place image frames and YOLO label files into the <code className="text-slate-300">datasets/yolo/</code> splits. For training the secondary validation network, use the cropping utility in <code className="text-slate-300">training/val_cnn/extract_patches.py</code> to generate 64×64 ROI patches directly from your annotated YOLO dataset.
        </p>
      </div>
    </div>
  );
};
