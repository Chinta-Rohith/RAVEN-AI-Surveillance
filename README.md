# RAVEN: Real-time Agentic Vision for UAV Navigation
## Research Prototype based on DeTrAck (*IEEE Access*, 2025)

---

> **ACADEMIC RESEARCH & CITATION NOTICE**  
> This system reproduces and extends the surveillance pipeline presented in:  
> **"DeTrAck: UAV Detection and Tracking Using Neural Networks Ensemble on Surveillance Systems"**  
> *Trandafir-Liviu Serghei and Dan Popescu* — Published in *IEEE Access*, December 2025.  
>  
> **Scope & Ethics Disclaimer**: RAVEN is developed strictly as an academic research prototype for visual surveillance, situational awareness, and computer vision experimentation. It contains **no offensive kinetic vectors, targeting fire-control loops, weapon integrations, or lethal payloads**.

---

## 1. Abstract
The proliferation of small, low-altitude Unmanned Aerial Vehicles (UAVs) introduces significant security vulnerabilities in critical infrastructure, including airports, border checkpoints, and industrial complexes. Traditional single-stage object detectors often suffer from elevated false-positive rates due to avian activity, cloud clutter, and distant ground features. RAVEN implements the authentic **DeTrAck** ensemble architecture—combining a primary **YOLO11s** candidate detector, an in-loop **VaL_CNN** validation network ($64 \times 64$ px receptive field), an alpha-weighted decision ensemble ($\alpha = 0.70$), and **DeepSORT** multi-target tracking with **PTZ/ONVIF** automated closed-loop camera recentering. RAVEN further introduces modular academic research extensions, including monocular relative-distance estimation, rule-based situation assessment, explainable AI (XAI with Grad-CAM), and a 2D/3D digital-twin spatial visualization.

---

## 2. Problem Statement & Motivation
Detecting micro and small-scale UAVs presents severe computer vision challenges:
* **Extreme Scale Variation**: UAVs at ranges beyond 100 meters occupy fewer than $0.04\%$ of the image area ($1:2500$ pixel ratio).
* **High False Positive Rates**: Birds, moving foliage, specular reflections, and distant airborne debris trigger false alarms in standalone detectors.
* **Camera Field-of-View Limitations**: Fixed surveillance cameras lose track as dynamic UAVs rapidly maneuver across boundaries.
* **Computational Constraints**: Embedded surveillance systems require near real-time throughput without requiring data-center server racks.

---

## 3. Research Objectives
1. **Faithful Reproduction**: Preserve the exact DeTrAck sequential methodology:  
   $$\text{Camera / Video / RTSP} \longrightarrow \text{YOLO11s} \longrightarrow \text{VaL\_CNN} \longrightarrow \text{Ensemble} \longrightarrow \text{DeepSORT} \longrightarrow \text{PTZ / ONVIF}$$
2. **False-Alarm Reduction**: Demonstrate how secondary CNN validation suppresses background clutter prior to tracker assignment.
3. **Automated PTZ Centering**: Keep tracked UAV targets inside the field of view using a $10\%$ boundary trigger margin and proportional control.
4. **Explainability & Transparency**: Provide explicit confidence breakdowns, natural-language audit rationale, and Grad-CAM feature heatmaps.
5. **Hardware Agnosticism**: Enable zero-hardware academic evaluation using high-fidelity **Simulation Mode** and synthetic procedural video streams.

---

## 4. DeTrAck Core Architecture vs. RAVEN Extensions

