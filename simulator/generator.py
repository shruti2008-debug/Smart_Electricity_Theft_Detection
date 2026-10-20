"""
generator.py
─────────────────────────────────────────────────────────────────────────────
Synthetic sensor data generation engine for Smart Electricity Theft Detection.

Generates realistic AC voltage (220-240V nominal), current (0.5-25A), active power (W),
power factor, grid frequency (50Hz), and cumulative energy (kWh).
Supports simulated scenarios:
  1. NORMAL: Circadian domestic consumption with random appliance duty cycles.
  2. METER_BYPASS: Theft scenario where load continues but measured current drops near zero.
  3. OFF_PEAK_SPIKE: Suspicious heavy draw during late night (e.g., unauthorized mining/factory).
  4. LINE_TAPPING: Upstream line tapping causing severe power factor distortion and unmetered drop.
  5. SENSOR_FAULT: Hardware sensor failure (clamped to 0V or negative/unrealistic values).
  6. VOLTAGE_SAG_SURGE: Grid instability (brownout / overvoltage condition).
"""

import math
import random
import time
from typing import Dict, Any, Optional

class SensorDataGenerator:
    def __init__(self, device_id: str = "SIM-001", nominal_voltage: float = 230.0, base_energy_kwh: float = 125.4):
        self.device_id = device_id
        self.nominal_voltage = nominal_voltage
        self.cumulative_energy_kwh = base_energy_kwh
        self.last_timestamp = time.time()

    def generate_reading(self, scenario: str = "NORMAL", custom_time: Optional[float] = None) -> Dict[str, Any]:
        current_time = custom_time if custom_time is not None else time.time()
        dt_hours = max(0.0, (current_time - self.last_timestamp) / 3600.0)
        self.last_timestamp = current_time

        # Hour of day (0 - 23.99)
        time_struct = time.localtime(current_time)
        hour = time_struct.tm_hour + time_struct.tm_min / 60.0

        # Circadian base current factor: lowest at 3 AM (0.2), peak at 8 AM (0.8) and 8 PM (1.0)
        morning_peak = math.exp(-((hour - 8.0) ** 2) / 6.0)
        evening_peak = math.exp(-((hour - 20.0) ** 2) / 8.0)
        night_trough = 0.15 + 0.1 * math.sin((hour - 6.0) * math.pi / 12.0)
        base_demand_factor = max(0.15, night_trough + 0.6 * morning_peak + 0.8 * evening_peak)

        # Baseline AC Voltage with small grid fluctuations (226 - 234 V)
        voltage = self.nominal_voltage + random.gauss(0.0, 2.5)
        frequency = 50.0 + random.gauss(0.0, 0.05)
        power_factor = min(0.99, max(0.85, 0.94 + random.gauss(0.0, 0.02)))
        status = "NORMAL"
        scenario_upper = scenario.upper()

        if scenario_upper == "NORMAL":
            # Normal domestic appliance load (1.0A to 12.0A typical)
            current = (base_demand_factor * 8.0) + random.uniform(0.5, 3.5)
            # Occasional refrigeration or AC cycle burst
            if random.random() < 0.2:
                current += random.uniform(2.0, 5.0)

        elif scenario_upper == "METER_BYPASS":
            # Theft Scenario: Physical meter bypass / shunt resistor applied.
            # Real load is active, but meter reads tiny trickle current (0.05A - 0.25A).
            current = random.uniform(0.05, 0.28)
            status = "TAMPERED"

        elif scenario_upper == "OFF_PEAK_SPIKE":
            # Theft / Suspicious Scenario: Huge unauthorized industrial/commercial draw (18A - 32A)
            current = random.uniform(18.0, 32.0)
            power_factor = random.uniform(0.72, 0.85)  # Inductive machinery
            status = "SUSPICIOUS"

        elif scenario_upper == "LINE_TAPPING":
            # Upstream illegal hook / partial bypass: erratic current with harmonic distortion
            current = (base_demand_factor * 1.5) + random.uniform(0.2, 0.8)
            voltage = voltage - random.uniform(12.0, 25.0)  # Heavy line drop
            power_factor = random.uniform(0.60, 0.75)
            status = "TAMPERED"

        elif scenario_upper == "SENSOR_FAULT":
            # Hardware failure: ACS712 disconnected or ZMPT101B failure
            voltage = 0.0 if random.random() < 0.5 else 320.0
            current = 0.0 if voltage == 0.0 else random.uniform(45.0, 60.0)
            status = "FAULT"

        elif scenario_upper in ["VOLTAGE_SAG", "VOLTAGE_SURGE"]:
            if scenario_upper == "VOLTAGE_SAG":
                voltage = random.uniform(150.0, 185.0)
            else:
                voltage = random.uniform(265.0, 290.0)
            current = (base_demand_factor * 5.0) + random.uniform(1.0, 3.0)
            status = "SUSPICIOUS"

        else:
            # Fallback normal
            current = (base_demand_factor * 6.0) + random.uniform(0.5, 2.5)

        # Physics calculation: Active Power P = V * I * PF
        voltage = max(0.0, round(voltage, 2))
        current = max(0.0, round(current, 2))
        power_factor = round(power_factor, 2)
        power = round(voltage * current * power_factor, 2)
        frequency = round(frequency, 2)

        # Accumulate energy in kWh
        energy_increment_kwh = (power * dt_hours) / 1000.0
        self.cumulative_energy_kwh += energy_increment_kwh
        cumulative_kwh = round(self.cumulative_energy_kwh, 4)

        return {
            "deviceId": self.device_id,
            "timestamp": int(current_time * 1000),  # Epoch ms
            "voltage": voltage,
            "current": current,
            "power": power,
            "energy_kwh": cumulative_kwh,
            "power_factor": power_factor,
            "frequency": frequency,
            "status": status,
            "source": "simulator",
            "scenario": scenario_upper,
        }
