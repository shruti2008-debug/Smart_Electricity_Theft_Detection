"""
main.py
─────────────────────────────────────────────────────────────────────────────
CLI Entry Point for the Smart Electricity Theft Detection Sensor Simulator.

Usage:
  python main.py --dry-run
  python main.py --scenario METER_BYPASS --dry-run
  python main.py --device SIM-001 --interval 2 --duration 60 --dry-run
  python main.py --device SIM-001 --auth-token "<ID_TOKEN>"
"""

import argparse
import sys
import time

# Ensure safe UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from generator import SensorDataGenerator
from firebase_client import FirebaseRtdbClient, DEFAULT_RTDB_URL

SCENARIOS = [
    "NORMAL",
    "METER_BYPASS",
    "OFF_PEAK_SPIKE",
    "LINE_TAPPING",
    "SENSOR_FAULT",
    "VOLTAGE_SAG",
]

def parse_args():
    parser = argparse.ArgumentParser(
        description="Smart Electricity Theft Detection - Sensor Data Simulator",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--device", default="SIM-001", help="Target Device ID")
    parser.add_argument("--interval", type=float, default=3.0, help="Reading interval in seconds")
    parser.add_argument("--duration", type=float, default=30.0, help="Simulation duration (0 = run forever)")
    parser.add_argument(
        "--scenario",
        default="NORMAL",
        choices=SCENARIOS,
        help="Simulated electrical scenario",
    )
    parser.add_argument("--rtdb-url", default=DEFAULT_RTDB_URL, help="Firebase RTDB URL")
    parser.add_argument("--auth-token", default=None, help="Firebase Auth ID Token")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run simulator locally without pushing to Firebase",
    )
    return parser.parse_args()

def main():
    args = parse_args()
    print("=" * 72)
    print(" [*] SMART ELECTRICITY THEFT DETECTION -- SENSOR SIMULATOR")
    print("=" * 72)
    print(f" Target Device:    {args.device}")
    print(f" Reading Interval: {args.interval}s")
    print(f" Total Duration:   {args.duration}s (0 = continuous)")
    print(f" Initial Scenario: {args.scenario}")
    print(f" Operating Mode:   {'DRY RUN (Local only)' if args.dry_run else 'FIREBASE CLOUD PUSH'}")
    if not args.dry_run:
        print(f" RTDB URL:         {args.rtdb_url}")
    print("-" * 72)

    generator = SensorDataGenerator(device_id=args.device)
    client = FirebaseRtdbClient(
        database_url=args.rtdb_url,
        auth_token=args.auth_token,
        dry_run=args.dry_run,
    )

    # Register/Heartbeat device
    try:
        client.register_or_update_device(args.device, name=f"Simulated Meter ({args.device})")
        print(f"[OK] Device '{args.device}' registered/heartbeat initialized.")
    except Exception as e:
        print(f"[WARN] Device registration notice: {e}")
        if not args.dry_run:
            print("  (Tip: Run with --dry-run to test locally without remote database rules)")

    start_time = time.time()
    count = 0

    print("\nStarting data transmission... (Press Ctrl+C to terminate)\n")
    print(f"{'Time':<10} | {'Scenario':<14} | {'Voltage':<8} | {'Current':<8} | {'Power':<9} | {'Energy':<10} | {'Status'}")
    print("-" * 76)

    try:
        while True:
            reading = generator.generate_reading(scenario=args.scenario)
            count += 1

            t_str = time.strftime("%H:%M:%S", time.localtime(reading["timestamp"] / 1000))
            print(
                f"{t_str:<10} | {reading['scenario']:<14} | {reading['voltage']:>6.1f} V | "
                f"{reading['current']:>6.2f} A | {reading['power']:>7.1f} W | "
                f"{reading['energy_kwh']:>8.4f} kWh | {reading['status']}"
            )

            if not args.dry_run:
                try:
                    client.push_reading(reading)
                except PermissionError as pe:
                    print(f"\n[PERMISSION_DENIED] {pe}")
                    print("Aborting cloud push. Please verify Firebase Authentication or database rules.")
                    break
                except Exception as ex:
                    print(f"[WARN] Transmission error: {ex}")

            if args.duration > 0 and (time.time() - start_time) >= args.duration:
                print(f"\n[OK] Duration limit ({args.duration}s) reached.")
                break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n\nSimulation stopped by user.")

    print(f"\nSummary: Generated {count} readings for device '{args.device}'.")
    print("=" * 72)

if __name__ == "__main__":
    main()
