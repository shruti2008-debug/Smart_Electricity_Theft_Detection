"""
dataset_generator.py
─────────────────────────────────────────────────────────────────────────────
Synthetic training dataset generator for Smart Electricity Theft Detection ML models.

Generates reproducible multi-day time-series readings with circadian normal
profiles and calibrated electricity theft anomalies.
"""

import math
import random
import os
import pandas as pd
import numpy as np

def generate_energy_dataset(
    n_days: int = 14,
    sample_interval_minutes: int = 5,
    contamination_rate: float = 0.08,
    random_seed: int = 42,
    output_csv_path: str = None,
) -> pd.DataFrame:
    random.seed(random_seed)
    np.random.seed(random_seed)

    records = []
    total_steps = int(n_days * 24 * (60 / sample_interval_minutes))
    base_timestamp = 1728000000.0  # Reference epoch time

    cumulative_kwh = 50.0

    for step in range(total_steps):
        current_time = base_timestamp + step * (sample_interval_minutes * 60)
        time_struct = time_struct = pd.to_datetime(current_time, unit="s")
        hour = time_struct.hour + time_struct.minute / 60.0

        # Circadian domestic consumption model
        morning_peak = math.exp(-((hour - 8.0) ** 2) / 6.0)
        evening_peak = math.exp(-((hour - 20.0) ** 2) / 8.0)
        night_trough = 0.15 + 0.1 * math.sin((hour - 6.0) * math.pi / 12.0)
        demand_factor = max(0.15, night_trough + 0.6 * morning_peak + 0.8 * evening_peak)

        voltage = 230.0 + random.gauss(0.0, 2.5)
        frequency = 50.0 + random.gauss(0.0, 0.04)
        power_factor = min(0.99, max(0.85, 0.94 + random.gauss(0.0, 0.02)))
        current = (demand_factor * 8.0) + random.uniform(0.5, 3.5)

        is_anomaly = 0
        anomaly_type = "NORMAL"

        # Inject realistic anomalies according to contamination rate
        if random.random() < contamination_rate:
            is_anomaly = 1
            scenario_choice = random.choice([
                "METER_BYPASS",
                "OFF_PEAK_SPIKE",
                "LINE_TAPPING",
                "SENSOR_FAULT"
            ])
            anomaly_type = scenario_choice

            if scenario_choice == "METER_BYPASS":
                # Current drops to near-zero during typical usage hours
                current = random.uniform(0.05, 0.25)
            elif scenario_choice == "OFF_PEAK_SPIKE":
                # Off-peak hours (1 AM - 5 AM) experience industrial load
                current = random.uniform(22.0, 35.0)
                power_factor = random.uniform(0.70, 0.82)
            elif scenario_choice == "LINE_TAPPING":
                voltage = voltage - random.uniform(15.0, 25.0)
                current = (demand_factor * 2.0) + random.uniform(0.2, 0.7)
                power_factor = random.uniform(0.60, 0.74)
            elif scenario_choice == "SENSOR_FAULT":
                voltage = 0.0 if random.random() < 0.5 else 320.0
                current = 0.0 if voltage == 0.0 else random.uniform(45.0, 60.0)

        # Physics active power
        power = round(voltage * current * power_factor, 2)
        voltage = round(voltage, 2)
        current = round(current, 2)
        power_factor = round(power_factor, 2)
        frequency = round(frequency, 2)

        dt_hours = sample_interval_minutes / 60.0
        cumulative_kwh += (power * dt_hours) / 1000.0

        records.append({
            "timestamp": int(current_time * 1000),
            "hour_of_day": round(hour, 2),
            "voltage": voltage,
            "current": current,
            "power": power,
            "power_factor": power_factor,
            "frequency": frequency,
            "energy_kwh": round(cumulative_kwh, 4),
            "apparent_power": round(voltage * current, 2),
            "is_anomaly": is_anomaly,
            "anomaly_type": anomaly_type,
        })

    df = pd.DataFrame(records)

    if output_csv_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
        df.to_csv(output_csv_path, index=False)
        print(f"[OK] Generated {len(df)} samples ({df['is_anomaly'].sum()} anomalies) -> {output_csv_path}")

    return df

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, "..", "data", "synthetic_energy_dataset.csv")
    generate_energy_dataset(n_days=14, output_csv_path=output_path)
