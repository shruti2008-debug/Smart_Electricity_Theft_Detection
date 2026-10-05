# simulator/

This folder is reserved for the **ESP32 Software Simulator** of Smart Electricity Theft Detection.

## Purpose

The simulator generates synthetic electrical readings (voltage, current, power, energy) and pushes them to Firebase through the **exact same data flow** used by the real ESP32 hardware. This allows the full system — dashboard, Cloud Functions, and ML module — to be developed and tested without physical hardware.

## Planned Behaviour

- Generate realistic AC voltage (~220–240 V RMS) and current readings
- Simulate normal consumption profiles based on time-of-day patterns
- Inject configurable **theft scenarios**:
  - Sudden current drop (meter bypass)
  - Abnormal off-peak consumption spike
  - Phase imbalance events
- Push readings to Firebase Realtime Database at a configurable interval (e.g., every 5 seconds)
- Mirror the same JSON data schema used by the ESP32 firmware

## Planned Stack

- **Language:** Python 3
- **Libraries:** `firebase-admin`, `numpy`, `schedule` or `asyncio`
- **Output Target:** Firebase Realtime Database (same path as firmware)

## Planned Folder Layout

```
simulator/
├── config.py           # Simulation parameters (interval, theft scenarios)
├── generator.py        # Synthetic reading generation logic
├── firebase_client.py  # Firebase push logic (mirrors firmware behaviour)
├── main.py             # Entry point
└── README.md
```

## Status

> 🔧 Not yet implemented. Placeholder only.
