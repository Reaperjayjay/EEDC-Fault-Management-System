"""Training data: a synthetic bootstrap set, or a CSV exported from your database."""
import csv

import numpy as np

from features import (
    FEATURES,
    build_features,
    formula_score,
    specialization_position,
    to_number,
)

SEVERITIES = ["low", "medium", "high", "critical"]


def synthetic_rows(count=5000, seed=42):
    """Fake (fault, engineer) pairs whose target is today's formula plus noise.

    This only teaches the model to imitate the formula, so the pipeline works
    before real data exists. Retrain on real data later (see README.md).
    """
    rng = np.random.RandomState(seed)
    rows = []

    for _ in range(count):
        position = int(rng.choice([-1, 0, 1, 2], p=[0.25, 0.40, 0.20, 0.15]))
        distance = None if rng.rand() < 0.2 else float(rng.lognormal(mean=2.0, sigma=1.0))
        rated = rng.rand() > 0.15
        experience = float(min(rng.gamma(3, 3), 35))

        row = {
            "specialization_position": position,
            "distance_km": distance,
            "performance_rating": float(rng.uniform(2.5, 5.0)) if rated else 0.0,
            "experience_years": experience,
            "completed_jobs": float(max(0.0, rng.normal(experience * 8, 15))),
            "severity": SEVERITIES[int(rng.randint(0, 4))],
        }
        noise = rng.normal(0, 0.04)
        row["target"] = float(np.clip(formula_score(row) + noise, 0.0, 1.0))
        rows.append(row)

    return rows


def rows_from_csv(path):
    """Reads the file made by export_training_data.sql.

    Needs the columns: fault_type, severity, specialization, experience_years,
    performance_rating, completed_jobs, distance_km (may be empty), target
    where target is the review overall_score from 1 to 5.
    """
    rows = []

    with open(path, newline="", encoding="utf-8") as handle:
        for record in csv.DictReader(handle):
            score = to_number(record.get("target"))
            if score is None:
                continue

            rows.append(
                {
                    "specialization_position": specialization_position(
                        record.get("fault_type"), record.get("specialization")
                    ),
                    "distance_km": record.get("distance_km"),
                    "performance_rating": record.get("performance_rating"),
                    "experience_years": record.get("experience_years"),
                    "completed_jobs": record.get("completed_jobs"),
                    "severity": record.get("severity", "medium"),
                    # Review scores run from 1 to 5; the model predicts 0 to 1.
                    "target": float(np.clip((score - 1.0) / 4.0, 0.0, 1.0)),
                }
            )

    return rows


def to_matrix(rows):
    x = np.array([build_features(row) for row in rows], dtype=np.float32)
    y = np.array([row["target"] for row in rows], dtype=np.float32)
    assert x.shape[1] == len(FEATURES)
    return x, y


def spearman(a, b):
    """Rank correlation: 1 means the model orders engineers exactly like the target."""
    ranks_a = np.argsort(np.argsort(a)).astype(float)
    ranks_b = np.argsort(np.argsort(b)).astype(float)
    if ranks_a.std() == 0 or ranks_b.std() == 0:
        return 0.0
    return float(np.corrcoef(ranks_a, ranks_b)[0, 1])
