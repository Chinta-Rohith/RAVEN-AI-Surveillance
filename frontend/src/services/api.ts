/**
 * RAVEN API and WebSocket Client
 */

const isDev = typeof window !== 'undefined' && window.location.port === '5173';
const envApi = import.meta.env.VITE_API_URL;
const envWs = import.meta.env.VITE_WS_URL;

// Active production backend endpoints
const FALLBACK_API = 'https://trained-races-worked-started.trycloudflare.com';
const FALLBACK_WS = 'wss://trained-races-worked-started.trycloudflare.com/ws/stream';

const API_BASE = envApi ? envApi.replace(/\/+$/, '') : (isDev ? 'http://localhost:8000' : FALLBACK_API);
const WS_URL = envWs || (envApi ? envApi.replace(/^http/, 'ws') + '/ws/stream' : (isDev ? 'ws://localhost:8000/ws/stream' : FALLBACK_WS));

export async function fetchSystemStatus() {
  const res = await fetch(`${API_BASE}/api/system/status`);
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/config`);
  return res.json();
}

export async function updateConfig(config: Record<string, any>) {
  const res = await fetch(`${API_BASE}/api/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function selectVideoSource(source_type: string, path_or_url?: string) {
  const res = await fetch(`${API_BASE}/api/source/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_type, path_or_url }),
  });
  return res.json();
}

export async function toggleIRMode(enabled: boolean) {
  const form = new FormData();
  form.append('enabled', String(enabled));
  const res = await fetch(`${API_BASE}/api/source/ir`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function uploadVideoFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/source/upload`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function sendManualPTZ(action: string, step: number = 5.0) {
  const res = await fetch(`${API_BASE}/api/ptz/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, step }),
  });
  return res.json();
}

export async function selectTrackTarget(target_id: number | null) {
  const res = await fetch(`${API_BASE}/api/ptz/select_target`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id }),
  });
  return res.json();
}

export async function fetchRecentLogs(limit: number = 100) {
  const res = await fetch(`${API_BASE}/api/logs/recent?limit=${limit}`);
  return res.json();
}

export function getExportLogsUrl() {
  return `${API_BASE}/api/logs/export`;
}

export async function fetchAblationResults() {
  const res = await fetch(`${API_BASE}/api/experiments/ablation`);
  return res.json();
}

export async function runAblationBenchmark(frames: number = 30) {
  const form = new FormData();
  form.append('frames', String(frames));
  const res = await fetch(`${API_BASE}/api/experiments/run`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function fetchDatasetSummary() {
  const res = await fetch(`${API_BASE}/api/datasets/summary`);
  return res.json();
}

export async function togglePipeline(running: boolean) {
  const form = new FormData();
  form.append('running', String(running));
  const res = await fetch(`${API_BASE}/api/pipeline/toggle`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function pausePipeline(paused: boolean) {
  const form = new FormData();
  form.append('paused', String(paused));
  const res = await fetch(`${API_BASE}/api/pipeline/pause`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function toggleAutoTrack(enabled: boolean) {
  const form = new FormData();
  form.append('enabled', String(enabled));
  const res = await fetch(`${API_BASE}/api/ptz/auto_track`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function fetchCameraDiagnostics() {
  const res = await fetch(`${API_BASE}/api/camera/diagnostics`);
  return res.json();
}

export async function fetchReportsSummary() {
  const res = await fetch(`${API_BASE}/api/reports/summary`);
  return res.json();
}

// Legacy Mock Compatibility Stubs
export async function startSimulation() { return {}; }
export async function pauseSimulation() { return {}; }
export async function stopSimulation() { return {}; }
export async function resetSimulation() { return {}; }
export async function selectScenario(_scenario: string) { return {}; }
export async function changeSpeed(_speed: number) { return {}; }
export async function updateEnvironment(_data: any) { return {}; }
export async function acknowledgeAlert(_id: string) { return {}; }

export { WS_URL };
