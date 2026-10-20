"""
service.py
─────────────────────────────────────────────────────────────────────────────
Real-time Machine Learning Anomaly Detection Service for Smart Electricity Theft Detection.

Monitors incoming readings from Firebase Realtime Database (/latest_readings/{deviceId}),
computes anomaly scores (0-100) and risk levels using the trained Isolation Forest model
and domain rules, writes the enriched evaluation back, and creates deduplicated alerts
under /alerts/{deviceId}.
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from detector import ElectricityTheftDetector

DEFAULT_RTDB_URL = "https://electricity-theft-detect-cae09-default-rtdb.asia-southeast1.firebasedatabase.app"

class MlAnomalyService:
    def __init__(
        self,
        database_url: str = DEFAULT_RTDB_URL,
        auth_token: Optional[str] = None,
        model_dir: Optional[str] = None,
        alert_threshold: float = 65.0,
        cooldown_seconds: float = 120.0,
        dry_run: bool = False,
    ):
        self.database_url = database_url.rstrip("/")
        self.auth_token = auth_token
        self.alert_threshold = alert_threshold
        self.cooldown_seconds = cooldown_seconds
        self.dry_run = dry_run

        self.detector = ElectricityTheftDetector()
        if model_dir and os.path.exists(os.path.join(model_dir, "metadata.pkl")):
            self.detector.load(model_dir)
            print(f"[OK] Loaded pre-trained model from {model_dir}")
        else:
            print("[WARN] Pre-trained model not found. Using domain rule baseline.")

        # Cache of last processed timestamp per device to prevent re-processing: {deviceId: timestamp}
        self.last_processed_timestamps: Dict[str, int] = {}
        # Cooldown tracker for alert deduplication: {(deviceId, alertType): lastAlertTimestamp}
        self.last_alert_times: Dict[Tuple[str, str], float] = {}

    def _build_url(self, path: str) -> str:
        clean_path = path.strip("/")
        url = f"{self.database_url}/{clean_path}.json"
        if self.auth_token:
            url += f"?auth={self.auth_token}"
        return url

    def _http_request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        if self.dry_run:
            return {"status": "dry_run", "path": path, "payload": payload}

        target_url = self._build_url(path)
        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(target_url, data=data_bytes, headers={"Content-Type": "application/json"}, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                text = resp.read().decode("utf-8")
                return json.loads(text) if text else {}
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise PermissionError(f"[Firebase 401] Access denied at {path}. Check RTDB rules or auth token.") from e
            raise RuntimeError(f"[Firebase {e.code}] Error at {path}") from e

    def fetch_latest_readings(self) -> Dict[str, Any]:
        """Fetch current snapshots of all devices from /latest_readings"""
        data = self._http_request("GET", "latest_readings")
        return data if isinstance(data, dict) else {}

    def process_device_reading(self, device_id: str, reading: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validates reading, scores anomaly risk, updates /latest_readings/{deviceId},
        and creates alert if risk threshold exceeded.
        """
        if not isinstance(reading, dict):
            return None

        reading_timestamp = reading.get("timestamp", 0)

        # Idempotency check: Skip if already evaluated
        if reading_timestamp and self.last_processed_timestamps.get(device_id) == reading_timestamp:
            return None

        # Check if reading already has an anomaly_score calculated
        if "anomaly_score" in reading and reading.get("modelVersion") == self.detector.model_version:
            self.last_processed_timestamps[device_id] = reading_timestamp
            return None

        # Calculate Risk Score
        risk_score, risk_level, status, explanation = self.detector.calculate_risk_score(reading)

        # Enriched update fields (DO NOT touch deviceId, voltage, current to avoid cycles)
        update_payload = {
            "anomaly_score": risk_score,
            "risk_level": risk_level,
            "status": status,
            "modelVersion": self.detector.model_version,
            "evaluatedAt": int(time.time() * 1000),
        }

        # Write score back to Firebase
        self._http_request("PATCH", f"latest_readings/{device_id}", update_payload)
        self.last_processed_timestamps[device_id] = reading_timestamp

        # Check if Alert Generation is warranted
        if risk_score >= self.alert_threshold or status in ["TAMPERED", "FAULT"]:
            self._maybe_create_alert(device_id, reading, risk_score, risk_level, status, explanation)

        return {
            "deviceId": device_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "status": status,
            "explanation": explanation,
        }

    def _maybe_create_alert(
        self,
        device_id: str,
        reading: Dict[str, Any],
        risk_score: float,
        risk_level: str,
        status: str,
        explanation: str,
    ):
        """Create deduplicated alert with cooldown window."""
        alert_type = (
            "METER_BYPASS" if "Bypass" in explanation else
            "SENSOR_FAULT" if status == "FAULT" else
            "THEFT_SUSPECTED" if status == "TAMPERED" else
            "CURRENT_SPIKE"
        )
        now = time.time()
        cooldown_key = (device_id, alert_type)

        last_sent = self.last_alert_times.get(cooldown_key, 0.0)
        if (now - last_sent) < self.cooldown_seconds:
            # Alert throttled by cooldown
            return

        alert_id = f"alert-{device_id}-{int(now * 1000)}"
        alert_payload = {
            "alertId": alert_id,
            "deviceId": device_id,
            "timestamp": int(now * 1000),
            "type": alert_type,
            "severity": "CRITICAL" if risk_score >= 80.0 else "WARNING",
            "message": explanation,
            "anomaly_score": risk_score,
            "current_reading": {
                "voltage": reading.get("voltage", 0.0),
                "current": reading.get("current", 0.0),
                "power": reading.get("power", 0.0),
            },
            "status": "ACTIVE",
        }

        self._http_request("PUT", f"alerts/{device_id}/{alert_id}", alert_payload)
        self.last_alert_times[cooldown_key] = now
        print(f"[ALERT CREATED] Device {device_id} -> {alert_type} (Score: {risk_score}): {explanation}")

