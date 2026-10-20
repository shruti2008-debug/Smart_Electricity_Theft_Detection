import React, { useState } from 'react'
import { writeData, updateData } from '../lib/database'
import { DB_PATHS } from '../lib/types'
import { auth } from '../lib/firebase'

interface RelayControlProps {
  deviceId: string
  relayState: 'CONNECTED' | 'DISCONNECTED'
  onStateChange?: (newState: 'CONNECTED' | 'DISCONNECTED') => void
}

export const RelayControl: React.FC<RelayControlProps> = ({
  deviceId,
  relayState,
  onStateChange,
}) => {
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [targetAction, setTargetAction] = useState<'CONNECT' | 'DISCONNECT'>('DISCONNECT')
  const [feedback, setFeedback] = useState<string | null>(null)

  const isConnected = relayState === 'CONNECTED'

  const handleOpenConfirm = (action: 'CONNECT' | 'DISCONNECT') => {
    setTargetAction(action)
    setShowConfirmModal(true)
    setFeedback(null)
  }

  const handleConfirmAction = async () => {
    setLoading(true)
    setShowConfirmModal(false)
    setFeedback(null)

    try {
      const user = auth.currentUser
      const payload = {
        deviceId,
        relayCommand: targetAction,
        requestedBy: user?.email || user?.uid || 'operator',
        requestedAt: Date.now(),
        executed: false,
      }

      // 1. Dispatch control command to /control/{deviceId}
      await writeData(DB_PATHS.control(deviceId), payload)

      // 2. Update device status to reflect command intent
      await updateData(`devices/${deviceId}`, {
        relayState: targetAction === 'CONNECT' ? 'CONNECTED' : 'DISCONNECTED',
      })

      if (onStateChange) {
        onStateChange(targetAction === 'CONNECT' ? 'CONNECTED' : 'DISCONNECTED')
      }

      setFeedback(
        `Command dispatched: Supply set to ${targetAction === 'CONNECT' ? 'RESTORED' : 'DISCONNECTED'}.`
      )
    } catch (err: unknown) {
      setFeedback(
        `Error dispatching relay command: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relay-control-card">
      <div className="relay-header">
        <div className="relay-title-wrap">
          <span className="relay-icon">🎛️</span>
          <div>
            <h3>Remote Supply Actuator (Relay Control)</h3>
            <p className="relay-subtitle">Consumer Line Disconnection & Restoration Interface</p>
          </div>
        </div>
        <div className={`relay-status-pill ${isConnected ? 'status-connected' : 'status-tripped'}`}>
          <span className="relay-status-dot" />
          {isConnected ? 'POWER CONNECTED' : 'SUPPLY CUT OFF'}
        </div>
      </div>

      <div className="relay-body">
        <div className="relay-info-box">
          <p>
            The physical relay module isolates the AC consumer mains upon confirmed theft or manual emergency command.
          </p>
          <div className="safety-warning-banner">
            ⚠️ <strong>Electrical Safety Protocol:</strong> Automatic relay disconnection based solely on automated anomaly score is inhibited. Manual operator confirmation is required prior to load switching.
          </div>
        </div>

        <div className="relay-actions">
          {isConnected ? (
            <button
              className="btn-danger btn-relay"
              onClick={() => handleOpenConfirm('DISCONNECT')}
              disabled={loading}
            >
              {loading ? 'Processing…' : '🛑 Disconnect Consumer Supply'}
            </button>
          ) : (
            <button
              className="btn-success btn-relay"
              onClick={() => handleOpenConfirm('CONNECT')}
              disabled={loading}
            >
              {loading ? 'Processing…' : '✅ Restore Consumer Supply'}
            </button>
          )}
        </div>

        {feedback && (
          <div className="relay-feedback" role="alert">
            {feedback}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="confirm-modal">
            <div className="confirm-modal-header">
              <span className="modal-warn-icon">⚠️</span>
              <h4>Confirm Relay Switching</h4>
            </div>
            <p className="confirm-modal-text">
              Are you sure you want to <strong>{targetAction}</strong> the electrical power supply for device{' '}
              <code>{deviceId}</code>?
            </p>
            <p className="confirm-subtext">
              {targetAction === 'DISCONNECT'
                ? 'This will trip the consumer line relay and immediately terminate load power.'
                : 'This will re-energize the consumer load line.'}
            </p>
            <div className="confirm-modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className={targetAction === 'DISCONNECT' ? 'btn-danger' : 'btn-success'}
                onClick={handleConfirmAction}
                disabled={loading}
              >
                Confirm {targetAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default RelayControl
