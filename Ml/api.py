"""
PARS – Risk Scoring API
FastAPI wrapper around the trained XGBoost model (models/).
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, pickle, numpy as np

app = FastAPI(title="PARS Risk Scoring API", version="1.0.0")

# Allow calls from the frontend/backend containers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load model once at startup ──────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "models/risk_model.pkl")
model = None

@app.on_event("startup")
def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print(f"[PARS] Model loaded from {MODEL_PATH}")
    else:
        print(f"[PARS] WARNING: model file not found at {MODEL_PATH}. /predict will return dummy scores.")


# ── Request / Response schemas ──────────────────────────────────────────────
class VitalsInput(BaseModel):
    age: int
    sex: str                   # "Male" | "Female" | "Other"
    systolicBP: float
    diastolicBP: float
    heartRate: float
    respiratoryRate: float
    temperature: float
    painScore: float
    spo2: float
    hypertension: bool = False
    diabetes: bool = False
    cardiacHistory: bool = False

class RiskOutput(BaseModel):
    score: float               # 0.0 – 1.0
    category: str              # LOW | MEDIUM | HIGH
    level: int                 # 1 – 5


def _encode_sex(sex: str) -> int:
    return {"Male": 0, "Female": 1, "Other": 2}.get(sex, 0)


def _predict(v: VitalsInput) -> RiskOutput:
    features = np.array([[
        v.age, _encode_sex(v.sex),
        v.systolicBP, v.diastolicBP, v.heartRate,
        v.respiratoryRate, v.temperature, v.painScore, v.spo2,
        int(v.hypertension), int(v.diabetes), int(v.cardiacHistory)
    ]])

    if model is not None:
        prob = float(model.predict_proba(features)[0][1])
    else:
        # Heuristic fallback (no trained model yet)
        danger = (
            (v.systolicBP > 180 or v.systolicBP < 90) +
            (v.spo2 < 90) +
            (v.heartRate > 120 or v.heartRate < 50) +
            (v.painScore >= 8) +
            int(v.cardiacHistory)
        )
        prob = min(danger / 5.0, 1.0)

    if prob >= 0.65:
        category, level = "HIGH", 5 if prob >= 0.85 else 4
    elif prob >= 0.35:
        category, level = "MEDIUM", 3
    else:
        category, level = "LOW", 2 if prob >= 0.15 else 1

    return RiskOutput(score=prob, category=category, level=level)


# ── Endpoints ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/predict", response_model=RiskOutput)
def predict(vitals: VitalsInput):
    return _predict(vitals)


@app.post("/predict/batch")
def predict_batch(patients: list[VitalsInput]):
    return [_predict(p) for p in patients]