def parse_args():
    parser = argparse.ArgumentParser(description="Smart Electricity Theft Detection ML Anomaly Service")
    parser.add_argument("--rtdb-url", default=DEFAULT_RTDB_URL, help="Firebase RTDB URL")
    parser.add_argument("--auth-token", default=None, help="Firebase Auth ID Token")
    parser.add_argument("--poll-interval", type=float, default=3.0, help="Poll interval in seconds")
    parser.add_argument("--threshold", type=float, default=65.0, help="Alert anomaly score threshold (0-100)")
    parser.add_argument("--cooldown", type=float, default=120.0, help="Alert deduplication cooldown in seconds")
    parser.add_argument("--dry-run", action="store_true", help="Local evaluation without writing to Firebase")
    return parser.parse_args()

def main():
    args = parse_args()
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, "models")

    print("=" * 72)
    print(" [*] SMART ELECTRICITY THEFT DETECTION -- ML SCORING SERVICE")
    print("=" * 72)
    print(f" Mode:            {'DRY RUN (Local evaluation)' if args.dry_run else 'ACTIVE FIREBASE DAEMON'}")
    print(f" Alert Threshold: {args.threshold} / 100")
    print(f" Alert Cooldown:  {args.cooldown}s")
    print("-" * 72)

    service = MlAnomalyService(
        database_url=args.rtdb_url,
        auth_token=args.auth_token,
        model_dir=models_dir,
        alert_threshold=args.threshold,
        cooldown_seconds=args.cooldown,
        dry_run=args.dry_run,
    )

    if args.dry_run:
        print("[*] Performing test score on synthetic sample readings...")
        test_samples = [
            {"deviceId": "SIM-001", "voltage": 230.2, "current": 4.5, "power": 980.0, "power_factor": 0.95},
            {"deviceId": "SIM-001", "voltage": 230.0, "current": 0.12, "power": 25.0, "power_factor": 0.90},
            {"deviceId": "SIM-001", "voltage": 0.0, "current": 0.0, "power": 0.0, "power_factor": 0.0},
        ]
        for sample in test_samples:
            res = service.process_device_reading(sample["deviceId"], sample)
            print(f"Sample: {sample} -> Score: {res['risk_score']} ({res['risk_level']}) [{res['status']}]: {res['explanation']}")
        print("[OK] Dry run test scoring complete.")
        return

    print("[*] Polling Firebase /latest_readings... (Press Ctrl+C to stop)")
    try:
        while True:
            try:
                devices_data = service.fetch_latest_readings()
                for dev_id, reading in devices_data.items():
                    if isinstance(reading, dict):
                        service.process_device_reading(dev_id, reading)
            except PermissionError as pe:
                print(f"[PERMISSION_DENIED] {pe}")
                print("Sleeping 10s before retry...")
                time.sleep(10.0)
            except Exception as e:
                print(f"[WARN] Error polling readings: {e}")

            time.sleep(args.poll_interval)
    except KeyboardInterrupt:
        print("\nStopping ML service.")

if __name__ == "__main__":
    main()
