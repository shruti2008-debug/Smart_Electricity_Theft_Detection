# AI / Machine Learning Anomaly Detection Module
**Module:** `ml/`  
**Project:** Smart Electricity Theft Detection

The AI/ML module identifies non-technical losses, meter tampering, unauthorized load spikes, and equipment anomalies from electrical smart meter time-series data.

---

## 1. Architecture & Detection Methodology

The engine utilizes a hybrid approach:
1. **Machine Learning Layer:**
   - Evaluates multi-dimensional consumption vectors: `voltage`, `current`, `power`, `power_factor`, `apparent_power`, and `hour_of_day`.
   - Normalizes feature distances to a calibrated **0.0 to 100.0 Anomaly Risk Score**.
2. **Electrical Domain Rules Layer:**
   - **Meter Bypass Detection:** Normal AC voltage ($>210\text{V}$) accompanied by negligible trickle current ($<0.28\text{A}$) flags immediate tampering.
   - **Off-Peak Night Surge:** Industrial-scale loads ($>20\text{A}$) during off-peak hours ($1\text{AM} - 5\text{AM}$) flag unauthorized industrial/commercial tapping.
   - **Line Tapping & Power Factor Distortion:** Undervoltage combined with low power factor ($<0.72$) flags unauthorized line hooks.
   - **Sensor & Transducer Faults:** Zero voltage or implausibly high current out of physical limits flags hardware failure.

### Risk Score Calibration
| Score Range | Risk Level | Status | Action |
|---|---|---|---|
| **0 – 30** | `LOW` | `NORMAL` | Normal domestic baseline. No alert generated. |
| **31 – 65** | `MEDIUM` | `SUSPICIOUS` | Minor deviation. Monitored for persistence. |
| **66 – 100** | `HIGH` | `TAMPERED` / `FAULT` | Dispatches priority alert to dashboard with cooldown. |

> **Important Caveat:** An anomaly score represents a statistical or physical deviation from nominal patterns; it is an investigative indicator, not conclusive legal proof of theft.

---

## 2. Benchmark Dataset & Evaluation Results

Trained on a 14-day synthetic benchmark dataset (4,032 samples at 5-minute intervals) with an 8.0% contamination rate of calibrated theft events.

### Evaluation Metrics (Evaluated on Unseen Test Split):
- **Accuracy:** `98.14%`
- **Precision (Anomaly):** `89.83%`
- **Recall (Anomaly):** `85.48%`
- **F1-Score (Anomaly):** `87.60%`
- **Confusion Matrix:** 739 True Negatives, 6 False Positives, 9 False Negatives, 53 True Positives

---

## 3. Windows PowerShell Commands

### Run Unit Tests
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\ml
python test_ml.py
```

### Reproduce Training & Evaluation Pipeline
```powershell
python src/train.py
```

### Run ML Scoring Service in Dry-Run Mode
```powershell
python src/service.py --dry-run
```

### Run ML Scoring Service Connected to Firebase RTDB
```powershell
python src/service.py --poll-interval 3 --auth-token "<FIREBASE_ID_TOKEN>"
```
