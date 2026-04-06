import os
import joblib
import pandas as pd
import numpy as np
import datetime
import json
from google import genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from app.core.engineering import engineer_all_features, get_final_features
from dotenv import load_dotenv

load_dotenv()

client = genai.Client()
app = FastAPI(title="Injury Prediction API")

trained_model = None
model_features = None


@app.on_event("startup")
async def load_model_assets():
    global trained_model, model_features
    try:
        trained_model = joblib.load("app/models/injury_model.pkl")
        model_features = get_final_features()
        print("Backend ready: model and features loaded.")
    except Exception as e:
        print(f"Startup error: {e}")


class TrainingWeek(BaseModel):
    date: int
    total_kms: float
    max_km_one_day: float
    total_km_z3_z4_z5_t1_t2: float
    total_km_z5_t1_t2: float
    total_km_z3_4: float
    nr_sessions: float
    nr_rest_days: float
    avg_exertion: float
    max_exertion: float
    min_exertion: float
    avg_recovery: float
    avg_training_success: float
    nr_days_with_interval_session: float
    max_km_one_day_1: float
    max_km_one_day_2: float


class PredictionRequest(BaseModel):
    athlete_id: int
    training_history: List[TrainingWeek]


class PredictionResponse(BaseModel):
    injury_risk_percent: float
    risk_level: str
    key_factors: Dict[str, float]
    recommendations: List[str]


async def generate_recommendations(risk_percent, risk_level, metrics, history_text, total_kms_current):
    is_beginner = total_kms_current < 5.0

    context = (
        "Athlete is a beginner (<5km/week). Focus on base building and ignore small load changes."
        if is_beginner else ""
    )

    prompt = f"""
    Role: Running coach. {context}
    Provide 3 short and practical recovery recommendations.

    Recent history:
    {history_text}

    Risk: {risk_percent}% ({risk_level})
    ACWR: {metrics.get('acwr_total_kms', 1.0):.2f}
    Monotony: {metrics.get('monotony_weekly_load', 0):.1f}

    Return JSON: {{"advice": ["tip1", "tip2", "tip3"]}}
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config={'response_mime_type': 'application/json'}
        )
        return json.loads(response.text).get(
            "advice",
            ["Stay consistent", "Rest well", "Monitor pain"]
        )
    except Exception as e:
        print(f"Gemini error: {e}")
        return ["Rest well", "Keep moving", "Watch for pain"]


@app.post("/predict", response_model=PredictionResponse)
async def predict_injury_risk(request: PredictionRequest):
    if trained_model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        # Build dataframe
        df = pd.DataFrame([w.dict() for w in request.training_history])
        df['Athlete ID'] = request.athlete_id

        # Rename columns
        df = df.rename(columns={
            'total_kms': 'total kms',
            'max_km_one_day': 'max km one day',
            'total_km_z3_z4_z5_t1_t2': 'total km Z3-Z4-Z5-T1-T2',
            'total_km_z5_t1_t2': 'total km Z5-T1-T2',
            'total_km_z3_4': 'total km Z3-4',
            'avg_exertion': 'avg exertion',
            'max_exertion': 'max exertion',
            'min_exertion': 'min exertion',
            'avg_recovery': 'avg recovery',
            'avg_training_success': 'avg training success',
            'nr_rest_days': 'nr. rest days',
            'nr_sessions': 'nr. sessions',
            'nr_days_with_interval_session': 'nr. days with interval session',
            'max_km_one_day_1': 'max km one day.1',
            'max_km_one_day_2': 'max km one day.2',
            'date': 'Date'
        })

        # Scale subjective inputs
        scale_cols = [
            'avg exertion',
            'max exertion',
            'min exertion',
            'avg recovery',
            'avg training success'
        ]

        for col in scale_cols:
            if col in df.columns and df[col].max() > 1.0:
                df[col] = df[col] / 10.0

        # Feature engineering
        engineered_df = engineer_all_features(df)
        latest = engineered_df.iloc[-1]

        # Early-week fallback
        if datetime.datetime.now().weekday() <= 2 and latest['total kms'] == 0 and len(engineered_df) > 1:
            latest = engineered_df.iloc[-2]

        # Feature vector
        features = latest[model_features].values.reshape(1, -1)
        feature_vector = np.nan_to_num(features, nan=0.0).astype(np.float32)

        # Model prediction
        risk_prob = float(trained_model.predict_proba(feature_vector)[0][1])
        risk_percent = risk_prob * 100

        # Key indicators
        curr_kms = float(latest['total kms'])
        acwr_val = float(latest['acwr_total_kms'])
        monotony_val = float(latest['monotony_weekly_load'])
        gap_val = float(latest['exertion_recovery_gap_7d'])
        hi_spike = float(latest['hi_load_spike_ratio'])
        rest_def = float(latest['rest_day_deficiency_14d'])

        # Adjustments
        if curr_kms < 5.0:
            risk_percent = min(risk_percent, 25.0)
        elif curr_kms < 10.0:
            risk_percent = min(risk_percent, 35.0)
        else:
            if acwr_val > 1.7:
                risk_percent = max(risk_percent, 55.0)

            risk_signals = sum([
                acwr_val > 1.5,
                monotony_val > 7.0,
                gap_val > 0.3,
                hi_spike > 1.5,
                rest_def > 1.0,
            ])

            safe_signals = sum([
                0.8 <= acwr_val <= 1.3,
                monotony_val < 4.0,
                gap_val < 0.0,
            ])

            if risk_signals >= 2:
                risk_percent = max(risk_percent, 62.0)
            elif safe_signals >= 2 and risk_signals == 0:
                risk_percent = min(risk_percent, 38.0)
            elif safe_signals >= 1 and risk_signals == 0:
                risk_percent = min(risk_percent, 44.0)

        # Risk level
        if risk_percent < 45:
            risk_level = "low"
        elif risk_percent < 60:
            risk_level = "moderate"
        else:
            risk_level = "high"

        # Key factors
        factors = {
            'acwr_total_kms': acwr_val,
            'monotony_weekly_load': monotony_val,
            'rest_day_deficiency_14d': rest_def,
        }

        # History text
        history_text = "\n".join([
            f"Week {i+1}: {w.total_kms}km"
            for i, w in enumerate(request.training_history[-4:])
        ])

        # Recommendations
        recs = await generate_recommendations(
            round(risk_percent, 2),
            risk_level,
            factors,
            history_text,
            curr_kms
        )

        print(
            f"Athlete {request.athlete_id}: {round(risk_percent, 2)}% ({risk_level}) | "
            f"ACWR={acwr_val:.2f} Monotony={monotony_val:.2f} Gap={gap_val:.2f} "
            f"HiSpike={hi_spike:.2f} RestDef={rest_def:.1f}"
        )

        return PredictionResponse(
            injury_risk_percent=round(risk_percent, 2),
            risk_level=risk_level,
            key_factors=factors,
            recommendations=recs
        )

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")


