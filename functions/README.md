# functions/

This folder is reserved for **Firebase Cloud Functions** of Smart Electricity Theft Detection.

## Purpose

Cloud Functions act as the serverless backend that responds to database events, runs business logic, and bridges the ESP32 data flow with the ML anomaly detection layer and the web dashboard.

## Planned Responsibilities

- **Trigger on new sensor readings** written to Firebase by the ESP32 or simulator
- **Invoke the ML scoring endpoint** and store the resulting risk score
- **Generate and push theft alerts** to the dashboard when anomalies are detected
- **Send notifications** (email / push) to administrators on high-risk events
- **Scheduled cleanup jobs** — archive or delete old readings periodically
- **REST API endpoints** — expose data to the dashboard or external systems via HTTPS functions

## Planned Stack

- **Runtime:** Node.js (Firebase Functions v2)
- **Language:** TypeScript / JavaScript
- **Triggers:** Realtime Database `onWrite`, Firestore `onDocumentCreated`, `onSchedule`
- **Integrations:** Firebase Admin SDK, Nodemailer, Firebase Cloud Messaging (FCM)

## Planned Folder Layout

```
functions/
├── src/
│   ├── index.ts          # Entry point — exports all functions
│   ├── alerts.ts         # Theft alert generation logic
│   ├── scoring.ts        # ML scoring integration
│   └── scheduler.ts      # Scheduled maintenance jobs
├── package.json
├── tsconfig.json
└── README.md
```

## Status

> 🔧 Not yet implemented. Placeholder only.
