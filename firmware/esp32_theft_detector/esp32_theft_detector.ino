/**
 * esp32_theft_detector.ino
 * ─────────────────────────────────────────────────────────────────────────────
 * Smart Electricity Theft Detection — ESP32 Microcontroller Firmware
 *
 * Microcontroller: ESP32 DevKit V1 (30 or 38 pin)
 * Sensors:         ZMPT101B (AC Voltage), ACS712-30A (AC Current)
 * Actuator:        1-Channel 5V Optoisolated Relay Module
 * Display:         16x2 Character LCD with PCF8574 I2C Backpack (0x27 or 0x3F)
 * Cloud:           Firebase Realtime Database (Singapore Region REST API)
 *
 * IMPORTANT ELECTRICAL SAFETY NOTE:
 * Never connect raw AC mains to an uninsulated breadboard or direct to ESP32.
 * Ensure ZMPT101B and ACS712 isolation barriers are intact and earth is bonded.
 */

#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
#endif

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ── Global Objects & State ───────────────────────────────────────────────────
LiquidCrystal_I2C lcd(0x27, 16, 2); // Default I2C address 0x27

unsigned long lastTelemetryTime = 0;
unsigned long lastControlPollTime = 0;
unsigned long lastLcdRotateTime = 0;
unsigned long lastEnergyCalcTime = 0;

int lcdScreenIndex = 0;
double cumulativeEnergyKwh = 0.0;
bool relayStateConnected = true;

// ── Setup Initialization ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("\n========================================================"));
  Serial.println(F("  SMART ELECTRICITY THEFT DETECTION -- ESP32 FIRMWARE   "));
  Serial.println(F("========================================================"));

  // Initialize GPIOs
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_RELAY_CONTROL, OUTPUT);
  pinMode(PIN_VOLTAGE_ADC, INPUT);
  pinMode(PIN_CURRENT_ADC, INPUT);

  // Set default relay energised state (closed contact)
  digitalWrite(PIN_RELAY_CONTROL, RELAY_ACTIVE_LEVEL);
  digitalWrite(PIN_STATUS_LED, HIGH);

  // Initialize I2C LCD
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("Smart Theft Det."));
  lcd.setCursor(0, 1);
  lcd.print(F("Booting ESP32..."));

  // Connect to Wi-Fi
  connectWiFi();

  lastEnergyCalcTime = millis();
  Serial.println(F("[SYSTEM] Initialization complete. Entering measurement loop."));
}

// ── Main Processing Loop ─────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Maintain Wi-Fi connectivity
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, LOW);
    connectWiFi();
  }

  // 1. RMS Measurement Acquisition
  double vRms = measureVoltageRms();
  double iRms = measureCurrentRms();
  double powerFactor = 0.95; // Estimated typical domestic PF

  // If current is below noise floor (e.g. 80mA), clamp to 0
  if (iRms < 0.08) {
    iRms = 0.0;
  }

  // Active Power P = V * I * PF
  double activePowerWatts = vRms * iRms * powerFactor;

  // Integrate Cumulative Energy: E_kwh = (P * dt) / (3.6e6)
  double dtHours = (now - lastEnergyCalcTime) / 3600000.0;
  lastEnergyCalcTime = now;
  cumulativeEnergyKwh += (activePowerWatts * dtHours) / 1000.0;

  // 2. Rotate LCD Display (every 3 seconds)
  if (now - lastLcdRotateTime >= 3000) {
    lastLcdRotateTime = now;
    updateLcdDisplay(vRms, iRms, activePowerWatts, cumulativeEnergyKwh);
  }

  // 3. Periodic Cloud Telemetry Push to Firebase
  if (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = now;
    pushTelemetryToFirebase(vRms, iRms, activePowerWatts, cumulativeEnergyKwh, powerFactor);
  }

  // 4. Poll for Remote Relay Disconnect / Reconnect Command
  if (now - lastControlPollTime >= CONTROL_POLL_MS) {
    lastControlPollTime = now;
    pollRelayControlCommand();
  }

  delay(20);
}

// ── Sensor RMS Measurement Functions ─────────────────────────────────────────

