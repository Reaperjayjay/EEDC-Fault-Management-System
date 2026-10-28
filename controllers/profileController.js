const User = require('../models/userModel');
const Engineer = require('../models/engineersModel');
//const Performance = require('../models/performanceModel');
const Performance = require('../models/myPerformanceModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Allowed engineer specializations
const allowedSpecializations = [
  'substation',
  'feeder',
  'transformer',
  'distribution',
  'general',
];

// Allowed availability statuses
const allowedAvailability = ['available', 'busy', 'offline'];

// GET: Retrieve the logged-in engineer's complete profile
exports.getMyProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new AppError('User not found.', 404));
  }

  const engineer = await Engineer.findByUserId(req.user.id);

  if (!engineer) {
    return next(new AppError('Engineer profile not found.', 404));
  }

  const performance = await Performance.getSummary(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      profile: {
        // User information
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        role: user.role,

        // Engineer information
        engineerId: engineer.id,
        specialization: engineer.specialization,
        availability: engineer.availability,
        latitude: engineer.latitude,
        longitude: engineer.longitude,
        performanceRating: engineer.performance_rating,
        completedJobs: engineer.completed_jobs,
        experienceYears: engineer.experience_years,

        // Performance statistics
        performance: {
          assignments: performance.assignments,
          timing: performance.timing,
          reviews: performance.reviews,
          overdueAssignments: performance.overdueAssignments,
          firstTimeRepairRate: performance.firstTimeRepairRate,
        },
      },
    },
  });
});

// UPDATE: Update the logged-in engineer's profile
exports.updateMyProfile = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    specialization,
    availability,
    experienceYears,
    latitude,
    longitude,
  } = req.body;

  const userUpdates = {};
  const engineerUpdates = {};

  // Validate and prepare user information
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new AppError('Name must be a non-empty string.', 400));
    }

    userUpdates.name = name.trim();
  }

  if (email !== undefined) {
    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return next(new AppError('Please provide a valid email address.', 400));
    }

    userUpdates.email = email.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== 'string' || !phone.trim()) {
      return next(new AppError('Phone must be a non-empty string.', 400));
    }

    userUpdates.phone = phone.trim();
  }

  // Validate specialization
  if (specialization !== undefined) {
    if (!allowedSpecializations.includes(specialization)) {
      return next(new AppError('Invalid engineer specialization.', 400));
    }

    engineerUpdates.specialization = specialization;
  }

  // Validate availability
  if (availability !== undefined) {
    if (!allowedAvailability.includes(availability)) {
      return next(new AppError('Invalid engineer availability status.', 400));
    }

    engineerUpdates.availability = availability;
  }

  // Validate experience years
  if (experienceYears !== undefined) {
    const years = Number(experienceYears);

    if (
      experienceYears === '' ||
      !Number.isInteger(years) ||
      years < 0 ||
      years > 80
    ) {
      return next(
        new AppError(
          'Experience years must be a whole number between 0 and 80.',
          400,
        ),
      );
    }

    engineerUpdates.experienceYears = years;
  }

  // Validate GPS latitude
  if (latitude !== undefined) {
    if (latitude === null || latitude === '') {
      engineerUpdates.latitude = null;
    } else {
      const lat = Number(latitude);

      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return next(new AppError('Latitude must be between -90 and 90.', 400));
      }

      engineerUpdates.latitude = lat;
    }
  }

  // Validate GPS longitude
  if (longitude !== undefined) {
    if (longitude === null || longitude === '') {
      engineerUpdates.longitude = null;
    } else {
      const lng = Number(longitude);

      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return next(
          new AppError('Longitude must be between -180 and 180.', 400),
        );
      }

      engineerUpdates.longitude = lng;
    }
  }

  // Ensure at least one supported field was provided
  if (
    Object.keys(userUpdates).length === 0 &&
    Object.keys(engineerUpdates).length === 0
  ) {
    return next(
      new AppError('Provide at least one valid profile field to update.', 400),
    );
  }

  // Confirm that the user exists
  const existingUser = await User.findById(req.user.id);

  if (!existingUser) {
    return next(new AppError('User not found.', 404));
  }

  // Confirm that the engineer profile exists before making changes
  const existingEngineer = await Engineer.findByUserId(req.user.id);

  if (!existingEngineer) {
    return next(new AppError('Engineer profile not found.', 404));
  }

  // Update user information when supplied
  if (Object.keys(userUpdates).length > 0) {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, userUpdates);

    if (!updatedUser) {
      return next(new AppError('Could not update user information.', 400));
    }
  }

  // Update engineer information when supplied
  if (Object.keys(engineerUpdates).length > 0) {
    await Engineer.update(existingEngineer.id, engineerUpdates);
  }

  // Fetch the latest saved information
  const refreshedUser = await User.findById(req.user.id);
  const refreshedEngineer = await Engineer.findByUserId(req.user.id);

  if (!refreshedUser || !refreshedEngineer) {
    return next(new AppError('Could not retrieve the updated profile.', 500));
  }

  const performance = await Performance.getSummary(req.user.id);

  // Return the updated profile
  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully.',
    data: {
      profile: {
        // User information
        id: refreshedUser.id,
        name: refreshedUser.name,
        email: refreshedUser.email,
        phone: refreshedUser.phone,
        photo: refreshedUser.photo,
        role: refreshedUser.role,

        // Engineer information
        engineerId: refreshedEngineer.id,
        specialization: refreshedEngineer.specialization,
        availability: refreshedEngineer.availability,
        latitude: refreshedEngineer.latitude,
        longitude: refreshedEngineer.longitude,
        performanceRating: refreshedEngineer.performance_rating,
        completedJobs: refreshedEngineer.completed_jobs,
        experienceYears: refreshedEngineer.experience_years,

        // Performance statistics
        performance: {
          assignments: performance.assignments,
          timing: performance.timing,
          reviews: performance.reviews,
          overdueAssignments: performance.overdueAssignments,
          firstTimeRepairRate: performance.firstTimeRepairRate,
        },
      },
    },
  });
});
