# ESP32 Hardware Setup, Wiring & Calibration Guide
**Project:** Smart Electricity Theft Detection  
**Module:** `firmware/` & `docs/`  
**Revision:** 1.0.0

---

## ⚠️ CRITICAL ELECTRICAL SAFETY MANDATE

> [!CAUTION]
> **MAINS VOLTAGE (220V–240V AC) CAN BE LETHAL.**
> - **NEVER** wire exposed mains voltage on an uninsulated breadboard or direct to your computer's USB port.
> - **NEVER** touch exposed AC terminals while energized.
> - Always perform bench development and software testing using the **Sensor Simulator** (`simulator/`) or a safe **low-voltage AC adapter (e.g. 12V AC step-down transformer)** with fused protection.
> - Ensure all AC mains wiring uses properly rated terminal blocks, insulated junction boxes, and an appropriate upstream fuse or MCB (Miniature Circuit Breaker).
> - Any mains-side wiring must be inspected and verified by a qualified technician.

---

## 1. Component Specifications

| Component | Function | Operating Voltage | Interface |
|---|---|---|---|
| **ESP32 DevKit V1** | Central MCU & Wi-Fi Gateway | 5V DC (USB or VIN) | 3.3V Logic |
| **ZMPT101B Module** | AC Voltage Sensor (Transformer isolated) | 5V DC | Analog (ADC1_CH6 / GPIO 34) |
| **ACS712-30A Module** | Hall-Effect AC Current Sensor | 5V DC | Analog (ADC1_CH7 / GPIO 35) |
| **16x2 LCD + PCF8574** | Local Real-Time Display | 5V DC | I2C (SDA=GPIO 21, SCL=GPIO 22) |
| **1-Channel Relay** | Remote Supply Cutoff Actuator | 5V DC | Digital (GPIO 26, Active-Low) |
| **Status LED** | Cloud Sync / Pulse Heartbeat | 3.3V DC | Built-in (GPIO 2) |

---

## 2. Complete Wiring & Pinout Table

### Sensor & Actuator to ESP32 Connections:

| Module Pin | Connects to ESP32 Pin | Wire / Note |
|---|---|---|
| **ZMPT101B VCC** | `5V` (or `VIN`) | Sensor Power |
| **ZMPT101B GND** | `GND` | Common Ground |
| **ZMPT101B OUT** | `GPIO 34` | ADC1 Channel 6 (Input Only, Wi-Fi safe) |
| **ACS712 VCC** | `5V` (or `VIN`) | Sensor Power |
| **ACS712 GND** | `GND` | Common Ground |
| **ACS712 OUT** | `GPIO 35` | ADC1 Channel 7 (Input Only, Wi-Fi safe) |
| **LCD VCC** | `5V` | Display Power |
| **LCD GND** | `GND` | Common Ground |
| **LCD SDA** | `GPIO 21` | ESP32 Hardware I2C Data |
| **LCD SCL** | `GPIO 22` | ESP32 Hardware I2C Clock |
| **Relay VCC** | `5V` | Coil Power |
| **Relay GND** | `GND` | Common Ground |
| **Relay IN** | `GPIO 26` | Active-Low Trigger |

> [!IMPORTANT]
> **Why GPIO 34 & GPIO 35?**  
> The ESP32's ADC2 channels are multiplexed with the internal Wi-Fi radio and fail when Wi-Fi is active. ADC1 channels (`GPIO 32 - 39`) operate independently and are 100% reliable during Wi-Fi transmission.

---

## 3. Sensor Calibration Procedure

### A. ZMPT101B AC Voltage Calibration
1. Measure the utility line voltage using a calibrated digital multimeter (e.g. $230.5\text{ V}$).
2. Turn the multi-turn trimpot on the ZMPT101B module until the output sine wave amplitude does not clip the $0 - 3.3\text{V}$ ADC input range.
3. Compare the serial monitor output with the multimeter:
   $$\text{Calibration Factor} = \frac{V_{\text{Multimeter}}}{V_{\text{ESP32}}} \times \text{Current Factor}$$
4. Adjust `VOLTAGE_CALIBRATION` in `config.h`.

### B. ACS712 AC Current Calibration
1. Connect a known resistive load (such as a 100W incandescent lamp: $I = \frac{100\text{W}}{230\text{V}} \approx 0.435\text{A}$).
2. The zero-current offset should sit around $V_{\text{CC}} / 2 \approx 1.65\text{V}$ (approx. 2048 counts).
3. Confirm sensitivity based on your module model:
   - ACS712-05B: $185\text{ mV/A}$ (`0.185`)
   - ACS712-20A: $100\text{ mV/A}$ (`0.100`)
   - ACS712-30A: $66\text{ mV/A}$ (`0.066`)

---

## 4. PlatformIO / Arduino IDE Build Guide

### Required Libraries (Install via Arduino Library Manager):
1. `LiquidCrystal_I2C` by Frank de Brabander
2. `ArduinoJson` by Benoit Blanchon (version 6.x or 7.x)

### Steps to Flash Firmware:
1. Copy `firmware/esp32_theft_detector/config.h.example` to `firmware/esp32_theft_detector/config.h`.
2. Set `WIFI_SSID` and `WIFI_PASSWORD`.
3. Set `DEVICE_ID` (e.g. `METER-001`).
4. Select Board: **DOIT ESP32 DEVKIT V1**.
5. Upload Speed: `921600`.
6. Click **Upload** and open Serial Monitor at **115200 baud**.
