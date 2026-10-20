import React from 'react'
import { SensorReading } from '../lib/types'

interface LiveTelemetryProps {
  reading: SensorReading | null
  deviceId: string
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({ reading, deviceId }) => {
  if (!reading) {
    return (
      <div className="telemetry-empty">
        <span className="telemetry-empty-icon">📡</span>
        <h3>Awaiting Live Telemetry for {deviceId}</h3>
        <p>No sensor readings received yet. Start the ESP32 hardware or run the software simulator to stream live data.</p>
        <div className="simulator-tip">
          <code>python simulator/main.py --device {deviceId} --scenario NORMAL</code>
        </div>
      </div>
    )
  }

  const isLive = Date.now() - (reading.timestamp || 0) < 30000
  const isSimulated = reading.source === 'simulator'

  return (
    <div className="telemetry-container">
      <div className="telemetry-header">
        <div className="telemetry-device-info">
          <span className="device-id-badge">{reading.deviceId}</span>
          <span className={`source-badge ${isSimulated ? 'source-simulator' : 'source-hardware'}`}>
            {isSimulated ? '🖥️ Simulated Telemetry' : '🔌 ESP32 Hardware'}
          </span>
          <span className={`pulse-badge ${isLive ? 'pulse-live' : 'pulse-stale'}`}>
            <span className="pulse-dot" />
            {isLive ? 'Live Stream' : 'Stale / Offline'}
          </span>
        </div>
        <div className="telemetry-timestamp">
          Updated: {new Date(reading.timestamp).toLocaleTimeString()}
        </div>
      </div>

      <div className="telemetry-grid">
        {/* Voltage */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon">⚡</span>
            <span className="metric-label">AC Voltage</span>
          </div>
          <div className="metric-value">
            {reading.voltage.toFixed(1)} <span className="metric-unit">V</span>
          </div>
          <div className="metric-footer">
            <span>Nominal: 230.0 V</span>
            <span className={`metric-delta ${reading.voltage < 210 || reading.voltage > 250 ? 'delta-warn' : 'delta-ok'}`}>
              {reading.voltage < 210 ? 'Undervoltage' : reading.voltage > 250 ? 'Overvoltage' : 'Stable'}
            </span>
          </div>
        </div>

        {/* Current */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon">🔌</span>
            <span className="metric-label">Load Current</span>
          </div>
          <div className="metric-value">
            {reading.current.toFixed(2)} <span className="metric-unit">A</span>
          </div>
          <div className="metric-footer">
            <span>Peak Rating: 30 A</span>
            <span className={`metric-delta ${reading.current > 20 ? 'delta-warn' : 'delta-ok'}`}>
              {reading.current < 0.28 ? 'Trickle / Idle' : reading.current > 20 ? 'Heavy Load' : 'Normal Load'}
            </span>
          </div>
        </div>

        {/* Active Power */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon">💡</span>
            <span className="metric-label">Active Power</span>
          </div>
          <div className="metric-value">
            {reading.power >= 1000
              ? (reading.power / 1000).toFixed(2)
              : reading.power.toFixed(1)}
            <span className="metric-unit">{reading.power >= 1000 ? 'kW' : 'W'}</span>
          </div>
          <div className="metric-footer">
            <span>P = V × I × PF</span>
            <span className="metric-delta delta-ok">Active Consumption</span>
          </div>
        </div>

        {/* Energy (kWh) */}
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-icon">⏱️</span>
            <span className="metric-label">Cumulative Energy</span>
          </div>
          <div className="metric-value">
            {(reading.energy_kwh ?? 0).toFixed(3)} <span className="metric-unit">kWh</span>
          </div>
          <div className="metric-footer">
            <span>Integrated Meter</span>
            <span className="metric-delta delta-ok">Meter Log</span>
          </div>
        </div>
      </div>

      {/* Grid Quality Bar */}
      <div className="grid-quality-bar">
        <div className="quality-item">
          <span className="quality-label">Power Factor:</span>
          <span className="quality-val">{reading.power_factor?.toFixed(2) ?? '0.95'}</span>
        </div>
        <div className="quality-divider" />
        <div className="quality-item">
          <span className="quality-label">Grid Frequency:</span>
          <span className="quality-val">{reading.frequency?.toFixed(2) ?? '50.00'} Hz</span>
        </div>
        <div className="quality-divider" />
        <div className="quality-item">
          <span className="quality-label">Operating Status:</span>
          <span className={`status-pill status-${reading.status?.toLowerCase() ?? 'normal'}`}>
            {reading.status ?? 'NORMAL'}
          </span>
        </div>
      </div>
    </div>
  )
}
export default LiveTelemetry
