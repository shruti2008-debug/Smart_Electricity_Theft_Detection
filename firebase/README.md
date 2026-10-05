# firebase/

This folder is reserved for **Firebase Configuration and Security Rules** of Smart Electricity Theft Detection.

## Purpose

Centralises all Firebase project configuration, database schema definitions, and security rules that govern access to cloud resources.

## Planned Contents

### Database Rules
- `database.rules.json` — Realtime Database read/write access rules
  - ESP32 / simulator can write sensor data only to designated paths
  - Dashboard (authenticated users) can read all data
  - Unauthenticated access denied

### Firestore Rules
- `firestore.rules` — Firestore collection-level access control
  - Alerts collection: readable by authenticated users, writable only by Cloud Functions
  - Users collection: readable/writable by the owning user only

### Storage Rules
- `storage.rules` — Firebase Storage access rules (for exported model files or report PDFs)

### Indexes
- `firestore.indexes.json` — Composite index definitions for efficient dashboard queries

### Schema Reference
- Documents the expected JSON structure written to Firebase by the ESP32 and simulator:

```json
/readings/{deviceId}/{timestamp}
{
  "voltage":    230.4,
  "current":    5.12,
  "power":      1180.5,
  "energy_kwh": 0.0032,
  "timestamp":  1727554800000
}
```

## Status

> 🔧 Not yet implemented. Placeholder only. No Firebase project has been created and no credentials are stored here.
