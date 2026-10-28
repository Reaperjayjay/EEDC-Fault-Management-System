// Scores an engineer from 0 to 100.
// - scoreEngineer: for one specific fault (specialization, distance, rating, experience)
// - scoreGeneral: when no fault is chosen (rating and experience only)
// Change the WEIGHTS to tune the ranking. Each set of weights must add up to 1.

const WEIGHTS = {
  specialization: 0.35,
  distance: 0.3,
  performance: 0.2,
  experience: 0.15,
};

const GENERAL_WEIGHTS = {
  performance: 0.6,
  experience: 0.4,
};

const MAX_EXPERIENCE_YEARS = 15; // 15 or more years counts as full experience
const DISTANCE_HALF_SCORE_KM = 10; // an engineer 10 km away gets half the distance score
const NEUTRAL = 0.5; // used when an engineer has no reviews yet
const UNKNOWN_DISTANCE = 0.3; // no GPS location: below average, since we cannot dispatch by distance

const clamp = (value) => Math.min(1, Math.max(0, value));

// Best-match specialization = 1, first alternative = 0.7, other alternatives = 0.5.
const specializationScore = (specialization, specs) => {
  const position = specs.indexOf(specialization);
  if (position === 0) return 1;
  if (position === 1) return 0.7;
  if (position > 1) return 0.5;
  return 0;
};

// Rating is out of 5. A rating of 0 means "not reviewed yet", so it is neutral
// instead of punishing new engineers with a zero.
const performanceScore = (rating) => {
  const value = Number(rating);
  if (!Number.isFinite(value) || value <= 0) return NEUTRAL;
  return clamp(value / 5);
};

const experienceScore = (years) =>
  clamp(Number(years || 0) / MAX_EXPERIENCE_YEARS);

// Closer is better: 0 km = 1, 10 km = 0.5, 40 km = 0.2.
const distanceScore = (km) => {
  if (km === null || km === undefined) return UNKNOWN_DISTANCE;
  const value = Number(km);
  if (!Number.isFinite(value) || value < 0) return UNKNOWN_DISTANCE;
  return 1 / (1 + value / DISTANCE_HALF_SCORE_KM);
};

const toPercent = (value) => Math.round(value * 1000) / 10;

// Combines the 0-1 parts with their weights into { matchScore, breakdown }.
const combine = (parts, weights) => {
  const total = Object.keys(weights).reduce(
    (sum, key) => sum + parts[key] * weights[key],
    0,
  );

  const breakdown = Object.keys(weights).reduce(
    (result, key) => ({ ...result, [key]: toPercent(parts[key]) }),
    {},
  );

  return { matchScore: toPercent(total), breakdown };
};

const scoreEngineer = (engineer, specs) =>
  combine(
    {
      specialization: specializationScore(engineer.specialization, specs),
      distance: distanceScore(engineer.distance_km),
      performance: performanceScore(engineer.performance_rating),
      experience: experienceScore(engineer.experience_years),
    },
    WEIGHTS,
  );

const scoreGeneral = (engineer) =>
  combine(
    {
      performance: performanceScore(engineer.performance_rating),
      experience: experienceScore(engineer.experience_years),
    },
    GENERAL_WEIGHTS,
  );

module.exports = { WEIGHTS, GENERAL_WEIGHTS, scoreEngineer, scoreGeneral };
