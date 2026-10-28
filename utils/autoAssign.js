const Assignment = require('../models/assignmentsModel');
const Fault = require('../models/faultsModel');
const Engineer = require('../models/engineersModel');

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Finds the best available engineer for a fault and assigns them.
// Never throws for "normal" outcomes (no engineer, already assigned...);
// it returns { assigned: false, reason } instead, so callers can carry on.
async function autoAssignBestEngineer(faultId, assignedBy = null) {
  const fault = await Fault.findById(faultId);

  if (!fault) {
    return { assigned: false, reason: 'Fault not found' };
  }

  if (['resolved', 'cancelled'].includes(fault.status)) {
    return { assigned: false, reason: `Fault is ${fault.status}` };
  }

  const activeAssignment = await Assignment.findActiveByFault(fault.id);

  if (activeAssignment) {
    return {
      assigned: false,
      reason: 'Fault already has an active assignment',
      assignment: activeAssignment,
    };
  }

  const coords = await Fault.getCoordinates(fault.id);
  const latitude = toNumberOrNull(coords && coords.latitude);
  const longitude = toNumberOrNull(coords && coords.longitude);

  // Already filtered (available, right specialization, within range)
  // and sorted best score first, using the AI model when it is running.
  const suggestions = await Engineer.findSuggestedForFault(
    fault.fault_type,
    latitude,
    longitude,
    fault.severity,
  );

  if (suggestions.length === 0) {
    return {
      assigned: false,
      reason: 'No available eligible engineer. Assign manually.',
    };
  }

  const [best] = suggestions;

  const assignment = await Assignment.create({
    faultId: fault.id,
    engineerId: best.id,
    assignedBy,
    notes: `Auto-assigned (${best.ranked_by}, score ${best.match_score})`,
  });

  return {
    assigned: true,
    assignment,
    engineer: {
      id: best.id,
      name: best.name,
      specialization: best.specialization,
      distance_km: best.distance_km,
      match_score: best.match_score,
      ranked_by: best.ranked_by,
    },
  };
}

module.exports = { autoAssignBestEngineer };
