"""
detector.py
─────────────────────────────────────────────────────────────────────────────
AI/ML Anomaly & Electricity Theft Detection Engine.

Implements an anomaly detection pipeline combined with electrical domain rules.
Architecture:
  - Primary Engine: scikit-learn Isolation Forest (when available).
  - Built-in Engine: Statistical Multivariate Z-score & Robust Covariance (numpy).
  - Physical Rules Engine: Instant detection for meter bypass, line tampering,
    sensor fault, and off-peak unauthorized surges.

Outputs:
  - Anomaly Risk Score: 0.0 to 100.0
  - Risk Level: LOW (0-30), MEDIUM (31-65), HIGH (66-100)
  - Operating Status: NORMAL, SUSPICIOUS, TAMPERED, FAULT
"""

import os
import time
import pickle
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

# Attempt to import scikit-learn; if not yet installed, fallback to numpy engine
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

FEATURE_COLUMNS = [
    "voltage",
    "current",
    "power",
    "power_factor",
    "apparent_power",
    "hour_of_day",
]

class ElectricityTheftDetector:
    def __init__(self, contamination: float = 0.08, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.is_trained = False
        self.has_sklearn = HAS_SKLEARN
        self.model_version = "iso-forest-v1.0" if HAS_SKLEARN else "multivariate-stat-v1.0"

        # Model parameters
        self.feature_means = None
        self.feature_stds = None
        self.threshold = 3.0

        if HAS_SKLEARN:
            self.scaler = StandardScaler()
            self.model = IsolationForest(
                n_estimators=100,
                contamination=contamination,
                random_state=random_state,
                n_jobs=1,
            )
        else:
            self.scaler = None
            self.model = None

    def _extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        features = df.copy()
        if "apparent_power" not in features.columns:
            features["apparent_power"] = features["voltage"] * features["current"]
        if "hour_of_day" not in features.columns and "timestamp" in features.columns:
            features["hour_of_day"] = pd.to_datetime(features["timestamp"], unit="ms").dt.hour
        return features[FEATURE_COLUMNS]

    def train(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train anomaly detector on baseline data."""
        X = self._extract_features(df).values.astype(float)

        self.feature_means = np.mean(X, axis=0)
        self.feature_stds = np.std(X, axis=0)
        self.feature_stds[self.feature_stds == 0] = 1.0  # Avoid zero division

        if self.has_sklearn:
            X_scaled = self.scaler.fit_transform(X)
            self.model.fit(X_scaled)
        else:
            # Calibrate statistical threshold to contamination percentile
            norm_X = (X - self.feature_means) / self.feature_stds
            distances = np.linalg.norm(norm_X, axis=1)
            self.threshold = float(np.percentile(distances, (1.0 - self.contamination) * 100))

        self.is_trained = True

        return {
            "samples_trained": len(df),
            "features": FEATURE_COLUMNS,
            "engine": "scikit-learn (Isolation Forest)" if self.has_sklearn else "numpy (Multivariate Z-Score)",
            "contamination": self.contamination,
            "version": self.model_version,
        }

    def evaluate(self, test_df: pd.DataFrame) -> Dict[str, Any]:
        """Evaluate model against ground truth labels."""
        if not self.is_trained:
            raise RuntimeError("Model must be trained prior to evaluation.")

        X = self._extract_features(test_df).values.astype(float)
        y_true = test_df["is_anomaly"].values.astype(int)

        if self.has_sklearn:
            X_scaled = self.scaler.transform(X)
            preds = self.model.predict(X_scaled)
            pred_binary = (preds == -1).astype(int)
            scores = -self.model.decision_function(X_scaled)
        else:
            norm_X = (X - self.feature_means) / self.feature_stds
            distances = np.linalg.norm(norm_X, axis=1)
            pred_binary = (distances >= self.threshold).astype(int)
            scores = distances

        # Calculate metrics
        tp = int(np.sum((y_true == 1) & (pred_binary == 1)))
        fp = int(np.sum((y_true == 0) & (pred_binary == 1)))
        fn = int(np.sum((y_true == 1) & (pred_binary == 0)))
        tn = int(np.sum((y_true == 0) & (pred_binary == 0)))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / len(y_true) if len(y_true) > 0 else 0.0

        return {
            "precision_anomaly": round(precision, 4),
            "recall_anomaly": round(recall, 4),
            "f1_anomaly": round(f1, 4),
            "accuracy": round(accuracy, 4),
            "confusion_matrix": [[tn, fp], [fn, tp]],
        }

    def calculate_risk_score(self, reading: Dict[str, Any]) -> Tuple[float, str, str, str]:
        """
        Calculates 0-100 risk score and combines ML model with domain rules.
        Returns: (risk_score, risk_level, status, explanation)
        """
        voltage = float(reading.get("voltage", 230.0))
        current = float(reading.get("current", 0.0))
        power = float(reading.get("power", 0.0))
        pf = float(reading.get("power_factor", 0.95))
        timestamp = reading.get("timestamp", int(time.time() * 1000))

        # ── 1. Critical Electrical Domain Rules ──────────────────────────────
        # Hardware fault
        if voltage <= 5.0 or voltage >= 320.0 or current >= 45.0:
            return 98.0, "HIGH", "FAULT", "Sensor readings outside electrical operating envelope (Sensor Fault)."

        # Meter bypass: nominal voltage but near-zero current draw
        if current < 0.28 and voltage >= 210.0:
            return 88.0, "HIGH", "TAMPERED", "Uncharacteristically low current draw detected (Possible Meter Bypass)."

        # Severe line tapping: voltage drop with distorted PF
        if voltage < 205.0 and pf < 0.72:
            return 82.0, "HIGH", "TAMPERED", "Significant line voltage drop and phase distortion (Possible Line Tapping)."

        # Off-peak night surge (1 AM to 5 AM with > 20A)
        hour = time.localtime(timestamp / 1000).tm_hour
        if 1 <= hour <= 5 and current >= 20.0:
            return 78.0, "HIGH", "SUSPICIOUS", "Heavy unauthorized power surge during off-peak night window."

        # ── 2. Statistical / Machine Learning Engine ─────────────────────────
        if self.is_trained:
            apparent_power = voltage * current
            feature_vec = np.array([voltage, current, power, pf, apparent_power, hour], dtype=float)

            if self.has_sklearn:
                X_scaled = self.scaler.transform(feature_vec.reshape(1, -1))
                dec_score = float(self.model.decision_function(X_scaled)[0])
                normalized_score = 50.0 - (dec_score * 125.0)
            else:
                norm_vec = (feature_vec - self.feature_means) / self.feature_stds
                dist = float(np.linalg.norm(norm_vec))
                # Map Euclidean distance to 0-100 score relative to calibrated threshold
                ratio = dist / max(0.1, self.threshold)
                normalized_score = min(95.0, max(5.0, ratio * 50.0))

            normalized_score = min(95.0, max(5.0, normalized_score))
        else:
            normalized_score = 15.0

        risk_score = round(normalized_score, 1)

        if risk_score >= 66.0:
            return risk_score, "HIGH", "TAMPERED", "Statistical anomaly pattern detected indicative of theft."
        elif risk_score >= 31.0:
            return risk_score, "MEDIUM", "SUSPICIOUS", "Unusual consumption deviation from historical baseline."
        else:
            return risk_score, "LOW", "NORMAL", "Consumption within nominal domestic baseline."

    def save(self, model_dir: str):
        os.makedirs(model_dir, exist_ok=True)
        meta = {
            "version": self.model_version,
            "contamination": self.contamination,
            "has_sklearn": self.has_sklearn,
            "feature_means": self.feature_means,
            "feature_stds": self.feature_stds,
            "threshold": self.threshold,
        }
        with open(os.path.join(model_dir, "metadata.pkl"), "wb") as f:
            pickle.dump(meta, f)

        if self.has_sklearn and self.model is not None:
            with open(os.path.join(model_dir, "isolation_forest.pkl"), "wb") as f:
                pickle.dump(self.model, f)
            with open(os.path.join(model_dir, "scaler.pkl"), "wb") as f:
                pickle.dump(self.scaler, f)

    def load(self, model_dir: str):
        with open(os.path.join(model_dir, "metadata.pkl"), "rb") as f:
            meta = pickle.load(f)

        self.model_version = meta.get("version", "theft-detect-v1.0")
        self.contamination = meta.get("contamination", 0.08)
        self.feature_means = meta.get("feature_means")
        self.feature_stds = meta.get("feature_stds")
        self.threshold = meta.get("threshold", 3.0)
        self.has_sklearn = meta.get("has_sklearn", False)

        iso_path = os.path.join(model_dir, "isolation_forest.pkl")
        scaler_path = os.path.join(model_dir, "scaler.pkl")
        if os.path.exists(iso_path) and os.path.exists(scaler_path) and HAS_SKLEARN:
            with open(iso_path, "rb") as f:
                self.model = pickle.load(f)
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            self.has_sklearn = True

        self.is_trained = True
