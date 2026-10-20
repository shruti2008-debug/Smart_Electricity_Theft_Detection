import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { SensorReading, DeviceAlert, AlertType } from './types'
import { evaluateReading } from './evaluator'

admin.initializeApp()
const db = admin.database()

const ALERT_COOLDOWN_MS = 2 * 60 * 1000 // 2 minutes cooldown per device

/**
 * Realtime Database Trigger: Fires on every new reading pushed under /readings/{deviceId}/{readingId}.
 * Idempotently computes anomaly score, updates latest snapshot, and manages alerts.
 */
export const onReadingCreated = functions.database
  .ref('/readings/{deviceId}/{readingId}')
  .onCreate(async (snapshot, context) => {
    const deviceId = context.params.deviceId
    const reading = snapshot.val() as SensorReading

    if (!reading || typeof reading !== 'object') {
      return null
    }

    // 1. Evaluate anomaly risk
    const evalResult = evaluateReading(reading)

    // 2. Enrich the current reading if not already scored
    if (!reading.anomaly_score) {
      await snapshot.ref.update({
        anomaly_score: evalResult.anomaly_score,
        risk_level: evalResult.risk_level,
        status: evalResult.status,
        evaluatedAt: Date.now(),
      })
    }

    // 3. Atomically update latest reading snapshot
    const latestRef = db.ref(`latest_readings/${deviceId}`)
    await latestRef.set({
      ...reading,
      anomaly_score: evalResult.anomaly_score,
      risk_level: evalResult.risk_level,
      status: evalResult.status,
    })

    // 4. Update device heartbeat
    const deviceRef = db.ref(`devices/${deviceId}`)
    await deviceRef.update({
      lastSeen: reading.timestamp || Date.now(),
      status: 'online',
    })

    // 5. Generate alert if anomaly warrants it
    if (evalResult.shouldAlert) {
      const now = Date.now()
      const alertsRef = db.ref(`alerts/${deviceId}`)

      // Check recent alerts for cooldown/deduplication
      const recentAlertsSnap = await alertsRef
        .orderByChild('timestamp')
        .startAt(now - ALERT_COOLDOWN_MS)
        .once('value')

      if (recentAlertsSnap.exists()) {
        // Cooldown active, suppress duplicate alert
        return null
      }

      const alertType: AlertType =
        evalResult.status === 'FAULT'
          ? 'SENSOR_FAULT'
          : evalResult.explanation.includes('Bypass')
          ? 'METER_BYPASS'
          : 'THEFT_SUSPECTED'

      const alertId = `alert-${deviceId}-${now}`
      const alertPayload: DeviceAlert = {
        alertId,
        deviceId,
        timestamp: now,
        type: alertType,
        severity: evalResult.anomaly_score >= 85 ? 'CRITICAL' : 'WARNING',
        message: evalResult.explanation,
        anomaly_score: evalResult.anomaly_score,
        current_reading: {
          voltage: reading.voltage,
          current: reading.current,
          power: reading.power,
        },
        status: 'ACTIVE',
      }

      await alertsRef.child(alertId).set(alertPayload)
    }

    return null
  })

/**
 * HTTPS Callable: Verify authenticated connection and system health.
 */
export const pingSystem = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    )
  }

  return {
    status: 'ok',
    project: 'Smart Electricity Theft Detection',
    callerEmail: context.auth.token.email,
    serverTime: Date.now(),
  }
})

/**
 * HTTPS Callable: Securely dispatch relay control command.
 */
export const setRelayCommand = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    )
  }

  const { deviceId, command } = data
  if (!deviceId || !['CONNECT', 'DISCONNECT'].includes(command)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Valid deviceId and command ("CONNECT" | "DISCONNECT") are required.'
    )
  }

  const controlRef = db.ref(`control/${deviceId}`)
  await controlRef.set({
    deviceId,
    relayCommand: command,
    requestedBy: context.auth.uid,
    requestedAt: Date.now(),
    executed: false,
  })

  // Update device status record
  await db.ref(`devices/${deviceId}`).update({
    relayState: command === 'CONNECT' ? 'CONNECTED' : 'DISCONNECTED',
  })

  return {
    success: true,
    deviceId,
    relayCommand: command,
  }
})
