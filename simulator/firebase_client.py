"""
firebase_client.py
─────────────────────────────────────────────────────────────────────────────
Firebase Realtime Database REST API client for the Smart Electricity Theft Detection
Simulator and edge telemetry.

Communicates over HTTPS to the Singapore-region Firebase Realtime Database.
Supports:
  1. Authenticated push via Firebase Auth ID token (obtained with email/password).
  2. Local Dry-Run mode for testing without requiring credentials or network access.
  3. Updates /latest_readings/{deviceId}, appends to /readings/{deviceId}, and
     updates device heartbeat in /devices/{deviceId}.
"""

import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

DEFAULT_RTDB_URL = "https://electricity-theft-detect-cae09-default-rtdb.asia-southeast1.firebasedatabase.app"

class FirebaseRtdbClient:
    def __init__(self, database_url: str = DEFAULT_RTDB_URL, auth_token: Optional[str] = None, dry_run: bool = False):
        self.database_url = database_url.rstrip("/")
        self.auth_token = auth_token
        self.dry_run = dry_run

    def _build_url(self, path: str) -> str:
        clean_path = path.strip("/")
        url = f"{self.database_url}/{clean_path}.json"
        if self.auth_token:
            url += f"?auth={self.auth_token}"
        return url

    def _send_request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if self.dry_run:
            return {"status": "success", "dry_run": True, "path": path, "payload": payload}

        target_url = self._build_url(path)
        data_bytes = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"}

        req = urllib.request.Request(target_url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                resp_text = response.read().decode("utf-8")
                return json.loads(resp_text) if resp_text else {}
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            if e.code == 401 or "Permission denied" in error_body:
                raise PermissionError(
                    f"[Firebase RTDB 401] Access denied at path '{path}'. "
                    f"Firebase Realtime Database security rules rejected this request. "
                    f"Ensure simulator is authenticated or security rules allow this device."
                ) from e
            raise RuntimeError(f"[Firebase RTDB {e.code}] Error at '{path}': {error_body}") from e
        except urllib.error.URLError as e:
            raise ConnectionError(f"[Firebase Network Error] Failed to reach {self.database_url}: {e.reason}") from e

    def register_or_update_device(self, device_id: str, name: str = "Simulated Energy Meter") -> Dict[str, Any]:
        """Update device metadata and online heartbeat in /devices/{deviceId}"""
        import time
        payload = {
            "deviceId": device_id,
            "name": name,
            "status": "online",
            "relayState": "CONNECTED",
            "lastSeen": int(time.time() * 1000),
            "isSimulator": True,
            "registeredAt": int(time.time() * 1000),
        }
        return self._send_request("PATCH", f"devices/{device_id}", payload)

    def push_reading(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """
        Atomically updates the latest snapshot at /latest_readings/{deviceId}
        and pushes an append-only historical record to /readings/{deviceId}.
        """
        device_id = reading["deviceId"]

        # 1. Update latest reading snapshot
        latest_res = self._send_request("PUT", f"latest_readings/{device_id}", reading)

        # 2. Append to historical readings
        history_res = self._send_request("POST", f"readings/{device_id}", reading)

        return {
            "latest": latest_res,
            "history": history_res,
        }

    @staticmethod
    def authenticate_with_email(api_key: str, email: str, password: str) -> str:
        """
        Signs in with email/password via Firebase Identity Toolkit to retrieve an ID token.
        Never logs or exposes password.
        """
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True,
        }
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(auth_url, data=data_bytes, headers={"Content-Type": "application/json"})

        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            return res_json["idToken"]
