# ml/

This folder is reserved for the **AI/ML Anomaly Detection** module of Smart Electricity Theft Detection.

## Purpose

This module uses machine learning to identify abnormal electricity consumption patterns that may indicate theft, tampering, or meter bypass.

## Planned Pipeline

1. **Data Preparation**
   - Fetch historical sensor readings from Firebase
   - Clean, normalize, and feature-engineer the time-series data
   - Label normal vs. anomalous periods

2. **Model Training**
   - Train anomaly detection models (e.g., Isolation Forest, Autoencoder, LSTM)
   - Evaluate precision, recall, and F1-score on test data
   - Export trained model for inference

3. **Prediction & Inference**
   - Score incoming readings in real time or in batch
   - Output anomaly probability / risk score per reading

4. **Risk Scoring**
   - Assign LOW / MEDIUM / HIGH theft risk labels
   - Trigger Firebase alerts when risk exceeds threshold

## Planned Stack

- **Language:** Python 3
- **Libraries:** scikit-learn, TensorFlow / PyTorch, pandas, numpy
- **Data Source:** Firebase Realtime Database / Firestore
- **Model Export:** ONNX / TensorFlow Lite (for potential on-device inference)

## Planned Folder Layout

```
ml/
├── data/           # Raw and processed datasets
├── notebooks/      # Exploratory data analysis (Jupyter)
├── models/         # Trained model files
├── src/            # Training and inference scripts
└── README.md
```

## Status

> 🔧 Not yet implemented. Placeholder only.
