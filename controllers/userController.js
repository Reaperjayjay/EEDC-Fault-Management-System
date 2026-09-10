const User = require('../models/userModel');

const AppError = require('../utils/appError');

const catchAsync = require('../utils/catchAsync');

const factory = require('./handlerFactory');

// For the update me
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
};

exports.getAllUser = factory.getAll(User, 'users');

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Don't allow password updates here
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }

  // 2. Only allow these fields
  const filteredBody = filterObj(req.body, 'name', 'email', 'phone');

  // 3. Make sure there is something valid to update
  if (Object.keys(filteredBody).length === 0) {
    return next(
      new AppError(
        'Please provide at least one valid field to update: name, email, or phone.',
        400,
      ),
    );
  }

  // 4. Update user
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody);

  if (!updatedUser) {
    return next(new AppError('User no longer exists.', 404));
  }

  // 5. Send response
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

// Deactivate currently logged-in user
exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user.id, {
    active: false,
  });

  if (!user) {
    return next(new AppError('User no longer exists.', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  console.log('REQ.USER:', req.user);
  console.log('REQ.USER.ID:', req.user.id);

  req.params.id = req.user.id;

  next();
});

exports.getUser = factory.getOne(User, 'user');

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

exports.deleteUser = factory.deleteOne(User);

/////change role
exports.changeRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  const updatedUser = await User.changeRole(req.params.id, role);

  if (!updatedUser) {
    return next(new AppError('No user found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
