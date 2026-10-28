import os
import json
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import predict_student, load_model_bundle, reload_model_bundle
from train import train_model, METRICS_PATH, MODEL_PATH

app = FastAPI(
    title="EduRetain ML Microservice",
    description="Dropout prediction and SHAP explainability API for EduRetain",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StudentFeatures(BaseModel):
    student_id: Optional[str] = None
    avg_attendance: float = Field(..., ge=0, le=100, description="Average attendance percentage")
    attendance_trend: float = Field(default=0.0, description="Attendance change over recent months")
    avg_gpa: float = Field(..., ge=0, le=10, description="Average GPA on 10 pt scale")
    gpa_trend: float = Field(default=0.0, description="Semester GPA trajectory")
    backlog_count: int = Field(default=0, ge=0, description="Active backlog courses")
    assignment_miss_rate: float = Field(default=0.0, ge=0, le=1, description="LMS assignment miss rate")
    lms_login_frequency: float = Field(default=0.0, ge=0, description="Weekly LMS logins")
    lms_time_spent: float = Field(default=0.0, ge=0, description="Weekly LMS active minutes")
    engagement_trend: float = Field(default=0.0, description="LMS engagement trend percentage")
    semester: int = Field(default=1, ge=1, le=12)
    year: int = Field(default=1, ge=1, le=6)


class BatchPredictRequest(BaseModel):
    students: List[StudentFeatures]


class TrainRequest(BaseModel):
    csv_path: Optional[str] = None
    force_regenerate: Optional[bool] = False


@app.on_event("startup")
def startup_event():
    # Ensure model is trained & loaded on startup
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METRICS_PATH):
        print("Model or metadata not found at startup. Generating synthetic dataset and training model...")
        train_model()
    try:
        load_model_bundle()
        print("ML Model bundle loaded successfully.")
    except Exception as e:
        print(f"Warning: Failed to load model bundle at startup: {e}")


@app.get("/health")
def health_check():
    model_exists = os.path.exists(MODEL_PATH)
    metrics = None
    version = "unknown"
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r") as f:
                metrics = json.load(f)
                version = metrics.get("version", "v1.0")
        except Exception:
            pass

    return {
        "status": "healthy",
        "service": "EduRetain-ML",
        "model_loaded": model_exists,
        "version": version
    }


@app.post("/predict")
def predict(features: StudentFeatures):
    try:
        result = predict_student(features.dict())
        return {
            "success": True,
            "student_id": features.student_id,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


@app.post("/predict/batch")
def predict_batch(payload: BatchPredictRequest):
    try:
        results = []
        for item in payload.students:
            res = predict_student(item.dict())
            results.append({
                "student_id": item.student_id,
                **res
            })
        return {
            "success": True,
            "count": len(results),
            "predictions": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction error: {str(e)}")


@app.get("/metrics")
def get_metrics():
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(status_code=404, detail="Model has not been trained yet.")
    try:
        with open(METRICS_PATH, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metrics: {str(e)}")


@app.post("/train")
def trigger_training(req: TrainRequest = TrainRequest()):
    try:
        print(f"Retraining triggered with csv_path={req.csv_path}...")
        metrics = train_model(req.csv_path)
        reload_model_bundle()
        return {
            "success": True,
            "message": "Model retrained and reloaded successfully.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
