const GPSModel = require('../models/gpsModel');
const catchAsync = require('../utils/catchAsync');

// Check whether coordinates are valid
const validCoordinates = (latitude, longitude) =>
  latitude !== undefined &&
  latitude !== null &&
  longitude !== undefined &&
  longitude !== null &&
  String(latitude).trim() !== '' &&
  String(longitude).trim() !== '' &&
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude)) &&
  Number(latitude) >= -90 &&
  Number(latitude) <= 90 &&
  Number(longitude) >= -180 &&
  Number(longitude) <= 180;

// GET /api/v1/gps/my-assignments
exports.getMyAssignments = catchAsync(async (req, res, next) => {
  const assignments = await GPSModel.getMyAssignments(req.user.id);

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: { assignments },
  });
});

// POST /api/v1/gps/:id/location
exports.updateLocation = catchAsync(async (req, res, next) => {
  const { latitude, longitude } = req.body;
  const assignmentId = req.params.id;

  if (!validCoordinates(latitude, longitude)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Provide valid latitude and longitude values.',
    });
  }

  const assignment = await GPSModel.findEngineerAssignment(
    assignmentId,
    req.user.id,
  );

  if (!assignment) {
    return res.status(404).json({
      status: 'fail',
      message: 'Assignment not found for this engineer.',
    });
  }

  await GPSModel.saveLocation(
    assignmentId,
    req.user.id,
    Number(latitude),
    Number(longitude),
  );

  res.status(201).json({
    status: 'success',
    message: 'GPS location saved.',
    data: {
      assignment_id: Number(assignmentId),
      latitude: Number(latitude),
      longitude: Number(longitude),
    },
  });
});

// POST /api/v1/gps/:id/check-in
exports.checkIn = catchAsync(async (req, res, next) => {
  const { latitude, longitude, notes } = req.body;
  const assignmentId = req.params.id;

  // Coordinates are optional, but both must be supplied together.
  const hasCoordinates =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null;

  if (
    (latitude === undefined || latitude === null) !==
      (longitude === undefined || longitude === null) ||
    (hasCoordinates && !validCoordinates(latitude, longitude))
  ) {
    return res.status(400).json({
      status: 'fail',
      message: 'Provide both valid latitude and longitude values.',
    });
  }

  const assignment = await GPSModel.findEngineerAssignment(
    assignmentId,
    req.user.id,
  );

  if (!assignment) {
    return res.status(404).json({
      status: 'fail',
      message: 'Assignment not found for this engineer.',
    });
  }

  await GPSModel.createCheckIn(
    assignmentId,
    req.user.id,
    hasCoordinates ? Number(latitude) : null,
    hasCoordinates ? Number(longitude) : null,
    notes || null,
  );

  res.status(201).json({
    status: 'success',
    message: 'Arrival at the fault site recorded.',
    data: {
      assignment_id: Number(assignmentId),
      checked_in: true,
    },
  });
});
