/**
 * firebase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase SDK initialization for Smart Electricity Theft Detection.
 *
 * All configuration values are read from environment variables defined in
 * dashboard/.env.local (never hard-coded, never committed to version control).
 *
 * Currently initialises:
 *   • Firebase App (core)
 *   • Firebase Authentication
 *
 * Future exports to add here (in later phases):
 *   • getDatabase(app)      → Firebase Realtime Database
 *   • getFunctions(app)     → Firebase Cloud Functions client
 */

import { initializeApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getDatabase, Database } from 'firebase/database'

// ── Firebase project configuration ────────────────────────────────────────────
// Values injected at build-time by Vite from dashboard/.env.local
const defaultRtdbUrl =
  'https://electricity-theft-detect-cae09-default-rtdb.asia-southeast1.firebasedatabase.app'

const rtdbUrl =
  (import.meta.env.VITE_FIREBASE_DATABASE_URL as string) || defaultRtdbUrl

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY             as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
  databaseURL:       rtdbUrl,
}

// ── Guard: fail fast in development if any env var is missing ─────────────────
if (import.meta.env.DEV) {
  const missing = Object.entries(firebaseConfig)
    .filter(([k, v]) => !v && k !== 'databaseURL')
    .map(([k]) => `VITE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`)

  if (missing.length > 0) {
    throw new Error(
      `[firebase.ts] Missing environment variables: ${missing.join(', ')}\n` +
      'Ensure dashboard/.env.local is present and contains all VITE_FIREBASE_* keys.'
    )
  }
}

// ── Initialise Firebase services ──────────────────────────────────────────────
const app: FirebaseApp = initializeApp(firebaseConfig)
const auth: Auth = getAuth(app)
const db: Database = getDatabase(app, rtdbUrl)

// ── Exports ───────────────────────────────────────────────────────────────────
export { app, auth, db }
export default app
