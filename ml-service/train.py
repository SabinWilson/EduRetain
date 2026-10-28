import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix
)
from shap.explainers import Tree as TreeExplainer

from utils import FEATURE_NAMES, FEATURE_METADATA

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

DEFAULT_CSV_PATH = os.path.join(DATA_DIR, "synthetic_students.csv")
MODEL_PATH = os.path.join(MODELS_DIR, "model.joblib")
METRICS_PATH = os.path.join(MODELS_DIR, "metadata.json")


def generate_synthetic_dataset(n_samples: int = 2000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic dataset (~2000 records) with ~15% dropout rate.
    Features have realistic correlation with academic distress and noise.
    """
    np.random.seed(random_state)

    years = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.30, 0.28, 0.24, 0.18])
    semesters = (years * 2) - np.random.choice([0, 1], size=n_samples, p=[0.5, 0.5])

    # Latent distress factor (0 = top student, 1 = severely distressed)
    distress = np.random.beta(a=1.5, b=5.0, size=n_samples)

    # Attendance: distressed students have lower attendance & negative trend
    avg_attendance = np.clip(92.0 - (distress * 48.0) + np.random.normal(0, 6.0, size=n_samples), 35.0, 99.0)
    attendance_trend = np.clip(-(distress * 20.0) + np.random.normal(0, 4.0, size=n_samples), -28.0, 18.0)

    # GPA: 10-point scale
    avg_gpa = np.clip(9.0 - (distress * 5.5) + np.random.normal(0, 0.5, size=n_samples), 2.2, 9.9)
    gpa_trend = np.clip(-(distress * 1.8) + np.random.normal(0, 0.35, size=n_samples), -2.5, 1.8)

    # Backlogs: heavily concentrated in distressed students
    backlog_lambda = np.clip((distress ** 1.8) * 4.5, 0.05, 5.0)
    backlog_count = np.random.poisson(backlog_lambda)
    backlog_count = np.clip(backlog_count, 0, 8)

    # Assignment miss rate: distressed students miss more assignments
    assignment_miss_rate = np.clip((distress * 0.75) + np.random.normal(0, 0.08, size=n_samples), 0.0, 0.95)

    # LMS logins (per week) and LMS time spent (minutes per week)
    lms_login_frequency = np.clip(16.0 - (distress * 13.0) + np.random.normal(0, 2.0, size=n_samples), 1.0, 25.0)
    lms_time_spent = np.clip(380.0 - (distress * 320.0) + np.random.normal(0, 35.0, size=n_samples), 15.0, 600.0)
    engagement_trend = np.clip(-(distress * 35.0) + np.random.normal(0, 8.0, size=n_samples), -40.0, 30.0)

    # Calculate dropout risk probability logit
    z = (
        -4.2
        - 0.055 * (avg_attendance - 75.0)
        - 0.075 * attendance_trend
        - 0.65 * (avg_gpa - 6.5)
        - 0.55 * gpa_trend
        + 0.72 * backlog_count
        + 3.2 * assignment_miss_rate
        - 0.12 * (lms_login_frequency - 7.0)
        - 0.005 * (lms_time_spent - 150.0)
        - 0.03 * engagement_trend
        + np.random.normal(0, 0.45, size=n_samples)
    )

    dropout_prob = 1.0 / (1.0 + np.exp(-z))
    # Threshold to produce ~15% dropout rate
    dropout_threshold = np.percentile(dropout_prob, 85.0)
    dropout = (dropout_prob >= dropout_threshold).astype(int)

    df = pd.DataFrame({
        "avg_attendance": np.round(avg_attendance, 2),
        "attendance_trend": np.round(attendance_trend, 2),
        "avg_gpa": np.round(avg_gpa, 2),
        "gpa_trend": np.round(gpa_trend, 2),
        "backlog_count": backlog_count,
        "assignment_miss_rate": np.round(assignment_miss_rate, 3),
        "lms_login_frequency": np.round(lms_login_frequency, 2),
        "lms_time_spent": np.round(lms_time_spent, 1),
        "engagement_trend": np.round(engagement_trend, 2),
        "semester": semesters,
        "year": years,
        "dropout": dropout
    })

    return df


def train_model(csv_path: str = None) -> dict:
    if csv_path and os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        df = generate_synthetic_dataset(n_samples=2200)
        df.to_csv(DEFAULT_CSV_PATH, index=False)

    X = df[FEATURE_NAMES]
    y = df["dropout"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=9,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    )
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))

    cm = confusion_matrix(y_test, y_pred).tolist()

    feature_importances = [
        {
            "feature": name,
            "label": FEATURE_METADATA.get(name, {}).get("label", name),
            "importance": round(float(imp), 4)
        }
        for name, imp in sorted(
            zip(FEATURE_NAMES, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True
        )
    ]

    # Initialize SHAP TreeExplainer
    explainer = TreeExplainer(model)

    # Persist model bundle
    bundle = {
        "model": model,
        "explainer": explainer,
        "feature_names": FEATURE_NAMES
    }
    joblib.dump(bundle, MODEL_PATH)

    version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d.%H%M%S')}"
    metadata = {
        "version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "total_samples": len(df),
        "test_samples": len(y_test),
        "dropout_rate": round(float(y.mean()), 4),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "confusion_matrix": {
                "true_negative": cm[0][0],
                "false_positive": cm[0][1],
                "false_negative": cm[1][0],
                "true_positive": cm[1][1],
                "matrix": cm
            }
        },
        "feature_importances": feature_importances,
        "feature_list": FEATURE_NAMES
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metadata, f, indent=2)

    return metadata


if __name__ == "__main__":
    print("Training EduRetain Random Forest model with synthetic dataset...")
    metrics = train_model()
    print(f"Model trained successfully! Version: {metrics['version']}")
    print(f"Accuracy: {metrics['metrics']['accuracy']:.4f}")
    print(f"ROC-AUC:  {metrics['metrics']['roc_auc']:.4f}")
    print(f"F1 Score: {metrics['metrics']['f1']:.4f}")
    print(f"Recall:   {metrics['metrics']['recall']:.4f}")
