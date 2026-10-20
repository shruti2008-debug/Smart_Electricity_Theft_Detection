"""
test_ml.py
─────────────────────────────────────────────────────────────────────────────
Unit tests for Machine Learning and Anomaly Detection components.
"""

import unittest
import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from dataset_generator import generate_energy_dataset
from detector import ElectricityTheftDetector
from service import MlAnomalyService

class TestMlModule(unittest.TestCase):
    def test_dataset_generation(self):
        df = generate_energy_dataset(n_days=1, sample_interval_minutes=15, contamination_rate=0.1)
        self.assertGreater(len(df), 50)
        self.assertIn("voltage", df.columns)
        self.assertIn("current", df.columns)
        self.assertIn("power", df.columns)
        self.assertIn("is_anomaly", df.columns)
        self.assertTrue((df["is_anomaly"].isin([0, 1])).all())

    def test_rule_based_meter_bypass(self):
        detector = ElectricityTheftDetector()
        reading = {
            "voltage": 230.0,
            "current": 0.15,
            "power": 30.0,
            "power_factor": 0.90,
            "timestamp": 1728000000000,
        }
        score, risk, status, explanation = detector.calculate_risk_score(reading)
        self.assertGreaterEqual(score, 65.0)
        self.assertEqual(risk, "HIGH")
        self.assertEqual(status, "TAMPERED")
        self.assertIn("Bypass", explanation)

    def test_rule_based_sensor_fault(self):
        detector = ElectricityTheftDetector()
        reading = {
            "voltage": 0.0,
            "current": 0.0,
            "power": 0.0,
            "power_factor": 0.0,
        }
        score, risk, status, explanation = detector.calculate_risk_score(reading)
        self.assertGreaterEqual(score, 90.0)
        self.assertEqual(risk, "HIGH")
        self.assertEqual(status, "FAULT")

    def test_service_dry_run_deduplication(self):
        service = MlAnomalyService(dry_run=True, cooldown_seconds=60.0)
        sample = {
            "deviceId": "TEST-01",
            "timestamp": 1000,
            "voltage": 230.0,
            "current": 0.1,
            "power": 20.0,
        }
        # First process
        res1 = service.process_device_reading("TEST-01", sample)
        self.assertIsNotNone(res1)
        self.assertEqual(res1["status"], "TAMPERED")

        # Second process with same timestamp should be skipped (idempotent)
        res2 = service.process_device_reading("TEST-01", sample)
        self.assertIsNone(res2)

if __name__ == "__main__":
    unittest.main()
