const Fault = require('../models/faultsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getAllFaults = catchAsync(async (req, res) => {
  const faults = await Fault.findAll();

  res.status(200).json({
    status: 'success',
    results: faults.length,
    data: {
      faults,
    },
  });
});

exports.getFault = catchAsync(async (req, res, next) => {
  const fault = await Fault.findById(req.params.id);

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      fault,
    },
  });
});

exports.createFault = catchAsync(async (req, res) => {
  const faultData = {
    ...req.body,
    reportedBy: req.user.id,
  };

  const fault = await Fault.create(faultData);

  res.status(201).json({
    status: 'success',
    data: {
      fault,
    },
  });
});

exports.updateFaultStatus = catchAsync(async (req, res, next) => {
  const fault = await Fault.updateStatus(req.params.id, req.body.status);

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      fault,
    },
  });
});

exports.deleteFault = catchAsync(async (req, res, next) => {
  const fault = await Fault.delete(req.params.id);

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
