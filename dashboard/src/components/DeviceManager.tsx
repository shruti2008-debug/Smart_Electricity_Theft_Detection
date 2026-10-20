import React, { useState } from 'react'
import { DeviceMetadata } from '../lib/types'
import { updateData } from '../lib/database'
import { auth } from '../lib/firebase'

interface DeviceManagerProps {
  devices: DeviceMetadata[]
  selectedDeviceId: string
  onSelectDevice: (deviceId: string) => void
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
}) => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDeviceId, setNewDeviceId] = useState('')
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [isSim, setIsSim] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeviceId.trim() || !newDeviceName.trim()) {
      setError('Device ID and Name are required.')
      return
    }

    setLoading(true)
    setError(null)
    const cleanId = newDeviceId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')

    try {
      const user = auth.currentUser
      const payload: DeviceMetadata = {
        deviceId: cleanId,
        name: newDeviceName.trim(),
        ownerUid: user?.uid,
        status: 'online',
        relayState: 'CONNECTED',
        lastSeen: Date.now(),
        location: newLocation.trim() || 'Residential Meter',
        isSimulator: isSim,
        registeredAt: Date.now(),
      }

      await updateData(`devices/${cleanId}`, payload)
      onSelectDevice(cleanId)
      setShowAddForm(false)
      setNewDeviceId('')
      setNewDeviceName('')
      setNewLocation('')
    } catch (err: unknown) {
      setError(`Registration error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const now = Date.now()

  return (
    <div className="device-manager-card">
      <div className="device-manager-header">
        <div className="device-title-wrap">
          <span className="device-icon">📟</span>
          <div>
            <h3>Connected Meter Fleet & Devices</h3>
            <p className="device-subtitle">Manage physical meters and simulated nodes</p>
          </div>
        </div>

        <button
          className="btn-primary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Close Form' : '+ Register Device'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleRegisterDevice} className="device-add-form">
          <h4>Register New Energy Meter</h4>
          {error && <div className="form-error">{error}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Device ID</label>
              <input
                type="text"
                placeholder="e.g. METER-002 or SIM-002"
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Device Name / Label</label>
              <input
                type="text"
                placeholder="e.g. Feeder Line A"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Location / Feeder</label>
              <input
                type="text"
                placeholder="e.g. Sector 4, Substation 2"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isSim}
                  onChange={(e) => setIsSim(e.target.checked)}
                />
                Software Simulator Device
              </label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Registering…' : 'Save & Select Device'}
            </button>
          </div>
        </form>
      )}

      <div className="device-grid">
        {devices.map((device) => {
          const isSelected = device.deviceId === selectedDeviceId
          const isOnline = now - (device.lastSeen || 0) < 60000

          return (
            <div
              key={device.deviceId}
              className={`device-pill ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDevice(device.deviceId)}
            >
              <div className="device-pill-top">
                <span className={`device-status-dot ${isOnline ? 'online' : 'offline'}`} />
                <span className="device-pill-id">{device.deviceId}</span>
                <span className="device-pill-type">
                  {device.isSimulator ? 'Sim' : 'HW'}
                </span>
              </div>
              <div className="device-pill-name">{device.name}</div>
              <div className="device-pill-meta">
                <span>{device.location || 'Default Feeder'}</span>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export default DeviceManager
