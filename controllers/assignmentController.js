const Assignment = require('../models/assignmentsModel');
const Fault = require('../models/faultsModel');
const Engineer = require('../models/engineersModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { getSpecializationsForFault } = require('../utils/faultSpecialization');

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// Returns the fault's coordinates (detected position, or the site's position)
const getFaultCoordinates = async (faultId) => {
  const coords = await Fault.getCoordinates(faultId);

  return {
    latitude: toNumberOrNull(coords && coords.latitude),
    longitude: toNumberOrNull(coords && coords.longitude),
  };
};

exports.getAllAssignments = catchAsync(async (req, res) => {
  const assignments = await Assignment.findAll();

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: {
      assignments,
    },
  });
});

exports.getAssignment = catchAsync(async (req, res, next) => {
  const assignment = await Assignment.findById(req.params.id);

  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      assignment,
    },
  });
});

exports.createAssignment = catchAsync(async (req, res) => {
  const assignmentData = {
    ...req.body,
    assignedBy: req.user.id,
  };

  const assignment = await Assignment.create(assignmentData);

  res.status(201).json({
    status: 'success',
    data: {
      assignment,
    },
  });
});

// NEW: GET /faults/:faultId/suggested-engineers
exports.getSuggestedEngineers = catchAsync(async (req, res, next) => {
  const fault = await Fault.findById(req.params.faultId);

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  const { latitude, longitude } = await getFaultCoordinates(fault.id);

  const engineers = await Engineer.findSuggestedForFault(
    fault.fault_type,
    latitude,
    longitude,
    fault.severity,
  );

  res.status(200).json({
    status: 'success',
    results: engineers.length,
    data: {
      fault: { id: fault.id, fault_type: fault.fault_type },
      matchingSpecializations: getSpecializationsForFault(fault.fault_type),
      engineers,
    },
  });
});

// NEW: POST /faults/:faultId/assign
// Body: { engineerId?: number, notes?: string }
// - With engineerId: manual assignment (admin picks an engineer)
// - Without engineerId: auto-assigns the best-matching available engineer
exports.assignEngineer = catchAsync(async (req, res, next) => {
  const { faultId } = req.params;
  const { engineerId, notes } = req.body;

  const fault = await Fault.findById(faultId);

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  if (['resolved', 'cancelled'].includes(fault.status)) {
    return next(
      new AppError(`Cannot assign an engineer to a ${fault.status} fault`, 400),
    );
  }

  const activeAssignment = await Assignment.findActiveByFault(fault.id);

  if (activeAssignment) {
    return next(
      new AppError('This fault already has an active assignment', 409),
    );
  }

  const matchingSpecializations = getSpecializationsForFault(fault.fault_type);

  let chosen;
  let autoAssigned = false;

  if (engineerId) {
    // Manual choice
    chosen = await Engineer.findById(engineerId);

    if (!chosen) {
      return next(new AppError('Engineer not found', 404));
    }

    if (chosen.availability !== 'available') {
      return next(
        new AppError('This engineer is not currently available', 400),
      );
    }
  } else {
    // Automatic choice: best match first, then nearest, then best rated
    const { latitude, longitude } = await getFaultCoordinates(fault.id);

    const suggestions = await Engineer.findSuggestedForFault(
      fault.fault_type,
      latitude,
      longitude,
      fault.severity,
    );

    if (suggestions.length === 0) {
      return next(
        new AppError(
          `No available engineer with a matching specialization (${matchingSpecializations.join(', ')})`,
          404,
        ),
      );
    }

    [chosen] = suggestions;
    autoAssigned = true;
  }

  const assignment = await Assignment.create({
    faultId: fault.id,
    engineerId: chosen.id,
    assignedBy: req.user.id,
    notes,
  });

  res.status(201).json({
    status: 'success',
    data: {
      assignment,
      autoAssigned,
      // false when an admin manually picked an engineer outside the matching list
      specializationMatch: matchingSpecializations.includes(
        chosen.specialization,
      ),
    },
  });
});

// NEW: GET /assignments/engineer-ranking?faultId=4
// Every engineer, ranked. Without faultId it is a general ranking.
// GET /assignments/engineer-ranking?faultId=4&eligibleOnly=true
// Every engineer, ranked. Without faultId it is a general ranking.
// With eligibleOnly=true, engineers who cannot take the fault are left out.
exports.getEngineerRanking = catchAsync(async (req, res, next) => {
  const { faultId } = req.query;
  const eligibleOnly = req.query.eligibleOnly === 'true';

  let faultType = null;
  let severity = null;
  let latitude = null;
  let longitude = null;

  if (faultId) {
    const fault = await Fault.findById(faultId);

    if (!fault) {
      return next(new AppError('Fault not found', 404));
    }

    faultType = fault.fault_type;
    ({ severity } = fault);
    ({ latitude, longitude } = await getFaultCoordinates(fault.id));
  }

  const { weights, engineers } = await Engineer.findRanked(
    faultType,
    latitude,
    longitude,
    severity,
    eligibleOnly,
  );

  res.status(200).json({
    status: 'success',
    results: engineers.length,
    data: {
      fault: faultId ? { id: Number(faultId), fault_type: faultType } : null,
      weights,
      engineers,
    },
  });
});

exports.updateAssignmentStatus = catchAsync(async (req, res, next) => {
  const allowedStatuses = [
    'accepted',
    'rejected',
    'en_route',
    'arrived',
    'in_progress',
    'inspecting',
    'fault_identified',
    'repairing',
    'testing',
    'completed',
    'cancelled',
  ];

  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return next(new AppError('Invalid assignment status', 400));
  }

  const assignments = await Assignment.findByEngineerUserId(req.user.id);

  const belongsToEngineer = assignments.some(
    (item) => Number(item.assignment_id) === Number(req.params.id),
  );

  if (!belongsToEngineer) {
    return next(new AppError('Assignment not found or access denied', 404));
  }

  const assignment = await Assignment.updateStatus(req.params.id, status);

  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { assignment },
  });
});

exports.getMyAssignments = async (req, res) => {
  try {
    // Get assignments belonging to the logged-in engineer
    const assignments = await Assignment.findByEngineerUserId(req.user.id);

    res.status(200).json({
      status: 'success',
      results: assignments.length,
      data: {
        assignments,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
};
