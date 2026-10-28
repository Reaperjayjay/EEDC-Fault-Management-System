const Fault = require('../models/faultsModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const { autoAssignBestEngineer } = require('../utils/autoAssign');
const Site = require('../models/sitesModel'); // <-- 1. add at the top

exports.getAllFaults = factory.getAll(Fault, 'faults');

exports.getFault = factory.getOne(Fault, 'fault');

exports.createFault = catchAsync(async (req, res, next) => {
  try {
    console.log('FAULT REQUEST BODY:', req.body);

    const faultData = {
      ...req.body,
      reportedBy: req.user.id,
    };

    console.log('FAULT DATA TO SAVE:', faultData);

    const fault = await Fault.create(faultData);

    // Automatically assign the best available engineer.
    // This must never stop the fault report from being saved.
    let autoAssignment = null;

    if (process.env.AUTO_ASSIGN_ON_CREATE !== 'false') {
      try {
        autoAssignment = await autoAssignBestEngineer(fault.id, req.user.id);
        console.log('AUTO ASSIGN RESULT:', autoAssignment);
      } catch (assignError) {
        console.warn('Auto-assign failed:', assignError.message);
        autoAssignment = { assigned: false, reason: 'Auto-assign error' };
      }
    }

    res.status(201).json({
      status: 'success',
      data: {
        fault,
        autoAssignment,
      },
    });
  } catch (error) {
    console.error('CREATE FAULT ERROR:', error);
    next(error);
  }
});

exports.updateFaultStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const fault = await Fault.findByIdAndUpdate(req.params.id, { status });

  if (!fault) {
    return next(new AppError('Fault not found', 404));
  }

  // 2. add here: after the update, before the response
  await Site.syncStatusWithFaults(fault.site_id);

  res.status(200).json({
    status: 'success',
    data: { fault },
  });
});

exports.getMyFaults = catchAsync(async (req, res) => {
  const faults = await Fault.findByReporter(req.user.id);

  res.status(200).json({
    status: 'success',
    results: faults.length,
    data: {
      faults,
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
