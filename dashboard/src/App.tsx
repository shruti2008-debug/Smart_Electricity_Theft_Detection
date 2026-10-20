import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { observeAuthState, logoutUser } from './lib/auth'
import { subscribeToData } from './lib/database'
import {
  SensorReading,
  DeviceAlert,
  DeviceMetadata,
  DB_PATHS,
} from './lib/types'
import AuthPage from './components/AuthPage'
import LiveTelemetry from './components/LiveTelemetry'
import AnomalyRiskMeter from './components/AnomalyRiskMeter'
import RelayControl from './components/RelayControl'
import HistoricalChart from './components/HistoricalChart'
import AlertsFeed from './components/AlertsFeed'
import DeviceManager from './components/DeviceManager'
import ReportsExport from './components/ReportsExport'
import DiagnosticModal from './components/DiagnosticModal'
import './App.css'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
type ActiveTab = 'overview' | 'analytics' | 'alerts' | 'fleet' | 'audit'

export function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  // Fleet & Navigation State
  const [activeDeviceId, setActiveDeviceId] = useState<string>('SIM-001')
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false)

  // Realtime Data State
  const [devices, setDevices] = useState<DeviceMetadata[]>([
    {
      deviceId: 'SIM-001',
      name: 'Main Feeder Simulator',
      status: 'online',
      relayState: 'CONNECTED',
      lastSeen: Date.now(),
      isSimulator: true,
      registeredAt: Date.now(),
    },
  ])
  const [latestReading, setLatestReading] = useState<SensorReading | null>(null)
  const [historicalReadings, setHistoricalReadings] = useState<SensorReading[]>([])
  const [alerts, setAlerts] = useState<DeviceAlert[]>([])

  // 1. Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      setUser(firebaseUser)
      setAuthStatus(firebaseUser ? 'authenticated' : 'unauthenticated')
    })
    return unsubscribe
  }, [])

  // 2. Subscribe to Fleet Devices list (/devices)
  useEffect(() => {
    if (authStatus !== 'authenticated') return

    const unsubDevices = subscribeToData<Record<string, DeviceMetadata>>(
      DB_PATHS.devices,
      (data) => {
        if (data && typeof data === 'object') {
          const list = Object.values(data)
          if (list.length > 0) {
            setDevices(list)
          }
        }
      }
    )
    return () => unsubDevices()
  }, [authStatus])

  // 3. Subscribe to Latest Reading for active device (/latest_readings/{deviceId})
  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeDeviceId) return

    setLatestReading(null)
    const unsubLatest = subscribeToData<SensorReading>(
      DB_PATHS.latestReading(activeDeviceId),
      (data) => {
        if (data) {
          setLatestReading(data)
        }
      }
    )
    return () => unsubLatest()
  }, [authStatus, activeDeviceId])

  // 4. Subscribe to Historical Readings for active device (/readings/{deviceId})
  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeDeviceId) return

    const unsubHistory = subscribeToData<Record<string, SensorReading>>(
      DB_PATHS.readings(activeDeviceId),
      (data) => {
        if (data && typeof data === 'object') {
          const readingsArray = Object.values(data).sort((a, b) => a.timestamp - b.timestamp)
          setHistoricalReadings(readingsArray)
        } else {
          setHistoricalReadings([])
        }
      }
    )
    return () => unsubHistory()
  }, [authStatus, activeDeviceId])

  // 5. Subscribe to Alerts for active device (/alerts/{deviceId})
  useEffect(() => {
    if (authStatus !== 'authenticated' || !activeDeviceId) return

    const unsubAlerts = subscribeToData<Record<string, DeviceAlert>>(
      DB_PATHS.alerts(activeDeviceId),
      (data) => {
        if (data && typeof data === 'object') {
          const alertsArray = Object.values(data).sort((a, b) => b.timestamp - a.timestamp)
          setAlerts(alertsArray)
        } else {
          setAlerts([])
        }
      }
    )
    return () => unsubAlerts()
  }, [authStatus, activeDeviceId])

  const handleLogout = async () => {
    try {
      await logoutUser()
    } catch (err) {
      console.error('[App] Sign-out failed:', err)
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authStatus === 'loading') {
    return (
      <div className="auth-loading">
        <span className="auth-loading-icon" aria-hidden="true">⚡</span>
        <p>Connecting to Smart Electricity Theft Detection…</p>
      </div>
    )
  }

  // ── Unauthenticated state ──────────────────────────────────────────────────
  if (authStatus === 'unauthenticated') {
    return <AuthPage />
  }

  const currentDevice = devices.find((d) => d.deviceId === activeDeviceId)
  const relayState = currentDevice?.relayState || 'CONNECTED'
  const activeAlertCount = alerts.filter((a) => a.status === 'ACTIVE').length

  // ── Authenticated dashboard layout ─────────────────────────────────────────
  return (
    <div className="app">
      {/* ── Top Navigation Bar ── */}
      <header className="navbar">
        <div className="navbar-left">
          <div className="navbar-brand">
            <span className="navbar-icon">⚡</span>
            <span className="brand-text">Smart Electricity Theft Detection</span>
          </div>

          <div className="device-selector-wrap">
            <label htmlFor="device-select" className="sr-only">Active Meter:</label>
            <select
              id="device-select"
              className="navbar-device-select"
              value={activeDeviceId}
              onChange={(e) => setActiveDeviceId(e.target.value)}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} — {d.name} {d.isSimulator ? '(Sim)' : '(HW)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="navbar-right">
          <button
            className="navbar-btn-tool"
            onClick={() => setIsDiagnosticOpen(true)}
            title="Test Firebase RTDB connection permissions"
          >
            🛠️ RTDB Diagnostic
          </button>

          <span className="navbar-user" title={user?.email ?? ''}>
            👤 {user?.email}
          </span>

          <button className="navbar-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Subnav Tabs ── */}
      <nav className="subnav" aria-label="Dashboard sections">
        <div className="subnav-container">
          <button
            className={`subnav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Live Monitor
          </button>
          <button
            className={`subnav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Time-Series Analytics
          </button>
          <button
            className={`subnav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🚨 Theft Alerts {activeAlertCount > 0 && <span className="tab-badge">{activeAlertCount}</span>}
          </button>
          <button
            className={`subnav-tab ${activeTab === 'fleet' ? 'active' : ''}`}
            onClick={() => setActiveTab('fleet')}
          >
            📟 Meter Fleet ({devices.length})
          </button>
          <button
            className={`subnav-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📑 Audit & Reports
          </button>
        </div>
      </nav>

      {/* ── Main Viewports ── */}
      <main className="main-content">
        {activeTab === 'overview' && (
          <div className="dashboard-view-stack">
            {/* Live Telemetry Grid */}
            <LiveTelemetry
              reading={latestReading}
              deviceId={activeDeviceId}
            />

            {/* Split Row: Anomaly Meter + Relay Actuator */}
            <div className="dashboard-split-row">
              <AnomalyRiskMeter reading={latestReading} />
              <RelayControl
                deviceId={activeDeviceId}
                relayState={relayState}
                onStateChange={(next) => {
                  setDevices((prev) =>
                    prev.map((d) => (d.deviceId === activeDeviceId ? { ...d, relayState: next } : d))
                  )
                }}
              />
            </div>

            {/* Recent Timeline Preview */}
            <HistoricalChart
              readings={historicalReadings}
              deviceId={activeDeviceId}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="dashboard-view-stack">
            <HistoricalChart
              readings={historicalReadings}
              deviceId={activeDeviceId}
            />
            <LiveTelemetry
              reading={latestReading}
              deviceId={activeDeviceId}
            />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="dashboard-view-stack">
            <AlertsFeed
              alerts={alerts}
              deviceId={activeDeviceId}
            />
            <RelayControl
              deviceId={activeDeviceId}
              relayState={relayState}
            />
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="dashboard-view-stack">
            <DeviceManager
              devices={devices}
              selectedDeviceId={activeDeviceId}
              onSelectDevice={(id) => {
                setActiveDeviceId(id)
                setActiveTab('overview')
              }}
            />
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="dashboard-view-stack">
            <ReportsExport
              deviceId={activeDeviceId}
              readings={historicalReadings}
              alerts={alerts}
            />
          </div>
        )}
      </main>

      {/* ── Diagnostic Modal ── */}
      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />

      {/* ── Footer ── */}
      <footer className="footer">
        <div>Smart Electricity Theft Detection &nbsp;·&nbsp; IoT & Machine Learning Powered Grid Protection</div>
        <div className="footer-links">
          <span>Project ID: electricity-theft-detect-cae09</span>
          <span>Region: asia-southeast1 (Singapore)</span>
        </div>
      </footer>
    </div>
  )
}

export default App
