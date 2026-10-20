import { SensorReading, ReadingStatus, RiskLevel } from './types'

export interface EvaluationResult {
  anomaly_score: number
  risk_level: RiskLevel
  status: ReadingStatus
  explanation: string
  shouldAlert: boolean
}

/**
 * Cloud evaluation engine for incoming electrical sensor telemetry.
 * Computes anomaly risk using physical domain limits and statistical deviations.
 */
export function evaluateReading(reading: SensorReading): EvaluationResult {
  const voltage = Number(reading.voltage) || 0
  const current = Number(reading.current) || 0
  const pf = Number(reading.power_factor) || 0.95
  const timestamp = Number(reading.timestamp) || Date.now()
  const date = new Date(timestamp)
  const hour = date.getHours()

  // 1. Hardware and physics boundary checks
  if (voltage <= 5.0 || voltage >= 320.0 || current >= 45.0) {
    return {
      anomaly_score: 98.0,
      risk_level: 'HIGH',
      status: 'FAULT',
      explanation: 'Sensors reading outside electrical safety envelope (Hardware Fault).',
      shouldAlert: true,
    }
  }

  // 2. Meter bypass check: low current with nominal voltage
  if (current < 0.28 && voltage >= 210.0) {
    return {
      anomaly_score: 88.0,
      risk_level: 'HIGH',
      status: 'TAMPERED',
      explanation: 'Near-zero current draw with nominal grid voltage (Suspected Meter Bypass).',
      shouldAlert: true,
    }
  }

  // 3. Line tapping: severe undervoltage with distorted power factor
  if (voltage < 205.0 && pf < 0.72) {
    return {
      anomaly_score: 82.0,
      risk_level: 'HIGH',
      status: 'TAMPERED',
      explanation: 'Line voltage drop with severe power factor distortion (Suspected Line Tapping).',
      shouldAlert: true,
    }
  }

  // 4. Off-peak commercial spike (1 AM to 5 AM)
  if (hour >= 1 && hour <= 5 && current >= 20.0) {
    return {
      anomaly_score: 78.0,
      risk_level: 'HIGH',
      status: 'SUSPICIOUS',
      explanation: 'Excessive power draw during late-night off-peak hours.',
      shouldAlert: true,
    }
  }

  // 5. Mild deviation (voltage fluctuations or poor PF)
  if (pf < 0.80 || voltage < 215.0 || voltage > 250.0) {
    return {
      anomaly_score: 42.0,
      risk_level: 'MEDIUM',
      status: 'SUSPICIOUS',
      explanation: 'Unusual grid voltage or phase factor variance.',
      shouldAlert: false,
    }
  }

  // Nominal domestic baseline
  return {
    anomaly_score: 12.0,
    risk_level: 'LOW',
    status: 'NORMAL',
    explanation: 'Readings within normal domestic threshold.',
    shouldAlert: false,
  }
}
