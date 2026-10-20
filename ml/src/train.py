"""
train.py
─────────────────────────────────────────────────────────────────────────────
Reproducible training and evaluation script for Smart Electricity Theft Detection.

Generates benchmark synthetic energy consumption data, trains the Isolation Forest
model, evaluates precision/recall/ROC-AUC, and persists the model artifacts.
"""

import os
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import pandas as pd
from dataset_generator import generate_energy_dataset
from detector import ElectricityTheftDetector

def run_training_pipeline():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    dataset_path = os.path.join(data_dir, "synthetic_energy_dataset.csv")

    print("=" * 72)
    print(" [*] SMART ELECTRICITY THEFT DETECTION -- ML TRAINING PIPELINE")
    print("=" * 72)

    # 1. Dataset Generation / Loading
    if not os.path.exists(dataset_path):
        print("[*] Generating benchmark synthetic dataset (14 days, 5-min intervals)...")
        df = generate_energy_dataset(n_days=14, sample_interval_minutes=5, contamination_rate=0.08, output_csv_path=dataset_path)
    else:
        print(f"[*] Loading existing dataset from {dataset_path}...")
        df = pd.read_csv(dataset_path)

    print(f"    Total samples: {len(df):,}")
    print(f"    Normal samples: {(df['is_anomaly'] == 0).sum():,} ({((df['is_anomaly'] == 0).mean()*100):.1f}%)")
    print(f"    Anomalous samples: {(df['is_anomaly'] == 1).sum():,} ({((df['is_anomaly'] == 1).mean()*100):.1f}%)")

    # 2. Train / Test Split (Time-series split: first 80% train, last 20% test)
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    print(f"[*] Split: {len(train_df):,} training rows | {len(test_df):,} testing rows")

    # 3. Model Training
    detector = ElectricityTheftDetector(contamination=0.08, random_state=42)
    print("[*] Training Isolation Forest detector...")
    train_meta = detector.train(train_df)
    print(f"[OK] Training complete. Version: {train_meta['version']}")

    # 4. Model Evaluation
    print("\n[*] Evaluating model on unseen test set...")
    metrics = detector.evaluate(test_df)
    print("-" * 50)
    if "roc_auc" in metrics:
        print(f" ROC-AUC Score:      {metrics['roc_auc']:.4f}")
    print(f" Anomaly Precision:  {metrics['precision_anomaly']:.4f}")
    print(f" Anomaly Recall:     {metrics['recall_anomaly']:.4f}")
    print(f" Anomaly F1-Score:   {metrics['f1_anomaly']:.4f}")
    print(f" Overall Accuracy:   {metrics['accuracy']:.4f}")
    print(f" Confusion Matrix:   {metrics['confusion_matrix']}")
    print("-" * 50)

    # 5. Model Persistence
    print(f"[*] Saving model artifacts to {models_dir}...")
    detector.save(models_dir)
    print(f"[OK] Saved isolation_forest.joblib and scaler.joblib successfully.")
    print("=" * 72)

    return metrics

if __name__ == "__main__":
    run_training_pipeline()
