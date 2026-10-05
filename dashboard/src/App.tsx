import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { observeAuthState, logoutUser } from './lib/auth'
import AuthPage from './components/AuthPage'
import './App.css'

// ── Module status data ────────────────────────────────────────────────────────
const MODULE_STATUS = [
  {
    icon: '🔌',
    title: 'ESP32 Firmware',
    value: 'ACS712 · ZMPT101B · LCD · Relay · Wi-Fi',
    badge: 'planned',
    badgeLabel: 'Planned',
  },
  {
    icon: '☁️',
    title: 'Firebase Backend',
    value: 'Auth ✓ · Realtime DB · Cloud Functions',
    badge: 'partial',
    badgeLabel: 'Auth Active',
  },
  {
    icon: '🤖',
    title: 'AI / ML Engine',
    value: 'Anomaly Detection · Risk Scoring',
    badge: 'planned',
    badgeLabel: 'Planned',
  },
  {
    icon: '📊',
    title: 'Web Dashboard',
    value: 'React · TypeScript · Vite',
    badge: 'ready',
    badgeLabel: 'Initialized',
  },
  {
    icon: '🖥️',
    title: 'Data Simulator',
    value: 'Synthetic readings → Firebase',
    badge: 'planned',
    badgeLabel: 'Planned',
  },
  {
    icon: '⚡',
    title: 'Cloud Functions',
    value: 'Trigger · Alert · Schedule',
    badge: 'planned',
    badgeLabel: 'Planned',
  },
]

// ── Auth state type ───────────────────────────────────────────────────────────
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

// ── App component ─────────────────────────────────────────────────────────────
function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [user, setUser]             = useState<User | null>(null)

  // Subscribe to Firebase auth state — fires on load/refresh and on sign-in/out
  useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      setUser(firebaseUser)
      setAuthStatus(firebaseUser ? 'authenticated' : 'unauthenticated')
    })
    return unsubscribe // cleanup: unsubscribes when App unmounts
  }, [])

  async function handleLogout() {
    try {
      await logoutUser()
    } catch (err) {
      console.error('[App] Sign-out failed:', err)
    }
  }

  // ── Loading splash — shown while Firebase resolves auth state ───────────────
  if (authStatus === 'loading') {
    return (
      <div className="auth-loading">
        <span className="auth-loading-icon" aria-hidden="true">⚡</span>
        <p>Initialising…</p>
      </div>
    )
  }

  // ── Unauthenticated — show Login / Register page ────────────────────────────
  if (authStatus === 'unauthenticated') {
    return <AuthPage />
  }

  // ── Authenticated — show full dashboard ────────────────────────────────────
  return (
    <div className="app">

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-icon">⚡</span>
          Smart Electricity Theft Detection
        </div>
        <div className="navbar-right">
          <span className="navbar-user" title={user?.email ?? ''}>
            {user?.email}
          </span>
          <button className="navbar-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <span className="hero-icon">⚡</span>
        <h1 className="hero-title">
          Smart <span>Electricity Theft</span> Detection
        </h1>
        <p className="hero-subtitle">
          IoT-Based Electrical Monitoring and Theft / Anomaly Detection
        </p>
      </section>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* Status Card */}
        <p className="section-label">System Status</p>
        <div className="status-card">
          <div className="status-dot-wrap">
            <div className="status-dot" />
          </div>
          <div className="status-text">
            <h3>Dashboard Operational</h3>
            <p>Authenticated as {user?.email}</p>
          </div>
        </div>

        {/* Module Overview */}
        <p className="section-label">Module Overview</p>
        <div className="info-grid">
          {MODULE_STATUS.map((mod) => (
            <div className="info-card" key={mod.title}>
              <div className="info-card-icon">{mod.icon}</div>
              <div className="info-card-title">{mod.title}</div>
              <div className="info-card-value">{mod.value}</div>
              <span className={`badge badge-${mod.badge}`}>{mod.badgeLabel}</span>
            </div>
          ))}
        </div>

        {/* Current Stage Banner */}
        <div className="stage-banner">
          <span>🔐</span>
          <span>
            <strong>Phase 5 complete —</strong> Firebase Authentication (Email / Password)
            is active. Next: Realtime Database integration.
          </span>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        Smart Electricity Theft Detection &nbsp;·&nbsp; Phase 5 — Authentication
      </footer>
    </div>
  )
}

export default App
