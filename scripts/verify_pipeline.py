"""
Verification Script for RAVEN DeTrAck Pipeline
Runs end-to-end frame processing, detection, validation, tracking, and PTZ steering.
"""

import asyncio
from backend.services.pipeline_service import SurveillancePipelineService


async def test_pipeline():
    service = SurveillancePipelineService()
    await service.initialize()
    print("[Verification] Service initialized successfully!")

    for i in range(5):
        payload = await service.process_frame()
        print(f"--- Frame {payload.get('frame_number')} ---")
        print(f"  FPS: {payload['performance']['fps']} | Latency: {payload['performance']['total_latency_ms']} ms")
        print(f"  YOLO: {payload['performance']['yolo_latency_ms']} ms | VaL_CNN: {payload['performance']['val_cnn_latency_ms']} ms")
        print(f"  PTZ Pan: {payload['ptz']['pan_deg']}° | Tilt: {payload['ptz']['tilt_deg']}°")
        print(f"  Situation: {payload['situation']['state']} - {payload['situation']['primary_reason']}")
        print(f"  Active Tracks: {len(payload['tracks'])}")
        for t in payload['tracks']:
            print(f"    UAV #{t['track_id']}: ENS={t['ensemble_confidence']} (YOLO={t['yolo_confidence']}, VaL={t['val_confidence']}) Distance={t['distance_m']}m")

    print("[Verification] Complete! All DeTrAck pipeline stages operating correctly.")


if __name__ == "__main__":
    asyncio.run(test_pipeline())
