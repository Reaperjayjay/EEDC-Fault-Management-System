const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const User = require('../models/userModel');

const catchAsync = require('../utils/catchAsync');
const Engineer = require('../models/engineersModel');

const AppError = require('../utils/appError');

const sendEmail = require('../utils/email');

// CREATE JWT TOKEN
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    secure: true,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);
  ///removing the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// SIGNUP
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  if (newUser.role === 'engineer') {
    await Engineer.create({
      userId: newUser.id,
    });
  }
  createSendToken(newUser, 201, res);
});

// LOGIN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide a valid email and password', 400));
  }

  // 2) Check if user exists
  const user = await User.findByEmail(email);

  if (!user) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if password is correct
  const correct = await User.correctPassword(password, user.password);

  if (!correct) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4) Everything is okay → create token
  createSendToken(user, 200, res);
});
//////PROTECTED
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // 1. Get token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Check if token exists
  if (!token) {
    return next(new AppError('You are not logged in, please log in', 401));
  }

  // 3. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 4. Check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }

  // 5. Check if password was changed after token was issued
  if (await User.changedPasswordAfter(currentUser, decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // 6. Check if account is active
  if (!currentUser.active) {
    return next(
      new AppError(
        'Your account has been deactivated. Please contact the administrator.',
        401,
      ),
    );
  }

  // 7. Grant access
  req.user = currentUser;

  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };

exports.forgetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on posted email
  const user = await User.findByEmail(req.body.email);

  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  // 2. Generate random reset token
  const resetToken = await User.createPasswordResetToken(user.id);

  // 3. Create reset URL
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password?

Submit a PATCH request with your new password and passwordConfirm to:

${resetURL}

If you didn't forget your password, please ignore this email.`;

  // 4. Send token to user's email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    console.log('EMAIL ERROR:', err);

    // Clear reset token from MySQL if email fails
    await User.clearPasswordResetToken(user.id);

    return next(
      new AppError(
        'There was an error sending the email. Please try again later.',
        500,
      ),
    );
  }
});
///////////////////////////////////////////////////////
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Hash the token from the URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  // 2. Find user with matching token that has not expired
  const user = await User.findByResetToken(hashedToken);
  // 3. If token is invalid or expired
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  //

  //4. Check that passwords match
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match', 400));
  }
  // 5. Update password and clear reset token
  await User.resetPassword(user.id, req.body.password);
  // 6. Log the user in by creating a new JWT
  createSendToken(user, 201, res);
  //const token = signToken(user.id);
  // 7. Send response
  //res.status(200).json({ status: 'success', token });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get the currently logged-in user
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User no longer exists.', 401));
  }

  // 2) Check if the current password is correct
  if (!(await User.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) Check that the new password and confirmation match
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords do not match.', 400));
  }

  // 4) Update the password in MySQL
  const updatedUser = await User.updatePassword(user.id, req.body.password);

  // 5) Create a new JWT and send it
  createSendToken(updatedUser, 200, res);
});
