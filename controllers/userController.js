const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

/////for the update me
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getAllUser = catchAsync(async (req, res) => {
  const user = await User.findAll();
g
  res.status(200).json({
    status: 'success',
    results: user.length,
    data: {
      user,
    },
  });
});

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

  // update user here
});
exports.updatedUser = factory.UpdateOne(User);

// 4. Update user
// const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody);

//  if (!updatedUser) {
//  return next(new AppError('User no longer exists.', 404));
// }

// // 5. Send response
// res.status(200).json({
//   status: 'success',
//    data: {
//     user: updatedUser,
//   },
// });
//});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};
///////////////////////////////////////
exports.deleteMe = catchAsync(async (req, res, next) => {
  // Deactivate the currently logged-in user
  const user = await User.findByIdAndUpdate(req.user.id, { active: false });
  if (!user) {
    return next(new AppError('User no longer exists.', 404));
  }
  // 204 means no content
  res.status(204).json({ status: 'success', data: null });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'this route is not yet defined',
  });
};

exports.deleteUser = factory.deleteOne(User);
//exports.deleteUser = (req, res) => {
//  res.status(500).json({
//    status: 'error',
//    message: 'this route is not yet defined',
//  });
//};
