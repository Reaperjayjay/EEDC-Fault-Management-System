const Engineer = require('../models/engineersModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllEngineers = catchAsync(async (req, res) => {
  const engineers = await Engineer.findAll();

  res.status(200).json({
    status: 'success',
    results: engineers.length,
    data: {
      engineers,
    },
  });
});

exports.getEngineer = catchAsync(async (req, res, next) => {
  const engineer = await Engineer.findById(req.params.id);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      engineer,
    },
  });
});

exports.createEngineer = catchAsync(async (req, res) => {
  const engineer = await Engineer.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      engineer,
    },
  });
});

exports.updateEngineer = catchAsync(async (req, res, next) => {
  const engineer = await Engineer.update(req.params.id, req.body);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      engineer,
    },
  });
});

////////
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  console.log('🔥 UPDATE MY PROFILE WAS CALLED');

  const engineer = await Engineer.findByUserId(req.user.id);

  console.log('REQ.USER:', req.user);
  console.log('ENGINEER:', engineer);

  if (!engineer) {
    return next(new AppError('Engineer profile not found', 404));
  }

  const updatedEngineer = await Engineer.update(engineer.id, req.body);

  res.status(200).json({
    status: 'success',
    data: {
      engineer: updatedEngineer,
    },
  });
});

exports.deleteEngineer = catchAsync(async (req, res, next) => {
  const engineer = await Engineer.delete(req.params.id);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
