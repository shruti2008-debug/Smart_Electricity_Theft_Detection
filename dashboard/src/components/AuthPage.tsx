import { useState, FormEvent } from 'react'
import { registerUser, loginUser, getAuthErrorMessage } from '../lib/auth'
import './AuthPage.css'

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = 'login' | 'register'

interface FirebaseAuthError {
  code?: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await loginUser(email, password)
      } else {
        await registerUser(email, password)
      }
      // On success, onAuthStateChanged in App.tsx will redirect to dashboard.
    } catch (err: unknown) {
      const code = (err as FirebaseAuthError).code ?? ''
      setError(getAuthErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Header ── */}
        <div className="auth-header">
          <span className="auth-icon" aria-hidden="true">⚡</span>
          <h1 className="auth-title">Smart Electricity Theft Detection</h1>
          <p className="auth-subtitle">Secure operator access</p>
        </div>

        {/* ── Mode toggle ── */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
            disabled={loading}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
            disabled={loading}
          >
            Register
          </button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="operator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* ── Error message ── */}
          {error && (
            <div className="auth-error" role="alert" aria-live="polite">
              <span className="auth-error-icon" aria-hidden="true">⚠</span>
              {error}
            </div>
          )}

          {/* ── Submit ── */}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {/* ── Footer note ── */}
        <p className="auth-footer-note">
          {mode === 'login'
            ? 'No account yet? Switch to Register above.'
            : 'Already have an account? Switch to Sign In above.'}
        </p>
      </div>
    </div>
  )
}
