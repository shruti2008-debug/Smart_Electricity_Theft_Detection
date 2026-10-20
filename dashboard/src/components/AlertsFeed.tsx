import React, { useState } from 'react'
import { DeviceAlert, AlertSeverity, AlertStatus } from '../lib/types'
import { updateData } from '../lib/database'
import { auth } from '../lib/firebase'

interface AlertsFeedProps {
  alerts: DeviceAlert[]
  deviceId: string
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts, deviceId }) => {
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL')
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'ALL'>('ALL')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) return false
    if (filterStatus !== 'ALL' && alert.status !== filterStatus) return false
    return true
  }).sort((a, b) => b.timestamp - a.timestamp)

  const handleUpdateStatus = async (alert: DeviceAlert, nextStatus: AlertStatus) => {
    setUpdatingId(alert.alertId)
    try {
      const user = auth.currentUser
      const updates: Partial<DeviceAlert> = {
        status: nextStatus,
      }
      if (nextStatus === 'ACKNOWLEDGED') {
        updates.acknowledgedBy = user?.email || user?.uid || 'operator'
        updates.acknowledgedAt = Date.now()
      } else if (nextStatus === 'RESOLVED') {
        updates.resolvedBy = user?.email || user?.uid || 'operator'
        updates.resolvedAt = Date.now()
      }

      await updateData(`alerts/${alert.deviceId}/${alert.alertId}`, updates)
    } catch (err) {
      console.error('Failed to update alert:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length

  return (
    <div className="alerts-card">
      <div className="alerts-header">
        <div className="alerts-title-wrap">
          <span className="alerts-icon">🚨</span>
          <div>
            <h3>Theft & Anomaly Alert Feed</h3>
            <p className="alerts-subtitle">
              {activeCount > 0 ? `${activeCount} Unresolved Alerts Requiring Action` : 'All alerts acknowledged or resolved'}
            </p>
          </div>
        </div>

        <div className="alerts-filters">
          <select
            className="filter-select"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'ALL')}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="INFO">Info Only</option>
          </select>

          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as AlertStatus | 'ALL')}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {filteredAlerts.length === 0 ? (
        <div className="alerts-empty">
          <span>🛡️</span>
          <p>No theft or hardware alerts logged for device {deviceId}. System functioning nominally.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.alertId}
              className={`alert-item severity-${alert.severity.toLowerCase()} status-${alert.status.toLowerCase()}`}
            >
              <div className="alert-item-header">
                <div className="alert-badge-group">
                  <span className={`alert-badge severity-badge-${alert.severity.toLowerCase()}`}>
                    {alert.severity}
                  </span>
                  <span className="alert-type-badge">{alert.type.replace('_', ' ')}</span>
                  <span className={`status-badge-inline status-${alert.status.toLowerCase()}`}>
                    {alert.status}
                  </span>
                </div>
                <span className="alert-time">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>

              <p className="alert-message">{alert.message}</p>

              {alert.current_reading && (
                <div className="alert-reading-snapshot">
                  <span>Snapshot:</span>
                  <span>{alert.current_reading.voltage.toFixed(1)} V</span>
                  <span>{alert.current_reading.current.toFixed(2)} A</span>
                  <span>{alert.current_reading.power.toFixed(1)} W</span>
                  {alert.anomaly_score && (
                    <span className="alert-score-tag">Risk Score: {alert.anomaly_score.toFixed(0)}/100</span>
                  )}
                </div>
              )}

              <div className="alert-actions">
                {alert.status === 'ACTIVE' && (
                  <button
                    className="btn-alert-action btn-ack"
                    onClick={() => handleUpdateStatus(alert, 'ACKNOWLEDGED')}
                    disabled={updatingId === alert.alertId}
                  >
                    Mark Acknowledged
                  </button>
                )}
                {alert.status !== 'RESOLVED' && (
                  <button
                    className="btn-alert-action btn-resolve"
                    onClick={() => handleUpdateStatus(alert, 'RESOLVED')}
                    disabled={updatingId === alert.alertId}
                  >
                    Mark Resolved
                  </button>
                )}
                {alert.status === 'RESOLVED' && (
                  <span className="resolved-tag">
                    ✓ Resolved {alert.resolvedBy ? `by ${alert.resolvedBy}` : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
export default AlertsFeed