/**
 * Samples ZMPT101B AC voltage waveform over multiple complete cycles (40ms = 2 cycles @ 50Hz)
 * to compute Root Mean Square (RMS) voltage.
 */
double measureVoltageRms() {
  const unsigned long sampleDurationMs = 40; // 2 cycles of 50 Hz
  unsigned long startTime = millis();
  unsigned long sampleCount = 0;
  double sumSquaredDifferences = 0.0;

  // Baseline midpoint of ZMPT101B ADC (nominally ~1.65V = 2048 counts)
  double adcMidpoint = 2048.0;

  while (millis() - startTime < sampleDurationMs) {
    int rawAdc = analogRead(PIN_VOLTAGE_ADC);
    double diff = (double)rawAdc - adcMidpoint;
    sumSquaredDifferences += diff * diff;
    sampleCount++;
    delayMicroseconds(200);
  }

  if (sampleCount == 0) return 0.0;

  double meanSquare = sumSquaredDifferences / sampleCount;
  double vRmsAdc = sqrt(meanSquare);

  // Convert ADC RMS to Volts AC using calibration scalar
  double vRms = (vRmsAdc / ADC_RESOLUTION) * VOLTAGE_CALIBRATION;

  // Noise floor suppression: if calculated voltage < 15V, consider line disconnected
  if (vRms < 15.0) {
    vRms = 0.0;
  }

  return vRms;
}

/**
 * Samples ACS712 AC current waveform over 40ms to compute RMS current.
 */
double measureCurrentRms() {
  const unsigned long sampleDurationMs = 40; // 2 cycles @ 50 Hz
  unsigned long startTime = millis();
  unsigned long sampleCount = 0;
  double sumSquaredVolts = 0.0;

  // ACS712 zero-current midpoint: VCC / 2 = 1.65V (approx 2048 counts on 3.3V ADC)
  double adcMidpoint = 2048.0;

  while (millis() - startTime < sampleDurationMs) {
    int rawAdc = analogRead(PIN_CURRENT_ADC);
    double voltDiff = ((double)rawAdc - adcMidpoint) * (ADC_REF_VOLTAGE / ADC_RESOLUTION);
    sumSquaredVolts += voltDiff * voltDiff;
    sampleCount++;
    delayMicroseconds(200);
  }

  if (sampleCount == 0) return 0.0;

  double vRmsSensor = sqrt(sumSquaredVolts / sampleCount);
  // Current in Amperes = V_rms / Sensitivity (V/A)
  double iRms = vRmsSensor / ACS712_SENSITIVITY;

  return iRms;
}

// ── Firebase REST API Push ───────────────────────────────────────────────────

void pushTelemetryToFirebase(double v, double i, double p, double kwh, double pf) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[FIREBASE] Wi-Fi unavailable, skipping cloud upload."));
    return;
  }

  HTTPClient http;
  String latestUrl = String(FIREBASE_HOST) + "/latest_readings/" + String(DEVICE_ID) + ".json";
  if (strlen(FIREBASE_AUTH_KEY) > 0) {
    latestUrl += "?auth=" + String(FIREBASE_AUTH_KEY);
  }

  // Construct JSON document adhering to shared DATA_CONTRACT.md
  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = (double)(millis()); // Or synced NTP timestamp
  doc["voltage"] = round(v * 10.0) / 10.0;
  doc["current"] = round(i * 100.0) / 100.0;
  doc["power"] = round(p * 10.0) / 10.0;
  doc["energy_kwh"] = round(kwh * 10000.0) / 10000.0;
  doc["power_factor"] = pf;
  doc["frequency"] = 50.0;
  doc["source"] = "esp32";
  doc["status"] = (i < 0.25 && v > 210.0) ? "TAMPERED" : (v < 5.0 ? "FAULT" : "NORMAL");

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // 1. PUT to /latest_readings/{deviceId}
  http.begin(latestUrl);
  http.addHeader("Content-Type", "application/json");
  int httpCode = http.PUT(jsonPayload);

  if (httpCode >= 200 && httpCode < 300) {
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED)); // Toggle LED on sync
    Serial.printf("[FIREBASE PUT %s] %d OK | V: %.1fV | I: %.2fA | P: %.1fW | E: %.3fkWh\n",
                  DEVICE_ID, httpCode, v, i, p, kwh);
  } else {
    Serial.printf("[FIREBASE ERROR] HTTP %d: %s\n", httpCode, http.getString().c_str());
  }
  http.end();

  // 2. Also append to historical log /readings/{deviceId}
  String historyUrl = String(FIREBASE_HOST) + "/readings/" + String(DEVICE_ID) + ".json";
  if (strlen(FIREBASE_AUTH_KEY) > 0) {
    historyUrl += "?auth=" + String(FIREBASE_AUTH_KEY);
  }
  http.begin(historyUrl);
  http.addHeader("Content-Type", "application/json");
  http.POST(jsonPayload);
  http.end();
}

