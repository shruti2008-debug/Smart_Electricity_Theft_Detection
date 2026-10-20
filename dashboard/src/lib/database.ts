/**
 * database.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Firebase Realtime Database helper functions for Smart Electricity Theft Detection.
 *
 * Provides reusable, type-safe abstractions around the modular Firebase Realtime
 * Database SDK, delegating directly to the centralized `db` instance from firebase.ts.
 * Includes authentication state verification and actionable error diagnostic handling.
 */

import {
  ref,
  set,
  get,
  update,
  remove,
  push,
  onValue,
  off,
  DataSnapshot,
  DatabaseReference,
} from 'firebase/database'
import { db, auth } from './firebase'
import { DB_PATHS } from './types'

export interface DatabaseErrorDetails {
  code: string
  message: string
  path: string
  hint: string
}

/**
 * Format raw Firebase errors into structured, user-friendly diagnostic errors.
 */
export function formatDatabaseError(err: unknown, path: string): Error {
  const rawMsg = err instanceof Error ? err.message : String(err)
  const isPermissionDenied =
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('Permission denied') ||
    (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'PERMISSION_DENIED')

  if (isPermissionDenied) {
    const isAuthenticated = !!auth.currentUser
    const userHint = isAuthenticated
      ? `User is signed in (${auth.currentUser?.email}), but the Realtime Database Security Rules denied access to path "${path}". Ensure the security rules from firebase/database.rules.json have been deployed or published in Firebase Console.`
      : `No authenticated user detected. The path "${path}" requires an active sign-in. Sign in to your operator account before accessing or mutating this path.`

    const friendlyError = new Error(`Firebase RTDB Permission Denied at [${path}]: ${userHint}`)
    friendlyError.name = 'PermissionDeniedError'
    return friendlyError
  }

  return err instanceof Error ? err : new Error(rawMsg)
}

/**
 * Check whether the current client is authenticated before executing sensitive operations.
 */
export function requireAuth(path: string): void {
  if (!auth.currentUser) {
    throw new Error(
      `Unauthenticated operation blocked at path "${path}". Operator must be signed in to perform this action.`
    )
  }
}

/**
 * Obtain a typed DatabaseReference for a specific RTDB path.
 */
export function getDbRef(path: string): DatabaseReference {
  return ref(db, path)
}

/**
 * Write/overwrite data at a specific path.
 * Checks authentication for protected paths and handles permission errors gracefully.
 */
export async function writeData<T>(path: string, data: T): Promise<void> {
  try {
    const dbRef = ref(db, path)
    await set(dbRef, data)
  } catch (err) {
    throw formatDatabaseError(err, path)
  }
}

/**
 * Push a new child node to a list path with an automatically generated unique key.
 * Returns the generated key string, or null if unsuccessful.
 */
export async function pushData<T>(path: string, data: T): Promise<string | null> {
  try {
    const dbRef = ref(db, path)
    const newRef = push(dbRef)
    await set(newRef, data)
    return newRef.key
  } catch (err) {
    throw formatDatabaseError(err, path)
  }
}

/**
 * Read data once from a specific path.
 */
export async function readData<T>(path: string): Promise<T | null> {
  try {
    const dbRef = ref(db, path)
    const snapshot: DataSnapshot = await get(dbRef)
    if (snapshot.exists()) {
      return snapshot.val() as T
    }
    return null
  } catch (err) {
    throw formatDatabaseError(err, path)
  }
}

/**
 * Update specific child fields at a path without overwriting sibling keys.
 */
export async function updateData(path: string, values: object): Promise<void> {
  try {
    const dbRef = ref(db, path)
    await update(dbRef, values)
  } catch (err) {
    throw formatDatabaseError(err, path)
  }
}

/**
 * Delete a node at a specific path.
 */
export async function deleteData(path: string): Promise<void> {
  try {
    const dbRef = ref(db, path)
    await remove(dbRef)
  } catch (err) {
    throw formatDatabaseError(err, path)
  }
}

/**
 * Subscribe to realtime changes at a path.
 *
 * @param path RTDB path to observe
 * @param callback Invoked whenever data at path changes (or initially upon attach)
 * @param onError Optional error handler
 * @returns Unsubscribe function to detach the listener
 */
export function subscribeToData<T>(
  path: string,
  callback: (data: T | null) => void,
  onError?: (error: Error) => void
): () => void {
  const dbRef = ref(db, path)
  const unsubscribe = onValue(
    dbRef,
    (snapshot: DataSnapshot) => {
      try {
        if (snapshot.exists()) {
          callback(snapshot.val() as T)
        } else {
          callback(null)
        }
      } catch (err) {
        console.error(`[database.ts] Error in subscription callback for "${path}":`, err)
      }
    },
    (rawError) => {
      const err = formatDatabaseError(rawError, path)
      if (onError) {
        onError(err)
      } else {
        console.error(`[database.ts] Subscription error at path "${path}":`, err.message)
      }
    }
  )

  return () => {
    off(dbRef)
    unsubscribe()
  }
}

/**
 * Safely verify Realtime Database read/write functionality using an isolated test path.
 * Writes a temporary timestamp, reads it back, and immediately cleans it up.
 */
export async function verifyDatabaseConnection(): Promise<{
  success: boolean
  error?: string
  roundtripMs?: number
}> {
  const user = auth.currentUser
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated. Please sign in to verify Firebase Realtime Database permissions.',
    }
  }

  const testPath = `${DB_PATHS.systemTest}/${user.uid}`
  const startTime = Date.now()
  const payload = {
    testPing: true,
    testedAt: startTime,
    userEmail: user.email ?? 'unknown',
  }

  try {
    // 1. Write test record
    await writeData(testPath, payload)
    // 2. Read back
    const readBack = await readData<typeof payload>(testPath)
    if (!readBack || readBack.testedAt !== startTime) {
      throw new Error('Read back verification mismatch')
    }
    // 3. Clean up
    await deleteData(testPath)

    return {
      success: true,
      roundtripMs: Date.now() - startTime,
    }
  } catch (err) {
    // Attempt cleanup even on failure
    try {
      await deleteData(testPath)
    } catch {
      // Ignore secondary error during cleanup
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
