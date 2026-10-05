# firmware/

This folder is reserved for the **ESP32 Firmware** of Smart Electricity Theft Detection.

## Purpose

The firmware runs on the ESP32 microcontroller and is responsible for reading sensor data, displaying it locally, and sending it to Firebase Cloud for analysis.

## Planned Hardware Integration

| Component | Role |
|---|---|
| **ACS712 Current Sensor** | Read AC current from the electrical line |
| **ZMPT101B Voltage Sensor** | Read AC voltage from the electrical line |
| **Energy Meter** | Calculate and accumulate energy usage (kWh) |
| **16x2 LCD Display** | Show real-time readings on the device locally |
| **Relay Module** | Cut or restore power supply on command |
| **Wi-Fi (ESP32 built-in)** | Connect to the internet for cloud sync |

## Planned Features

- Analog sensor reading with ADC calibration
- RMS calculation for current and voltage
- Real power and energy (kWh) computation
- LCD display of live readings
- Firebase Realtime Database push over Wi-Fi
- Relay control via Firebase remote commands
- Watchdog timer and reconnection logic

## Planned Language & Tools

- **Language:** C++ (Arduino framework)
- **IDE:** PlatformIO / Arduino IDE
- **Libraries:** FirebaseESP32, LiquidCrystal_I2C, ArduinoJson

## Status

> 🔧 Not yet implemented. Placeholder only.
