import React, { useState } from 'react'
import { verifyDatabaseConnection } from '../lib/database'

interface DiagnosticModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{
    tested: boolean
    success: boolean
    roundtripMs?: number
    error?: string
  } | null>(null)

  if (!isOpen) return null

  const handleRunDiagnostic = async () => {
    setTesting(true)
    setResult(null)
    const res = await verifyDatabaseConnection()
    setResult({
      tested: true,
      success: res.success,
      roundtripMs: res.roundtripMs,
      error: res.error,
    })
    setTesting(false)
  }

  return (
    <div className="modal-backdrop">
      <div className="diagnostic-modal">
        <div className="diagnostic-header">
          <div className="diagnostic-title">
            <span>🛠️</span>
            <h3>Firebase Realtime Database Permission Diagnostic</h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p className="diagnostic-desc">
          Verifies read and write permissions to the configured Singapore-region Firebase Realtime Database
          by writing a temporary timestamp to <code>/system_test/&#123;uid&#125;</code>, reading it back,
          and immediately cleaning it up.
        </p>

        <div className="diagnostic-action-bar">
          <button
            className="btn-primary"
            onClick={handleRunDiagnostic}
            disabled={testing}
          >
            {testing ? 'Testing Connection & Permissions…' : '▶ Run Permission Diagnostic Test'}
          </button>
        </div>

        {result && (
          <div className={`diagnostic-result-box ${result.success ? 'result-success' : 'result-failure'}`}>
            {result.success ? (
              <div>
                <div className="result-headline text-success">
                  ✅ Permission Test Passed!
                </div>
                <p>
                  Authenticated read, write, and delete operations to the Firebase Realtime Database were verified in{' '}
                  <strong>{result.roundtripMs} ms</strong>.
                </p>
                <p className="result-subtext">
                  The security rules allow your authenticated account full access to telemetry paths.
                </p>
              </div>
            ) : (
              <div>
                <div className="result-headline text-danger">
                  ❌ Diagnostic Failed: {result.error}
                </div>
                <div className="rules-remedy-box">
                  <h4>How to Apply Security Rules in Firebase Console:</h4>
                  <ol>
                    <li>Open <strong>Firebase Console</strong> → Select <code>electricity-theft-detect-cae09</code></li>
                    <li>Click <strong>Realtime Database</strong> in the left sidebar → Select the <strong>Rules</strong> tab</li>
                    <li>Paste the contents of <code>firebase/database.rules.json</code>:</li>
                  </ol>
                  <pre className="rules-code-preview">
{`{
  "rules": {
    "system_test": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "devices": {
      ".read": "auth != null",
      "$deviceId": { ".write": "auth != null" }
    },
    "readings": {
      "$deviceId": {
        ".read": "auth != null",
        "$readingId": { ".write": "auth != null" }
      }
    },
    "latest_readings": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "alerts": {
      "$deviceId": {
        ".read": "auth != null",
        "$alertId": { ".write": "auth != null" }
      }
    },
    "control": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}`}
                  </pre>
                  <p>Click <strong>Publish</strong> in Firebase Console, then re-run this test.</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="diagnostic-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
export default DiagnosticModal
