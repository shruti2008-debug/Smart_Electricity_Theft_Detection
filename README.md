# Smart Electricity Theft Detection

An IoT and Machine Learning powered system designed to detect electricity theft, meter tampering, and grid anomalies in real time by continuously monitoring consumer-level AC current and voltage, scoring consumption patterns via an AI/ML Isolation Forest pipeline, and presenting telemetry and remote control via a cloud web dashboard.

---

## 📋 System Overview & Architecture

```
   [ Physical ESP32 Meter ]          [ Software Simulator ]
  (ZMPT101B + ACS712 + LCD)         (simulator/main.py)
              │                               │
              └───► [ Firebase Realtime DB ] ◄┘
                     (Singapore Region)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ AI / ML Scoring Engine ]       [ React Web Dashboard ]
   (Isolation Forest Model)         (Live Telemetry & Control)
```

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Web Dashboard** | React 18, TypeScript, Vite, Vanilla CSS, Firebase Modular SDK |
| **Cloud Backend** | Firebase Realtime Database (Singapore Region), Firebase Authentication, Cloud Functions |
| **Machine Learning** | Python 3, scikit-learn (Isolation Forest), pandas, numpy, joblib |
| **Telemetry Simulator** | Python 3, REST API client, circadian domestic load models |
| **Microcontroller / IoT** | ESP32 DevKit V1, ACS712 Current Sensor, ZMPT101B Voltage Sensor, 16x2 I2C LCD, 5V Relay |

---

## 📁 Repository Structure

```
Smart-Energy-Theft-Detection/
├── README.md                          # Project Master Documentation
├── firebase.json                      # Firebase configuration
├── firebase/
│   └── database.rules.json            # Secured Realtime Database Security Rules
├── dashboard/                         # React + Vite Web Dashboard
│   ├── .env.example                   # Environment configuration template
│   ├── src/lib/                       # Firebase Auth, Database helpers, Types
│   └── src/components/                # Telemetry, Gauge, SVG Chart, Alerts, Relay
├── simulator/                         # Software Telemetry Simulator
│   ├── generator.py                   # Circadian & theft scenario physics engine
│   ├── firebase_client.py             # Authenticated RTDB REST client
│   ├── main.py                        # Interactive CLI simulator
│   └── test_simulator.py              # Automated unit tests
├── ml/                                # Machine Learning Anomaly Detection
│   ├── src/detector.py                # Dual-engine Isolation Forest & domain rules
│   ├── src/dataset_generator.py       # Benchmark energy dataset generator
│   ├── src/train.py                   # Model training and evaluation pipeline
│   ├── src/service.py                 # Real-time scoring daemon & alert bridge
│   ├── models/                        # Saved model artifacts (.joblib, .pkl)
│   └── test_ml.py                     # ML pipeline automated unit tests
├── functions/                         # Firebase Cloud Functions backend
│   └── src/                           # RTDB onCreate triggers, alerts, callables
├── firmware/
│   └── esp32_theft_detector/          # ESP32 C++/Arduino firmware (.ino, config.h)
└── docs/                              # Project technical documentation
    ├── PROJECT_STATUS.md              # Implementation checklist and audit
    ├── DATA_CONTRACT.md               # Canonical telemetry schema contract
    ├── HARDWARE_SETUP.md              # Pin mapping, wiring, and electrical safety
    ├── architecture.md                # Architecture diagrams and specifications
    └── troubleshooting.md             # PERMISSION_DENIED remedies & FAQ
```

---

## 🚀 Windows PowerShell Quickstart Guide

### 1. Dashboard Startup
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\dashboard
npm run build   # Verify production build
npm run dev     # Start local development server at http://localhost:5173
```

### 2. Run the Sensor Simulator
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\simulator

# Run unit tests:
python test_simulator.py

# Run local dry-run simulation (no cloud credentials required):
python main.py --dry-run --duration 10 --interval 2

# Simulate meter bypass (theft scenario):
python main.py --dry-run --scenario METER_BYPASS --duration 15
```

### 3. Run the ML Anomaly Detection Engine
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\ml

# Run unit tests:
python test_ml.py

# Train & evaluate Isolation Forest model:
python src/train.py

# Run ML scoring daemon in dry-run mode:
python src/service.py --dry-run
```

### 4. Build Firebase Cloud Functions
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\functions
npm run build
```

---

## 🔐 Resolving Realtime Database `PERMISSION_DENIED`
1. Open [Firebase Console](https://console.firebase.google.com/) → `electricity-theft-detect-cae09`.
2. Go to **Realtime Database** → **Rules**.
3. Paste the contents of [`firebase/database.rules.json`](file:///c:/Users/shrut/OneDrive/Desktop/CP/Smart-Energy-Theft-Detection/firebase/database.rules.json) and click **Publish**.
4. In the web dashboard, use the **🛠️ RTDB Diagnostic** tool to verify connectivity.

---

## ⚠️ Electrical Safety Notice
Never connect raw AC mains voltage to an uninsulated breadboard. Perform development using the software simulator or a safe, isolated low-voltage transformer under qualified supervision.
