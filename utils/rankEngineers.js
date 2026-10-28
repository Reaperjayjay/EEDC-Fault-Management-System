const { scoreWithModel } = require('./AIranker');
// Your existing rule-based scorer. Adjust the name to what Engineerscoring.js exports.
const { scoreEngineer } = require('./Engineerscoring');

// Convert one DB row into what the Python service expects
function toCandidate(engineer) {
  return {
    id: engineer.id,
    specialization: engineer.specialization,
    distance_km: engineer.distance_km, // compute from GPS if not stored
    performance_rating: engineer.performance_rating || 0,
    experience_years: engineer.experience_years || 0,
    completed_jobs: engineer.completed_jobs || 0,
  };
}

async function rankEngineers(engineers, fault) {
  const candidates = engineers.map(toCandidate);

  const ai = await scoreWithModel(candidates, {
    faultType: fault.fault_type, // must be e.g. "transformer_fault"
    severity: fault.severity, // low | medium | high | critical
  });

  if (ai) {
    const ranked = engineers
      .map((engineer, i) => ({ engineer, score: ai.scores[i] }))
      .filter((r) => r.score !== null) // null = ineligible for this fault
      .sort((a, b) => b.score - a.score);

    return { source: 'ai', ranked, message: ai.message || null };
  }

  // AI unavailable: rule-based fallback
  const ranked = engineers
    .map((engineer) => ({ engineer, score: scoreEngineer(engineer, fault) }))
    .sort((a, b) => b.score - a.score);

  return { source: 'rules', ranked, message: null };
}

module.exports = { rankEngineers };