| Architecture Component | DeTrAck Paper Foundation | RAVEN Extension | Status |
| :--- | :--- | :--- | :--- |
| **Primary Detector** | YOLO11s candidate bounding-box generator | Modular detector with configurable conf/IoU | **Implemented** |
| **Validation CNN** | 5-layer CNN with 2 dropout layers ($64 \times 64$ px) | Full PyTorch architecture + training pipeline | **Implemented** |
| **Ensemble Engine** | $S_{Ens} = \alpha \cdot S_{YOLO} + (1 - \alpha) \cdot S_{VaL}$ ($\alpha=0.7$) | Interactive alpha slider & real-time re-weighting | **Implemented** |
| **Object Tracker** | DeepSORT with Kalman Filter & cosine distance | Multi-track matrix with ID lock and trails | **Implemented** |
| **PTZ Trigger** | $10\%$ frame boundary margin recentering | Dual-tier warning ($15\%$ approach, $10\%$ trigger) | **Implemented** |
| **PTZ Control Law** | Proportional control ($v_{pan} \propto dx$, $v_{tilt} \propto dy$) | Clamped proportional controller with deadband | **Implemented** |
| **Camera Interface** | ONVIF SOAP protocol integration | Dual-mode: Hardware ONVIF + Virtual Simulator | **Implemented** |
| **Video Streams** | RTSP / Fixed camera feeds | Webcams, MP4 uploads, RTSP, and Synthetic Demo | **Implemented** |
| **IR / Thermal Support** | RGB & Thermal Infrared surveillance | Simulated White-Hot IR pipeline with CLAHE | **Implemented** |
| **Distance Estimation** | *Not in original paper* | Monocular pinhole geometry: $D = \frac{F \cdot W_{real}}{W_{pixel}}$ | **RAVEN Extension** |
| **Situation Analysis** | *Not in original paper* | Rule-based engine (geofence intrusion, loitering) | **RAVEN Extension** |
| **Explainable AI (XAI)**| *Not in original paper* | Grad-CAM activation heatmaps & audit cards | **RAVEN Extension** |
| **Digital Twin** | *Not in original paper* | 2D Tactical Polar Radar & Spatial coordinates | **RAVEN Extension** |
| **Ablation Testbed** | Empirical ablation analysis | Automated benchmark comparing Configs A to E | **RAVEN Extension** |

---

## 5. System Workflow

```
               ┌──────────────────────────────────────────────────┐
               │   Video Source (Synthetic / File / RTSP / Cam)   │
               └────────────────────────┬─────────────────────────┘
                                        │ (RGB / Simulated IR)
                                        ▼
               ┌──────────────────────────────────────────────────┐
               │          Primary Detector: YOLO11s               │
               └────────────────────────┬─────────────────────────┘
                                        │ Candidate Bounding Boxes [x1,y1,x2,y2]
                                        ▼
               ┌──────────────────────────────────────────────────┐
               │      VaL_CNN Validator (64x64 ROI Patches)       │
               └────────────────────────┬─────────────────────────┘
                                        │ Validation Probability S_VaL
                                        ▼
               ┌──────────────────────────────────────────────────┐
               │       Weighted Ensemble: S_Ens = 0.7*Y + 0.3*V   │
               └────────────────────────┬─────────────────────────┘
                                        │ Validated Detections (S_Ens >= 0.50)
                                        ▼
               ┌──────────────────────────────────────────────────┐
               │       DeepSORT Multi-Target Object Tracker       │
               └────────────────────────┬─────────────────────────┘
                                        │ Persistent Track IDs & Velocities
               ┌────────────────────────┼─────────────────────────┐
               │                        │                         │
               ▼                        ▼                         ▼
      ┌─────────────────┐      ┌─────────────────┐       ┌─────────────────┐
      │  PTZ Boundary   │      │ Relative Range  │       │ Situation Engine│
      │  (10% Margin)   │      │ D = (F*W)/W_px  │       │ Alerts & Audit  │
      └────────┬────────┘      └────────┬────────┘       └────────┬────────┘
               │                        │                         │
               ▼                        ▼                         ▼
      ┌─────────────────┐      ┌─────────────────┐       ┌─────────────────┐
      │ PTZ Simulator / │      │  Digital Twin   │       │ Explainability  │
      │ ONVIF Camera    │      │ 2D Polar Radar  │       │ Grad-CAM & Log  │
      └────────┬────────┘      └────────┬────────┘       └────────┬────────┘
               │                        │                         │
               └────────────────────────┴─────────────────────────┘
                                        │ Real-Time WebSocket Telemetry
                                        ▼
               ┌──────────────────────────────────────────────────┐
               │         RAVEN Tactical Research Dashboard        │
               └──────────────────────────────────────────────────┘
```

