const EngineerManagement = require('../models/Engineermanagementmodel');
const Engineer = require('../models/engineersModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const SPECIALIZATIONS = [
  'substation',
  'feeder',
  'transformer',
  'distribution',
  'general',
];

const FINISHED_STATUSES = ['completed', 'rejected', 'cancelled'];

// GET /engineer-management
// The engineers, plus every user (for the "Change role" picker).
exports.getAll = catchAsync(async (req, res) => {
  const engineers = await EngineerManagement.findAllEngineers();
  const users = await EngineerManagement.findUsers();

  res.status(200).json({
    status: 'success',
    results: engineers.length,
    data: { engineers, users },
  });
});

// GET /engineer-management/:id
exports.getOne = catchAsync(async (req, res, next) => {
  const engineer = await EngineerManagement.findOneEngineer(req.params.id);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  const assignments = await EngineerManagement.findAssignments(engineer.id);

  res.status(200).json({
    status: 'success',
    data: {
      engineer,
      currentAssignments: assignments.filter(
        (item) => !FINISHED_STATUSES.includes(item.status),
      ),
      pastAssignments: assignments.filter((item) =>
        FINISHED_STATUSES.includes(item.status),
      ),
    },
  });
});

// PATCH /engineer-management/:id
// Body: { specialization?, experienceYears?, phone? }
exports.updateDetails = catchAsync(async (req, res, next) => {
  const { specialization, experienceYears, phone } = req.body;

  const engineer = await EngineerManagement.findOneEngineer(req.params.id);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  if (
    specialization !== undefined &&
    !SPECIALIZATIONS.includes(specialization)
  ) {
    return next(new AppError('Invalid specialization', 400));
  }

  if (
    experienceYears !== undefined &&
    (!Number.isInteger(Number(experienceYears)) ||
      Number(experienceYears) < 0 ||
      Number(experienceYears) > 60)
  ) {
    return next(
      new AppError('Experience must be a whole number from 0 to 60', 400),
    );
  }

  await Engineer.update(engineer.id, {
    specialization,
    experienceYears:
      experienceYears === undefined ? undefined : Number(experienceYears),
    phone: phone === undefined ? undefined : String(phone).trim(),
  });

  const updated = await EngineerManagement.findOneEngineer(engineer.id);

  res.status(200).json({ status: 'success', data: { engineer: updated } });
});

// PATCH /engineer-management/:id/active
// Body: { active: true | false }
exports.setActive = catchAsync(async (req, res, next) => {
  const { active } = req.body;

  if (typeof active !== 'boolean') {
    return next(new AppError('"active" must be true or false', 400));
  }

  const engineer = await EngineerManagement.findOneEngineer(req.params.id);

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  if (!active) {
    const live = await EngineerManagement.countLiveAssignments(engineer.id);

    if (live > 0) {
      return next(
        new AppError(
          'This engineer still has an active assignment. Wait until it is finished or cancelled.',
          409,
        ),
      );
    }
  }

  await EngineerManagement.setAccountActive(engineer.id, active);

  const updated = await EngineerManagement.findOneEngineer(engineer.id);

  res.status(200).json({ status: 'success', data: { engineer: updated } });
});
