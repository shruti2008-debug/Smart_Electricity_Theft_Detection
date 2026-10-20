"""
test_simulator.py
─────────────────────────────────────────────────────────────────────────────
Automated unit tests for the sensor data generator and Firebase client.
"""

import unittest
from generator import SensorDataGenerator
from firebase_client import FirebaseRtdbClient

class TestSensorSimulator(unittest.TestCase):
    def setUp(self):
        self.generator = SensorDataGenerator(device_id="TEST-METER-01")

    def test_schema_conformance(self):
        reading = self.generator.generate_reading(scenario="NORMAL")
        required_keys = [
            "deviceId",
            "timestamp",
            "voltage",
            "current",
            "power",
            "energy_kwh",
            "power_factor",
            "frequency",
            "status",
            "source",
        ]
        for key in required_keys:
            self.assertIn(key, reading, f"Missing required key: {key}")

        self.assertEqual(reading["deviceId"], "TEST-METER-01")
        self.assertEqual(reading["source"], "simulator")
        self.assertGreater(reading["timestamp"], 0)

    def test_physics_power_calculation(self):
        reading = self.generator.generate_reading(scenario="NORMAL")
        expected_power = reading["voltage"] * reading["current"] * reading["power_factor"]
        # Allow 0.05W tolerance for floating point rounding
        self.assertAlmostEqual(reading["power"], expected_power, delta=0.05)

    def test_meter_bypass_scenario(self):
        reading = self.generator.generate_reading(scenario="METER_BYPASS")
        self.assertEqual(reading["status"], "TAMPERED")
        self.assertLess(reading["current"], 0.5, "Bypass current should be tiny trickle")

    def test_off_peak_spike_scenario(self):
        reading = self.generator.generate_reading(scenario="OFF_PEAK_SPIKE")
        self.assertEqual(reading["status"], "SUSPICIOUS")
        self.assertGreaterEqual(reading["current"], 15.0, "Spike current should be heavy draw")

    def test_sensor_fault_scenario(self):
        reading = self.generator.generate_reading(scenario="SENSOR_FAULT")
        self.assertEqual(reading["status"], "FAULT")

    def test_dry_run_client(self):
        client = FirebaseRtdbClient(dry_run=True)
        reading = self.generator.generate_reading()
        res = client.push_reading(reading)
        self.assertTrue(res["latest"]["dry_run"])
        self.assertTrue(res["history"]["dry_run"])

if __name__ == "__main__":
    unittest.main()
