import React from 'react';
import type { TelemetryPayload } from '../types/raven';
import { SituationBanner } from '../components/SituationBanner';
import { LiveMonitor } from '../components/LiveMonitor';
import { TrackList } from '../components/TrackList';
import { PTZControlPanel } from '../components/PTZControlPanel';
import { PerformanceHUD } from '../components/PerformanceHUD';
import { DigitalTwin } from '../components/DigitalTwin';
import { ExplainabilityPanel } from '../components/ExplainabilityPanel';
import { selectTrackTarget } from '../services/api';

interface Props {
  telemetry: TelemetryPayload | null;
}

export const DashboardPage: React.FC<Props> = ({ telemetry }) => {
  const handleSelectTarget = async (id: number | null) => {
    await selectTrackTarget(id);
  };

  const selectedTrack = telemetry?.tracks.find((t) => t.is_selected);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Situation Awareness Alert Header */}
      <SituationBanner situation={telemetry?.situation} />

      {/* 2. Main Live Feed and Telemetry Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Live Surveillance Feed */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <LiveMonitor telemetry={telemetry} onSelectTarget={handleSelectTarget} />
          <TrackList
            tracks={telemetry?.tracks || []}
            selectedTargetId={selectedTrack?.track_id || null}
            onSelectTarget={handleSelectTarget}
          />
        </div>

        {/* Right Column: PTZ Gimbal, Performance HUD, and XAI */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <PTZControlPanel
            ptz={telemetry?.ptz}
            command={telemetry?.ptz_command}
            boundary={telemetry?.boundary}
          />
          <PerformanceHUD metrics={telemetry?.performance} />
          <ExplainabilityPanel explanations={telemetry?.explainability || []} />
        </div>
      </div>

      {/* 3. Spatial Digital Twin Row */}
      <div className="grid grid-cols-1 gap-4">
        <DigitalTwin
          cameraPan={telemetry?.ptz.pan_deg || 0.0}
          cameraTilt={telemetry?.ptz.tilt_deg || 0.0}
          objects={telemetry?.digital_twin.objects || []}
        />
      </div>
    </div>
  );
};
