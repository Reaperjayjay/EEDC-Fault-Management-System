
"""
features.py
MainPower Electricity Distribution Limited AI Engineer Ranker.

Converts a fault-engineer pair into numerical features for the model.
Uses the same feature construction during training and prediction.

IMPORTANT:
- Specialization eligibility is separate from AI ranking.
- Ineligible engineers must be filtered out before assignment.
- Keep FEATURES in the same order expected by the trained model.
"""

import math


# Specializations accepted for each fault type.
# The order defines preferred specialization, followed by alternatives.
FAULT_TO_SPECIALIZATION = {
    "transformer_fault": ["transformer"],
    "feeder_fault": ["feeder"],
    "power_failure": ["substation", "distribution", "feeder"],
    "equipment_failure": ["substation", "general"],
    "overheating": ["transformer", "substation"],
    "voltage_problem": ["distribution", "feeder"],
    "other": ["general"],
}


SEVERITY_SCORES = {
    "low": 0.0,
    "medium": 0.33,
    "high": 0.67,
    "critical": 1.0,
}


# IMPORTANT:
# Do not reorder these features without retraining the model.
FEATURES = [
    "specialization",
    "distance",
    "distance_known",
    "rating",
    "rated",
    "experience",
    "jobs",
    "severity",
]


def normalize_text(value):
    """Normalize text fields for consistent comparisons."""
    if value is None:
        return ""
    return str(value).strip().lower()


def to_number(value):
    """Convert a value to float; return None if missing or invalid."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(number):
        return None

    return number


def specialization_position(fault_type, specialization):
    """
    Return the position of an engineer's specialization for a fault.

    0  = preferred specialization
    1  = first accepted alternative
    2+ = additional accepted alternatives
    -1 = not accepted for this fault type
    """
    fault_type = normalize_text(fault_type)
    specialization = normalize_text(specialization)

    accepted = FAULT_TO_SPECIALIZATION.get(
        fault_type,
        FAULT_TO_SPECIALIZATION["other"],
    )

    try:
        return accepted.index(specialization)
    except ValueError:
        return -1


def is_specialization_eligible(fault_type, specialization):
    """
    Return True only if the specialization is explicitly accepted
    for the specified fault type.

    This is an eligibility check, not an AI prediction.
    """
    return specialization_position(fault_type, specialization) >= 0


def specialization_score(position):
    """
    Convert a specialization position into a ranking feature.

    Preferred specialization: 1.0
    First accepted alternative: 0.7
    Other accepted alternative: 0.5
    No match: 0.0
    """
    position = to_number(position)

    if position is None:
        return 0.0

    position = int(position)

    if position == 0:
        return 1.0

    if position == 1:
        return 0.7

    if position > 1:
        return 0.5

    return 0.0


def get_specialization_position(row):
    """
    Prefer calculating specialization from fault_type and specialization.

    For backward compatibility, accept specialization_position when
    the two text fields are not supplied.
    """
    fault_type = row.get("fault_type")
    specialization = row.get("specialization")

    if fault_type is not None and specialization is not None:
        return specialization_position(fault_type, specialization)

    position = to_number(row.get("specialization_position"))

    if position is None:
        return -1

    return int(position)


def build_features(row):
    """
    Build the eight model inputs.

    Supported fields:
        fault_type
        specialization
        specialization_position (legacy input)
        distance_km
        performance_rating
        experience_years
        completed_jobs
        severity

    Note:
        The model input structure remains unchanged to avoid breaking
        the existing trained model. Retrain after changing feature
        semantics or the training-data generation process.
    """

    position = get_specialization_position(row)

    distance_km = to_number(row.get("distance_km"))
    distance_known = (
        distance_km is not None and distance_km >= 0
    )

    rating = to_number(row.get("performance_rating"))
    rating = 0.0 if rating is None else rating

    # Ratings are expected to be between 0 and 5.
    rating = min(max(rating, 0.0), 5.0)
    rated = rating > 0

    experience = to_number(row.get("experience_years"))
    experience = max(experience or 0.0, 0.0)

    jobs = to_number(row.get("completed_jobs"))
    jobs = max(jobs or 0.0, 0.0)

    severity_name = normalize_text(row.get("severity", "medium"))
    severity = SEVERITY_SCORES.get(severity_name, 0.33)

    distance_score = (
        1.0 / (1.0 + distance_km / 10.0)
        if distance_known
        else 0.0
    )

    return [
        specialization_score(position),
        distance_score,
        1.0 if distance_known else 0.0,
        rating / 5.0 if rated else 0.5,
        1.0 if rated else 0.0,
        min(experience / 15.0, 1.0),
        min(math.log1p(jobs) / math.log1p(100), 1.0),
        severity,
    ]


def formula_score(row):
    """
    Rule-based baseline score from 0 to 1.

    Weights:
        Specialization: 35%
        Distance:       30%
        Rating:         20%
        Experience:     15%

    This formula is a baseline, not the trained neural network.
    Fault severity is included in the model features but does not
    directly affect this baseline formula.
    """

    features = dict(zip(FEATURES, build_features(row)))

    distance = (
        features["distance"]
        if features["distance_known"]
        else 0.3
    )

    return (
        0.35 * features["specialization"]
        + 0.30 * distance
        + 0.20 * features["rating"]
        + 0.15 * features["experience"]
    )


def rank_eligibility(fault_type, candidates):
    """
    Separate candidates into eligible and ineligible groups.

    Each candidate should contain:
        id
        specialization

    Returns:
        {
            "eligible": [...],
            "ineligible": [...]
        }

    This function does not assign engineers or run the AI model.
    """
    eligible = []
    ineligible = []

    for candidate in candidates:
        candidate = dict(candidate)

        if is_specialization_eligible(
            fault_type,
            candidate.get("specialization"),
        ):
            candidate["specialization_position"] = specialization_position(
                fault_type,
                candidate.get("specialization"),
            )
            eligible.append(candidate)
        else:
            ineligible.append(candidate)

    return {
        "eligible": eligible,
        "ineligible": ineligible,
    }
