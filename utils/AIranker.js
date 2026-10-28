// Asks the PyTorch ranking service (ai-ranker/server.py) to score engineers.
//
// Set AI_RANKER_URL in config.env to turn it on, for example:
//   AI_RANKER_URL=http://localhost:8000
//
// Return values:
//   - null  -> the AI service is not configured, down, slow, or returned
//              something unusable. The caller should use the rule-based
//              score (utils/Engineerscoring.js).
//   - data  -> the service's response. data.scores[i] matches candidates[i].
//              A score of null means that engineer is NOT eligible for this
//              fault type (wrong specialization) and must not be assigned.

const DEFAULT_TIMEOUT_MS = 2000;

async function scoreWithModel(candidates, context = {}) {
  const baseUrl = process.env.AI_RANKER_URL;

  if (!baseUrl || !Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const timeoutMs =
    Number(process.env.AI_RANKER_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/rank`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fault_type: context.faultType,
      severity: context.severity || 'medium',
      candidates,
    }),
    signal: controller.signal,
  }).catch((err) => {
    console.warn('AI ranker request failed:', err.message);
    return null;
  });

  clearTimeout(timer);

  if (!response) return null;

  if (!response.ok) {
    // 422 usually means a bad fault_type/severity or duplicate candidate ids
    const detail = await response.text().catch(() => '');
    console.warn(`AI ranker returned ${response.status}: ${detail}`);
    return null;
  }

  const data = await response.json().catch(() => null);

  if (
    !data ||
    !Array.isArray(data.scores) ||
    data.scores.length !== candidates.length
  ) {
    return null;
  }

  // null = ineligible (valid). Anything else must be a real number.
  const valid = data.scores.every((s) => s === null || Number.isFinite(s));

  return valid ? data : null;
}

module.exports = { scoreWithModel };