---

## 6. Installation & Quick Start

### Prerequisites
* **Python**: `3.13` (64-bit) recommended for native PyTorch & OpenCV binary wheel compatibility.
* **Node.js**: `v18+` (Node `v24` and npm `11+` verified).

### 1. Backend Setup
```powershell
# From the project root directory:
py -3.13 -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run build   # Verifies clean compilation
npm run dev     # Starts Vite development server at http://localhost:5173
```

### 3. Launching the Complete System
**Terminal 1 (Backend API & Vision Loop):**
```powershell
$env:PYTHONPATH="."
.\backend\venv\Scripts\python.exe backend/main.py
```
*Backend runs at `http://localhost:8000` with WebSocket at `ws://localhost:8000/ws/stream`.*

**Terminal 2 (Frontend Interface):**
```powershell
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 7. Configuration (.env)
System parameters are managed through `.env` or `backend/config.py`:

```ini
# Inference Runtime
DEVICE=cpu

# Detector & Validator Models
YOLO_MODEL_PATH=models/yolo11s.pt
YOLO_CONFIDENCE_THRESHOLD=0.20
VAL_CNN_MODEL_PATH=models/val_cnn.pt
VAL_CNN_CONFIDENCE_THRESHOLD=0.50

# Ensemble Weighting (DeTrAck Formulation)
ENSEMBLE_ALPHA=0.70
ENSEMBLE_ACCEPT_THRESHOLD=0.50

# PTZ Gimbal & Boundary
PTZ_BOUNDARY_RATIO=0.10
PTZ_MODE=SIMULATION
KP_PAN=0.40
KP_TILT=0.40

# ONVIF Camera Hardware (Leave blank for Simulation Mode)
ONVIF_HOST=
ONVIF_PORT=80
ONVIF_USERNAME=
ONVIF_PASSWORD=
```

---

## 8. Model Training Pipelines

### 1. Training VaL_CNN ($64 \times 64$ Binary Patch Classifier)
Structure your dataset:
```
datasets/val_cnn/
├── train/ (drone/, background/)
├── val/   (drone/, background/)
└── test/  (drone/, background/)
```
Run training:
```powershell
$env:PYTHONPATH="."
.\backend\venv\Scripts\python.exe training/val_cnn/train.py
```
*Evaluates using Adam ($lr=10^{-3}$), early stopping patience 5, saving best weights to `models/val_cnn.pt`.*

### 2. Fine-Tuning YOLO11s on UAVs
Structure dataset according to YOLO standard in `datasets/yolo_uav/`. Run:
```powershell
$env:PYTHONPATH="."
.\backend\venv\Scripts\python.exe training/yolo/train.py --epochs 50 --batch 16
```

---

## 9. Experimental Ablation Study (Configurations A to E)
The dashboard provides a dedicated **Experiments** page executing empirical benchmarks across:
* **Config A**: YOLO11 only (baseline detection throughput)
* **Config B**: YOLO11 + VaL_CNN (false positive reduction)
* **Config C**: YOLO11 + DeepSORT (tracking continuity baseline)
* **Config D**: YOLO11 + VaL_CNN + DeepSORT (complete DeTrAck core)
* **Config E**: YOLO11 + VaL_CNN + DeepSORT + PTZ (closed-loop recentering)

All metrics are measured directly on the host runtime and can be exported as JSON or CSV.

---

## 10. Research Integrity Statement
* **No Synthetic Metrics**: Detection rates, mAP, and FPS are never hard-coded or fabricated. Unrun experiments explicitly state *"No experimental result available."*
* **Weight Transparency**: If custom fine-tuned weights are not present on disk, the system explicitly reports:
  `"VaL_CNN weights not found. Please train the validation model."`
* **Citation Integrity**: All results generated by this codebase are labeled as **"RAVEN reproduction result"** and never falsely presented as the original published DeTrAck results.
