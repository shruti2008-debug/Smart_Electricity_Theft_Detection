import React, { useState } from 'react'
import { SensorReading } from '../lib/types'

interface HistoricalChartProps {
  readings: SensorReading[]
  deviceId: string
}

type MetricType = 'power' | 'voltage' | 'current'
type TimeRange = '1h' | '24h' | 'all'

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ readings, deviceId }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('power')
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1h')

  // Filter by time range
  const now = Date.now()
  const filteredReadings = readings.filter((r) => {
    if (!r.timestamp) return false
    if (selectedRange === '1h') return now - r.timestamp <= 60 * 60 * 1000
    if (selectedRange === '24h') return now - r.timestamp <= 24 * 60 * 60 * 1000
    return true
  }).sort((a, b) => a.timestamp - b.timestamp)

  const getMetricConfig = (metric: MetricType) => {
    switch (metric) {
      case 'voltage':
        return { label: 'Voltage', unit: 'V', color: '#38bdf8', minDefault: 200, maxDefault: 260 }
      case 'current':
        return { label: 'Current', unit: 'A', color: '#f59e0b', minDefault: 0, maxDefault: 25 }
      case 'power':
      default:
        return { label: 'Active Power', unit: 'W', color: '#10b981', minDefault: 0, maxDefault: 3000 }
    }
  }

  const config = getMetricConfig(selectedMetric)

  if (filteredReadings.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-header">
          <h3>Historical Energy Consumption & Anomaly Timeline</h3>
        </div>
        <div className="chart-empty">
          <span>📈</span>
          <p>No historical records found for device <code>{deviceId}</code> in selected window ({selectedRange}).</p>
        </div>
      </div>
    )
  }

  // Calculate SVG chart coordinates
  const values = filteredReadings.map((r) => Number(r[selectedMetric]) || 0)
  const minVal = Math.min(...values, config.minDefault)
  const maxVal = Math.max(...values, config.maxDefault)
  const rangeVal = maxVal - minVal || 1

  const width = 800
  const height = 240
  const padding = 40

  const points = filteredReadings.map((r, idx) => {
    const x = padding + (idx / Math.max(1, filteredReadings.length - 1)) * (width - 2 * padding)
    const val = Number(r[selectedMetric]) || 0
    const y = height - padding - ((val - minVal) / rangeVal) * (height - 2 * padding)
    return { x, y, val, time: new Date(r.timestamp).toLocaleTimeString() }
  })

  const pathD = points.length > 0
    ? `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`
    : ''

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(height - padding).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)} Z`
    : ''

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Consumption & Anomaly History</h3>
          <p className="chart-subtitle">Telemetry trends for {deviceId} ({filteredReadings.length} data points)</p>
        </div>
        <div className="chart-controls">
          <div className="btn-group">
            <button
              className={`btn-toggle ${selectedMetric === 'power' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('power')}
            >
              Power (W)
            </button>
            <button
              className={`btn-toggle ${selectedMetric === 'voltage' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('voltage')}
            >
              Voltage (V)
            </button>
            <button
              className={`btn-toggle ${selectedMetric === 'current' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('current')}
            >
              Current (A)
            </button>
          </div>

          <div className="btn-group">
            <button
              className={`btn-toggle ${selectedRange === '1h' ? 'active' : ''}`}
              onClick={() => setSelectedRange('1h')}
            >
              1 Hour
            </button>
            <button
              className={`btn-toggle ${selectedRange === '24h' ? 'active' : ''}`}
              onClick={() => setSelectedRange('24h')}
            >
              24 Hours
            </button>
            <button
              className={`btn-toggle ${selectedRange === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedRange('all')}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={config.color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="var(--border)" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" />

          {/* Y-axis labels */}
          <text x={padding - 8} y={padding + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">
            {maxVal.toFixed(0)} {config.unit}
          </text>
          <text x={padding - 8} y={height / 2 + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">
            {((maxVal + minVal) / 2).toFixed(0)} {config.unit}
          </text>
          <text x={padding - 8} y={height - padding + 4} fill="var(--text-muted)" fontSize="11" textAnchor="end">
            {minVal.toFixed(0)} {config.unit}
          </text>

          {/* Area fill & Path line */}
          <path d={areaD} fill="url(#chartGradient)" />
          <path d={pathD} fill="none" stroke={config.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill={config.color}
              stroke="var(--bg-card)"
              strokeWidth="1.5"
            >
              <title>{`${p.val} ${config.unit} at ${p.time}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="chart-footer">
        <span>Oldest: {new Date(filteredReadings[0].timestamp).toLocaleTimeString()}</span>
        <span>Latest: {new Date(filteredReadings[filteredReadings.length - 1].timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}
export default HistoricalChart
