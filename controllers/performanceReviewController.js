const PerformanceReview = require('../models/performanceReviewModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createReview = catchAsync(async (req, res, next) => {
  console.log('🔥 CREATE REVIEW CALLED');

  const {
    assignmentId,
    resolutionQuality,
    diagnosis,
    safetyCompliance,
    comments,
  } = req.body;

  console.log('BODY:', req.body);

  if (
    !assignmentId ||
    resolutionQuality === undefined ||
    diagnosis === undefined ||
    safetyCompliance === undefined
  ) {
    return next(
      new AppError(
        'Please provide assignmentId, resolutionQuality, diagnosis and safetyCompliance',
        400,
      ),
    );
  }

  console.log('✅ VALIDATION PASSED');

  if (
    resolutionQuality < 1 ||
    resolutionQuality > 5 ||
    diagnosis < 1 ||
    diagnosis > 5 ||
    safetyCompliance < 1 ||
    safetyCompliance > 5
  ) {
    return next(
      new AppError('Performance scores must be between 1 and 5', 400),
    );
  }

  console.log('✅ SCORE VALIDATION PASSED');

  console.log('⏳ ABOUT TO CALL PerformanceReview.create()');

  const review = await PerformanceReview.create({
    assignmentId,
    reviewedBy: req.user.id,
    resolutionQuality,
    diagnosis,
    safetyCompliance,
    comments,
  });

  console.log('✅ REVIEW CREATED:', review);

  res.status(201).json({
    status: 'success',
    data: {
      review,
    },
  });
});

exports.getAllReviews = catchAsync(async (req, res) => {
  const reviews = await PerformanceReview.findAll();

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
    },
  });
});

exports.getReview = catchAsync(async (req, res, next) => {
  const review = await PerformanceReview.findById(req.params.id);

  if (!review) {
    return next(new AppError('Performance review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      review,
    },
  });
});
