export type DeviceStatus = 'online' | 'offline' | 'warning'
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

export interface SensorReading {
  deviceId: string
  timestamp: number
  voltage: number
  current: number
  power: number
  energy_kwh?: number
  power_factor?: number
  frequency?: number
  status?: ReadingStatus
  anomaly_score?: number
  risk_level?: RiskLevel
  source: 'esp32' | 'simulator'
  modelVersion?: string
}

export interface DeviceAlert {
  alertId: string
  deviceId: string
  timestamp: number
  type: AlertType
  severity: AlertSeverity
  message: string
  anomaly_score: number
  current_reading: {
    voltage: number
    current: number
    power: number
  }
  status: AlertStatus
}
