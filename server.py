
"""
server.py
FastAPI service for the MainPower AI Engineer Ranker.

Run:
    py -m uvicorn server:app --reload --port 8000
"""

import json
import os
from typing import List, Optional

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from features import (
    FEATURES,
    build_features,
    is_specialization_eligible,
    specialization_position,
)
from model import RankerNet


MODEL_DIR = os.getenv("MODEL_DIR", "models")

app = FastAPI(title="MainPower AI Engineer Ranking System")

state = {
    "model": None,
    "meta": None,
    "error": None,
}


# --------------------------------------------------
# LOAD THE TRAINED MODEL
# --------------------------------------------------

def load_model():
    try:
        meta_path = os.path.join(MODEL_DIR, "meta.json")
        model_path = os.path.join(MODEL_DIR, "model.pt")

        with open(meta_path, encoding="utf-8") as handle:
            meta = json.load(handle)

        if meta.get("features") != FEATURES:
            raise ValueError(
                "The saved model uses different features. "
                "Train the model again."
            )

        model = RankerNet(len(FEATURES))

        model.load_state_dict(
            torch.load(model_path, map_location="cpu")
        )

        model.eval()

        state["model"] = model
        state["meta"] = meta
        state["error"] = None

    except (OSError, ValueError, RuntimeError, KeyError) as error:
        state["model"] = None
        state["meta"] = None
        state["error"] = str(error)


load_model()


# --------------------------------------------------
# REQUEST SCHEMAS
# --------------------------------------------------

class Candidate(BaseModel):
    id: int

    # Actual specialization, not a numeric position.
    specialization: str

    distance_km: Optional[float] = Field(default=None, ge=0)
    performance_rating: Optional[float] = Field(default=0, ge=0, le=5)
    experience_years: Optional[float] = Field(default=0, ge=0)
    completed_jobs: Optional[float] = Field(default=0, ge=0)


class RankRequest(BaseModel):
    fault_type: str
    severity: str = "medium"
    candidates: List[Candidate]


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health():
    if state["model"] is None:
        return {
            "status": "no_model",
            "detail": state["error"],
        }

    return {
        "status": "ok",
        **state["meta"],
    }


# --------------------------------------------------
# RANK ENGINEERS
# --------------------------------------------------

@app.post("/rank")
def rank(request: RankRequest):

    if state["model"] is None:
        raise HTTPException(
            status_code=503,
            detail=state["error"] or "Model not loaded",
        )

    fault_type = request.fault_type.strip().lower()
    severity = request.severity.strip().lower()

    allowed_faults = {
        "transformer_fault",
        "feeder_fault",
        "power_failure",
        "equipment_failure",
        "overheating",
        "voltage_problem",
        "other",
    }

    allowed_severities = {
        "low",
        "medium",
        "high",
        "critical",
    }

    if fault_type not in allowed_faults:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported fault_type: {fault_type}",
        )

    if severity not in allowed_severities:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported severity: {severity}",
        )

    if not request.candidates:
        return {
            "fault_type": fault_type,
            "scores": [],
            "ranked_candidates": [],
            "best_candidate_id": None,
            "model_version": state["meta"]["version"],
        }

    # Check candidate IDs to avoid ambiguous assignments.
    candidate_ids = [candidate.id for candidate in request.candidates]

    if len(candidate_ids) != len(set(candidate_ids)):
        raise HTTPException(
            status_code=422,
            detail="Candidate IDs must be unique.",
        )

    eligible_rows = []
    eligible_indices = []

    # IMPORTANT:
    # Exclude unsuitable specializations BEFORE AI ranking.
    for index, candidate in enumerate(request.candidates):
        specialization = candidate.specialization.strip().lower()

        if not is_specialization_eligible(
            fault_type,
            specialization,
        ):
            continue

        row = candidate.model_dump()

        row["fault_type"] = fault_type
        row["specialization"] = specialization
        row["specialization_position"] = specialization_position(
            fault_type,
            specialization,
        )
        row["severity"] = severity

        eligible_rows.append(row)
        eligible_indices.append(index)

    # None means the candidate was ineligible and was not scored.
    scores = [None] * len(request.candidates)

    if not eligible_rows:
        return {
            "fault_type": fault_type,
            "severity": severity,
            "scores": scores,
            "ranked_candidates": [],
            "best_candidate_id": None,
            "message": (
                "No candidates have a specialization accepted "
                "for this fault type. No engineer was selected."
            ),
            "model_version": state["meta"]["version"],
        }

    # Build the model inputs only for eligible candidates.
    batch = torch.tensor(
        [build_features(row) for row in eligible_rows],
        dtype=torch.float32,
    )

    with torch.no_grad():
        predictions = (
            state["model"](batch)
            .reshape(-1)
            .tolist()
        )

    # Restore each score to the original candidate position.
    for index, prediction in zip(eligible_indices, predictions):
        scores[index] = round(
            max(0.0, min(float(prediction), 1.0)) * 100,
            1,
        )

    # Sort eligible candidates from highest score to lowest.
    ranked_candidates = []

    for index in eligible_indices:
        candidate = request.candidates[index]

        ranked_candidates.append({
            "id": candidate.id,
            "specialization": candidate.specialization.strip().lower(),
            "score": scores[index],
            "distance_km": candidate.distance_km,
            "experience_years": candidate.experience_years,
            "performance_rating": candidate.performance_rating,
        })

    ranked_candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return {
        "fault_type": fault_type,
        "severity": severity,
        "scores": scores,
        "ranked_candidates": ranked_candidates,
        "best_candidate_id": ranked_candidates[0]["id"],
        "model_version": state["meta"]["version"],
    }
