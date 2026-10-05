/**
 * auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Authentication helper functions for Smart Electricity Theft Detection.
 *
 * All functions use the modular Firebase SDK and delegate to the shared `auth`
 * instance from firebase.ts — no credentials are ever stored locally.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from './firebase'

// ── Error mapping ─────────────────────────────────────────────────────────────
// Convert raw Firebase error codes to human-readable messages.
export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Contact your administrator.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

// ── Auth operations ───────────────────────────────────────────────────────────

/**
 * Register a new operator account with email and password.
 * Throws on failure — call site should catch and use getAuthErrorMessage().
 */
export async function registerUser(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(auth, email, password)
}

/**
 * Sign in an existing operator with email and password.
 * Throws on failure — call site should catch and use getAuthErrorMessage().
 */
export async function loginUser(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

/**
 * Sign out the currently authenticated operator.
 * Throws on failure (extremely rare).
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

/**
 * Subscribe to auth state changes.
 * The callback fires immediately with the current user (or null),
 * and again whenever sign-in / sign-out occurs.
 *
 * @returns Unsubscribe function — call it in useEffect cleanup.
 */
export function observeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}
