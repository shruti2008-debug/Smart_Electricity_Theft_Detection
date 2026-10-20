# Sensor Data Simulator
**Module:** `simulator/`  
**Project:** Smart Electricity Theft Detection

The Sensor Data Simulator provides a realistic, hardware-free data generation pipeline that mirrors the telemetry produced by the physical ESP32 meter.

---

## Features

- **Realistic Physics:** Generates AC voltage ($220-240\text{V}$ RMS), active current ($0.5-25\text{A}$), active power ($P = V \cdot I \cdot \text{PF}$), grid frequency ($50\text{Hz}$), and cumulative energy ($\text{kWh}$).
- **Circadian Domestic Modeling:** Simulates realistic time-of-day load curves with morning and evening domestic peaks and random appliance cycles.
- **Theft & Anomaly Scenarios:**
  - `NORMAL`: Standard domestic consumption.
  - `METER_BYPASS`: Current drops to a trickle ($<0.3\text{A}$) simulating a physical shunt or line jumper while supply continues.
  - `OFF_PEAK_SPIKE`: Excessive industrial-scale power draw ($>20\text{A}$) during off-peak night hours.
  - `LINE_TAPPING`: Upstream line tapping causing severe voltage drop and poor power factor.
  - `SENSOR_FAULT`: Transducer hardware failure (zero voltage or implausibly high readings).
  - `VOLTAGE_SAG`: Grid brownout/undervoltage condition.
- **Safe Dry-Run Mode:** Runs completely offline without credentials or network dependencies.
- **Firebase Realtime Database Sync:** Updates `/latest_readings/{deviceId}`, `/readings/{deviceId}`, and `/devices/{deviceId}`.

---

## Windows PowerShell Quickstart

### 1. Run in Dry-Run Mode (No Cloud Setup Required)
```powershell
cd C:\Users\shrut\OneDrive\Desktop\CP\Smart-Energy-Theft-Detection\simulator
python main.py --dry-run --duration 10 --interval 2
```

### 2. Simulate Electricity Theft (Meter Bypass)
```powershell
python main.py --dry-run --scenario METER_BYPASS --duration 15 --interval 2
```

### 3. Simulate Off-Peak Spike (Unauthorized Load)
```powershell
python main.py --dry-run --scenario OFF_PEAK_SPIKE --duration 15 --interval 2
```

### 4. Push Live Telemetry to Firebase Realtime Database
```powershell
python main.py --device SIM-001 --interval 3 --auth-token "<YOUR_FIREBASE_ID_TOKEN>"
```

---

## Automated Unit Tests
To verify all simulator calculations and scenarios:
```powershell
python test_simulator.py
```
