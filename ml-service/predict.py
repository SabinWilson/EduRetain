import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Any

from utils import FEATURE_NAMES, FEATURE_METADATA

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODELS_DIR, "model.joblib")

_model_bundle = None


def load_model_bundle():
    global _model_bundle
    if _model_bundle is None:
        if not os.path.exists(MODEL_PATH):
            from train import train_model
            train_model()
        _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


def reload_model_bundle():
    global _model_bundle
    _model_bundle = joblib.load(MODEL_PATH)
    return _model_bundle


def generate_factor_explanation(feature: str, value: float, shap_val: float) -> str:
    meta = FEATURE_METADATA.get(feature, {})
    label = meta.get("label", feature)
    unit = meta.get("unit", "")

    if shap_val > 0:
        if feature == "avg_attendance":
            return f"Low attendance ({value}{unit}) is significantly raising dropout risk."
        elif feature == "attendance_trend":
            return f"Negative attendance trend ({value:+0.1f} pts) indicates deteriorating lecture presence."
        elif feature == "avg_gpa":
            return f"Academic distress with low GPA ({value:.2f}{unit})."
        elif feature == "gpa_trend":
            return f"Declining GPA trajectory ({value:+0.2f} pts) across consecutive semesters."
        elif feature == "backlog_count":
            return f"Accumulation of {int(value)} course backlogs posing retention barrier."
        elif feature == "assignment_miss_rate":
            return f"High assignment non-submission rate ({(value * 100):.1f}% missed)."
        elif feature == "lms_login_frequency":
            return f"Infrequent LMS portal engagement ({value:.1f} logins/wk)."
        elif feature == "lms_time_spent":
            return f"Very low active digital study time ({value:.0f} mins/wk)."
        elif feature == "engagement_trend":
            return f"Steep drop in digital course engagement ({value:+0.1f}%)."
        return f"{label} of {value} is contributing negatively to academic stability."
    else:
        if feature == "avg_attendance":
            return f"Consistent attendance ({value}{unit}) strongly cushions retention."
        elif feature == "avg_gpa":
            return f"Strong GPA ({value:.2f}{unit}) indicates good subject mastery."
        elif feature == "backlog_count" and value == 0:
            return "Clear academic record with zero active backlogs."
        return f"Positive {label.lower()} ({value}{unit}) provides protective buffer."


def predict_student(features: Dict[str, Any]) -> Dict[str, Any]:
    bundle = load_model_bundle()
    model = bundle["model"]
    explainer = bundle["explainer"]

    # Build feature row
    row = []
    for f in FEATURE_NAMES:
        val = features.get(f, 0.0)
        row.append(float(val) if val is not None else 0.0)

    df_sample = pd.DataFrame([row], columns=FEATURE_NAMES)

    # Predict probability of class 1 (dropout)
    probabilities = model.predict_proba(df_sample)[0]
    dropout_prob = float(probabilities[1])

    # Assign risk level based on standard thresholds (configurable)
    if dropout_prob >= 0.65:
        level = "High"
    elif dropout_prob >= 0.35:
        level = "Medium"
    else:
        level = "Low"

    # SHAP explanations
    shap_values = explainer.shap_values(df_sample)
    
    # Handle SHAP output format differences across versions (list of arrays or 3D array)
    if isinstance(shap_values, list):
        # Class 1 is dropout
        sample_shap = shap_values[1][0]
    elif len(np.shape(shap_values)) == 3:
        sample_shap = shap_values[0, :, 1]
    else:
        sample_shap = shap_values[0]

    factors = []
    for name, s_val, val in zip(FEATURE_NAMES, sample_shap, row):
        factors.append({
            "feature": name,
            "label": FEATURE_METADATA.get(name, {}).get("label", name),
            "value": round(float(val), 2),
            "unit": FEATURE_METADATA.get(name, {}).get("unit", ""),
            "shap_value": round(float(s_val), 4),
            "abs_impact": abs(float(s_val)),
            "is_risk_driver": bool(s_val > 0),
            "explanation": generate_factor_explanation(name, val, s_val)
        })

    # Sort primarily by risk driver (positive SHAP first, then highest magnitude)
    risk_drivers = [f for f in factors if f["is_risk_driver"]]
    risk_drivers.sort(key=lambda x: x["shap_value"], reverse=True)

    protective_factors = [f for f in factors if not f["is_risk_driver"]]
    protective_factors.sort(key=lambda x: x["shap_value"])

    # Top 3-5 factors
    top_factors = (risk_drivers[:4] + protective_factors[:2])[:5]

    return {
        "score": round(dropout_prob, 4),
        "level": level,
        "top_factors": top_factors,
        "all_factors": factors
    }
