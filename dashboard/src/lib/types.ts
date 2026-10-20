/**
 * types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical TypeScript interfaces and types for Smart Electricity Theft Detection.
 * Shared across the Dashboard, Database helpers, and Cloud Functions.
 */

export type DeviceStatus = 'online' | 'offline' | 'warning'
export type RelayCommand = 'CONNECT' | 'DISCONNECT'
export type DataSource = 'esp32' | 'simulator'

export type ReadingStatus = 'NORMAL' | 'SUSPICIOUS' | 'TAMPERED' | 'FAULT'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
export type AlertType =
  | 'THEFT_SUSPECTED'
  | 'METER_BYPASS'
  | 'VOLTAGE_ANOMALY'
  | 'CURRENT_SPIKE'
  | 'SENSOR_FAULT'
  | 'COMMUNICATION_LOSS'

/**
 * Sensor reading recorded by the ESP32 or software simulator.
 */
export interface SensorReading {
  deviceId: string
  timestamp: number
  voltage: number          // in Volts (RMS)
  current: number          // in Amperes (RMS)
  power: number            // in Watts (V * I * PF)
  energy_kwh?: number      // Cumulative energy in kWh
  power_factor?: number    // 0.0 - 1.0 (defaults to ~0.95-0.98)
  frequency?: number       // in Hz (nominal 50.0 Hz)
  status?: ReadingStatus
  anomaly_score?: number   // ML score 0.0 - 100.0
  risk_level?: RiskLevel
  source: DataSource
  modelVersion?: string
}

/**
 * Device metadata and status stored in RTDB /devices/{deviceId}.
 */
export interface DeviceMetadata {
  deviceId: string
  name: string
  ownerUid?: string
  authorizedUsers?: Record<string, boolean>
  status: DeviceStatus
  relayState: 'CONNECTED' | 'DISCONNECTED'
  lastSeen: number
  location?: string
  meterNumber?: string
  isSimulator: boolean
  registeredAt: number
}

/**
 * Real-time theft/anomaly alert stored in RTDB /alerts/{deviceId}/{alertId}.
 */
export interface DeviceAlert {
  alertId: string
  deviceId: string
  timestamp: number
  type: AlertType
  severity: AlertSeverity
  message: string
  anomaly_score?: number
  current_reading?: {
    voltage: number
    current: number
    power: number
  }
  status: AlertStatus
  acknowledgedBy?: string
  acknowledgedAt?: number
  resolvedBy?: string
  resolvedAt?: number
}

/**
 * Remote relay control request stored in RTDB /control/{deviceId}.
 */
export interface RelayControlCommand {
  deviceId: string
  relayCommand: RelayCommand
  requestedBy: string
  requestedAt: number
  executed: boolean
  executedAt?: number
}

/**
 * RTDB Database Path Constants
 */
export const DB_PATHS = {
  systemTest: 'system_test',
  devices: 'devices',
  readings: (deviceId: string) => `readings/${deviceId}`,
  latestReading: (deviceId: string) => `latest_readings/${deviceId}`,
  allLatestReadings: 'latest_readings',
  alerts: (deviceId: string) => `alerts/${deviceId}`,
  allAlerts: 'alerts',
  control: (deviceId: string) => `control/${deviceId}`,
} as const
