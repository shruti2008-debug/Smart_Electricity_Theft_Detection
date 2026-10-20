import React from 'react'
import { SensorReading, DeviceAlert } from '../lib/types'

interface ReportsExportProps {
  deviceId: string
  readings: SensorReading[]
  alerts: DeviceAlert[]
}

export const ReportsExport: React.FC<ReportsExportProps> = ({
  deviceId,
  readings,
  alerts,
}) => {
  const totalReadings = readings.length
  const totalEnergy = readings.length > 0 ? readings[readings.length - 1].energy_kwh ?? 0 : 0
  const avgVoltage =
    readings.length > 0
      ? readings.reduce((acc, r) => acc + (r.voltage || 0), 0) / readings.length
      : 0
  const peakCurrent =
    readings.length > 0
      ? Math.max(...readings.map((r) => r.current || 0))
      : 0
  const theftAlertsCount = alerts.filter(
    (a) => a.type === 'THEFT_SUSPECTED' || a.type === 'METER_BYPASS'
  ).length

  const handleExportCsv = () => {
    if (readings.length === 0) return

    const headers = [
      'Timestamp (ISO)',
      'Timestamp (Epoch ms)',
      'Device ID',
      'Voltage (V RMS)',
      'Current (A RMS)',
      'Active Power (W)',
      'Cumulative Energy (kWh)',
      'Power Factor',
      'Grid Frequency (Hz)',
      'Status',
      'Anomaly Score (0-100)',
      'Risk Level',
      'Data Source',
    ]

    const rows = readings.map((r) => [
      new Date(r.timestamp).toISOString(),
      r.timestamp,
      `"${r.deviceId}"`,
      r.voltage.toFixed(2),
      r.current.toFixed(2),
      r.power.toFixed(2),
      (r.energy_kwh ?? 0).toFixed(4),
      (r.power_factor ?? 0.95).toFixed(2),
      (r.frequency ?? 50.0).toFixed(2),
      `"${r.status || 'NORMAL'}"`,
      (r.anomaly_score ?? 0).toFixed(1),
      `"${r.risk_level || 'LOW'}"`,
      `"${r.source || 'simulator'}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `energy_theft_report_${deviceId}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="reports-card">
      <div className="reports-header">
        <div className="reports-title-wrap">
          <span className="reports-icon">📊</span>
          <div>
            <h3>Audit Reports & Telemetry Export</h3>
            <p className="reports-subtitle">Analytical consumption audit and incident data export</p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleExportCsv}
          disabled={readings.length === 0}
        >
          📥 Export CSV Dataset ({totalReadings} rows)
        </button>
      </div>

      <div className="reports-summary-grid">
        <div className="summary-stat-box">
          <span className="stat-label">Logged Samples</span>
          <span className="stat-val">{totalReadings.toLocaleString()}</span>
          <span className="stat-sub">Time-series intervals</span>
        </div>
        <div className="summary-stat-box">
          <span className="stat-label">Cumulative Energy</span>
          <span className="stat-val">{totalEnergy.toFixed(3)} <small>kWh</small></span>
          <span className="stat-sub">Total measured consumption</span>
        </div>
        <div className="summary-stat-box">
          <span className="stat-label">Mean Grid Voltage</span>
          <span className="stat-val">{avgVoltage.toFixed(1)} <small>V</small></span>
          <span className="stat-sub">Nominal 230V reference</span>
        </div>
        <div className="summary-stat-box">
          <span className="stat-label">Peak Inrush Current</span>
          <span className="stat-val">{peakCurrent.toFixed(2)} <small>A</small></span>
          <span className="stat-sub">Maximum observed draw</span>
        </div>
        <div className="summary-stat-box highlight-stat">
          <span className="stat-label">Confirmed Theft Flags</span>
          <span className="stat-val text-danger">{theftAlertsCount}</span>
          <span className="stat-sub">High-severity alerts</span>
        </div>
      </div>
    </div>
  )
}
export default ReportsExport
