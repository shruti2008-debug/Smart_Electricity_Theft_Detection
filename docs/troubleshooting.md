# Troubleshooting & Common Issues Guide
**Project:** Smart Electricity Theft Detection  
**Document:** `docs/troubleshooting.md`

---

## 1. Firebase Realtime Database `PERMISSION_DENIED`

### Root Cause:
When a new Firebase Realtime Database is created, Firebase defaults to **Locked Mode**:
```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```
In Locked Mode, any client read or write attempt is blocked with:
`PERMISSION_DENIED: Permission denied`

### Solution:
Apply the role/auth security rules provided in [`firebase/database.rules.json`](file:///c:/Users/shrut/OneDrive/Desktop/CP/Smart-Energy-Theft-Detection/firebase/database.rules.json):
1. Navigate to [Firebase Console](https://console.firebase.google.com/) → Select `electricity-theft-detect-cae09`.
2. In the left navigation, select **Build** → **Realtime Database**.
3. Click the **Rules** tab.
4. Replace the existing rules with the contents of `firebase/database.rules.json`.
5. Click **Publish**.
6. On the web dashboard, click **🛠️ RTDB Diagnostic** in the top navigation bar to test read/write roundtrip connectivity.

---

## 2. Singapore Database Region Not Connecting

### Root Cause:
The Firebase project Realtime Database was created in the Singapore region:
`https://electricity-theft-detect-cae09-default-rtdb.asia-southeast1.firebasedatabase.app`

If `VITE_FIREBASE_DATABASE_URL` is omitted, the Firebase SDK defaults to US-central (`https://electricity-theft-detect-cae09.firebaseio.com`), which does not exist for this project.

### Solution:
Ensure `dashboard/.env.local` contains:
```env
VITE_FIREBASE_DATABASE_URL=https://electricity-theft-detect-cae09-default-rtdb.asia-southeast1.firebasedatabase.app
```

---

## 3. Simulator Shows `UnicodeEncodeError` on Windows

### Root Cause:
Windows PowerShell consoles default to code page 1252 (`cp1252`), which cannot encode certain emoji characters.

### Solution:
The simulator and ML scripts in this project automatically invoke `sys.stdout.reconfigure(encoding="utf-8")` and use ASCII labels `[OK]`, `[WARN]`, `[INFO]`. You can also configure PowerShell:
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

---

## 4. ESP32 Wi-Fi Times Out or Fails to Connect

### Checklist:
1. Ensure the Wi-Fi network is **2.4 GHz**. The ESP32 does NOT support 5 GHz Wi-Fi networks.
2. Confirm credentials in `firmware/esp32_theft_detector/config.h`.
3. If connecting to a mobile hotspot, ensure "Maximize Compatibility" is enabled.

---

## 5. Current or Voltage Readings Fluctuate Near Zero

### Checklist:
1. **ZMPT101B Trimpot:** Adjust the sensitivity potentiometer on the voltage sensor board until the AC sine wave amplitude is centered within the $0 - 3.3\text{V}$ range.
2. **ACS712 Noise Floor:** Hall-effect sensors pick up minor magnetic field noise. The firmware and simulator enforce an $80\text{mA}$ software deadband filter to suppress ambient noise.
3. **ADC Pin Selection:** Ensure sensors are connected to ADC1 pins (`GPIO 34` and `GPIO 35`), as ADC2 is disabled when the ESP32 Wi-Fi radio is broadcasting.