// ── Remote Relay Actuator Polling ────────────────────────────────────────────

void pollRelayControlCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String controlUrl = String(FIREBASE_HOST) + "/control/" + String(DEVICE_ID) + ".json";
  if (strlen(FIREBASE_AUTH_KEY) > 0) {
    controlUrl += "?auth=" + String(FIREBASE_AUTH_KEY);
  }

  http.begin(controlUrl);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String resp = http.getString();
    if (resp != "null" && resp.length() > 5) {
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, resp);
      if (!err) {
        const char* cmd = doc["relayCommand"];
        bool executed = doc["executed"] | false;

        if (!executed && cmd != nullptr) {
          if (strcmp(cmd, "DISCONNECT") == 0) {
            Serial.println(F("[RELAY WARNING] EMERGENCY COMMAND RECEIVED: DISCONNECT SUPPLY"));
            digitalWrite(PIN_RELAY_CONTROL, RELAY_OPEN_LEVEL);
            relayStateConnected = false;
          } else if (strcmp(cmd, "CONNECT") == 0) {
            Serial.println(F("[RELAY INFO] COMMAND RECEIVED: RESTORE POWER SUPPLY"));
            digitalWrite(PIN_RELAY_CONTROL, RELAY_ACTIVE_LEVEL);
            relayStateConnected = true;
          }

          // Acknowledge execution back to Firebase
          http.end();
          http.begin(controlUrl);
          http.addHeader("Content-Type", "application/json");
          http.PATCH("{\"executed\":true}");
        }
      }
    }
  }
  http.end();
}

// ── Display & Wi-Fi Helpers ──────────────────────────────────────────────────

void updateLcdDisplay(double v, double i, double p, double kwh) {
  lcd.clear();
  lcdScreenIndex = (lcdScreenIndex + 1) % 3;

  if (lcdScreenIndex == 0) {
    // Screen 1: Voltage & Current
    lcd.setCursor(0, 0);
    lcd.printf("V: %5.1f V", v);
    lcd.setCursor(0, 1);
    lcd.printf("I: %5.2f A", i);
  } else if (lcdScreenIndex == 1) {
    // Screen 2: Power & Energy
    lcd.setCursor(0, 0);
    lcd.printf("P: %5.0f W", p);
    lcd.setCursor(0, 1);
    lcd.printf("E: %5.2f kWh", kwh);
  } else {
    // Screen 3: System Status & Relay
    lcd.setCursor(0, 0);
    lcd.print(F("Status: "));
    if (i < 0.25 && v > 210.0) {
      lcd.print(F("TAMPER!"));
    } else if (v < 5.0) {
      lcd.print(F("FAULT"));
    } else {
      lcd.print(F("NORMAL"));
    }

    lcd.setCursor(0, 1);
    lcd.print(F("Relay: "));
    lcd.print(relayStateConnected ? F("CLOSED") : F("TRIPPED"));
  }
}

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s ...\n", WIFI_SSID);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("Connecting WiFi"));
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP: %s | RSSI: %d dBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("WiFi Connected!"));
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(1500);
  } else {
    Serial.println(F("\n[WIFI ERROR] Connection timed out. Running in standalone mode."));
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(F("WiFi Failed!"));
    lcd.setCursor(0, 1);
    lcd.print(F("Offline Mode"));
    delay(1500);
  }
}
