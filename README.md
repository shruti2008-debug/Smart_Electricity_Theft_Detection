# Smart Electricity Theft Detection

A smart IoT-based system designed to detect electricity theft in real time by monitoring current and voltage consumption at the consumer level, identifying anomalies using AI/ML, and reporting suspicious activity through a cloud-connected web dashboard.

---

## 📋 Project Description

Electricity theft is a major challenge for power distribution companies, leading to significant revenue losses and grid instability. This system aims to address that problem by deploying a hardware unit at the consumer's meter that continuously monitors energy consumption, detects unusual patterns, and flags potential theft events automatically.

The system combines embedded hardware, cloud connectivity, and machine learning to provide an end-to-end solution for smart electricity theft detection and monitoring.

---

## 🛠️ Planned Technologies

### Hardware Components

| Component | Purpose |
|---|---|
| **ESP32** | Microcontroller — handles data acquisition, processing, and cloud communication |
| **ACS712 Current Sensor** | Measures the current flowing through the electrical line |
| **ZMPT101B Voltage Sensor** | Measures the AC voltage of the electrical line |
| **Energy Meter** | Tracks cumulative energy consumption (kWh) |
| **16x2 LCD Display** | Displays real-time readings locally on the device |
| **Relay Module** | Enables remote disconnection of supply upon theft detection |

### Software & Cloud

| Technology | Purpose |
|---|---|
| **Firebase Cloud** | Real-time database and backend for storing sensor data and alerts |
| **AI/ML Anomaly Detection** | Identifies abnormal consumption patterns indicative of electricity theft |
| **Web Dashboard** | Visualizes energy data, alerts, and system status for operators |

---

## 🚀 Project Status

> 🔧 **In Development** — Initial setup phase.

---

## 📁 Project Structure

```
Smart-Energy-Theft-Detection/
├── README.md
├── firmware/          # ESP32 firmware code
├── ml/                # AI/ML anomaly detection models
├── dashboard/         # Web dashboard frontend
└── docs/              # Documentation and diagrams
```

---

## 📌 Features (Planned)

- Real-time current and voltage monitoring via ESP32
- Local display of readings on 16x2 LCD
- Cloud sync of energy data to Firebase
- AI/ML-based anomaly detection for theft identification
- Automated relay-based supply cutoff on confirmed theft
- Web dashboard for remote monitoring and alert management

---

## 👤 Author

Smart Electricity Theft Detection Team  
Project started: September 2026
