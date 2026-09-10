const AssignmentUpdate = require('../models/assignmentUpdatesModel');
const Engineer = require('../models/engineersModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Engineer records a progress update
exports.createUpdate = catchAsync(async (req, res, next) => {
  const { assignmentId, status } = req.body;

  if (!assignmentId || !status) {
    return next(new AppError('Please provide assignmentId and status', 400));
  }

  // Find engineer profile belonging to logged-in user
  const engineer = await Engineer.findByUserId(req.user.id);

  if (!engineer) {
    return next(new AppError('Engineer profile not found', 404));
  }

  const update = await AssignmentUpdate.create({
    assignmentId,
    engineerId: engineer.id,
    status,
  });

  res.status(201).json({
    status: 'success',
    data: {
      update,
    },
  });
});

// Get all updates
exports.getAllUpdates = catchAsync(async (req, res) => {
  const updates = await AssignmentUpdate.findAll();

  res.status(200).json({
    status: 'success',
    results: updates.length,
    data: {
      updates,
    },
  });
});

// Get one update
exports.getUpdate = catchAsync(async (req, res, next) => {
  const update = await AssignmentUpdate.findById(req.params.id);

  if (!update) {
    return next(new AppError('Assignment update not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      update,
    },
  });
});

// Get progress history for one assignment
exports.getAssignmentUpdates = catchAsync(async (req, res) => {
  const updates = await AssignmentUpdate.findByAssignmentId(
    req.params.assignmentId,
  );

  res.status(200).json({
    status: 'success',
    results: updates.length,
    data: {
      updates,
    },
  });
});
