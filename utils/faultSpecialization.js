// Maps each fault_type to the engineer specializations that can handle it.
// First item = best match, the rest = acceptable alternatives.
const FAULT_TO_SPECIALIZATION = {
  transformer_fault: ['transformer'],
  feeder_fault: ['feeder'],
  power_failure: ['substation', 'distribution', 'feeder'],
  equipment_failure: ['substation', 'general'],
  overheating: ['transformer', 'substation'],
  voltage_problem: ['distribution', 'feeder'],
  other: ['general'],
};

function getSpecializationsForFault(faultType) {
  return FAULT_TO_SPECIALIZATION[faultType] || ['general'];
}

module.exports = { FAULT_TO_SPECIALIZATION, getSpecializationsForFault };
