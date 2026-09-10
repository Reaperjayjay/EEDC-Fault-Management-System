const Assignment = require('../models/assignmentsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

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

exports.updateAssignmentStatus = catchAsync(async (req, res, next) => {
  const assignment = await Assignment.updateStatus(
    req.params.id,
    req.body.status,
  );

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
