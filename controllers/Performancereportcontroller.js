const PerformanceReport = require('../models/Performancereportmodel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD. Returns { range } or { error }.
const readRange = (query) => {
  const from = query.from || null;
  const to = query.to || null;

  if ((from && !DATE_PATTERN.test(from)) || (to && !DATE_PATTERN.test(to))) {
    return { error: 'Dates must use the format YYYY-MM-DD' };
  }

  if (from && to && from > to) {
    return { error: 'The start date must be before the end date' };
  }

  return { range: { from, to } };
};

// GET /performance-reports/reviewable-assignments
// Completed assignments that are waiting for a performance review.
exports.getReviewableAssignments = catchAsync(async (req, res) => {
  const assignments = await PerformanceReport.findReviewableAssignments();

  res.status(200).json({
    status: 'success',
    results: assignments.length,
    data: { assignments },
  });
});

// GET /performance-reports/overview?from=&to=
exports.getOverview = catchAsync(async (req, res, next) => {
  const { range, error } = readRange(req.query);
  if (error) return next(new AppError(error, 400));

  const summary = await PerformanceReport.getOverview(range);

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalReviewed: Number(summary.total_reviewed),
        avgScore: Number(summary.avg_score),
        completedJobs: Number(summary.completed_jobs),
        reviews: Number(summary.reviews),
      },
    },
  });
});

// GET /performance-reports/engineers-summary?from=&to=
exports.getEngineersSummary = catchAsync(async (req, res, next) => {
  const { range, error } = readRange(req.query);
  if (error) return next(new AppError(error, 400));

  const engineers = await PerformanceReport.getEngineersSummary(range);

  res.status(200).json({
    status: 'success',
    results: engineers.length,
    data: { engineers },
  });
});

// GET /performance-reports/engineers/:id?from=&to=
exports.getEngineerDetails = catchAsync(async (req, res, next) => {
  const { range, error } = readRange(req.query);
  if (error) return next(new AppError(error, 400));

  const engineer = await PerformanceReport.getEngineerDetails(
    req.params.id,
    range,
  );

  if (!engineer) {
    return next(new AppError('Engineer not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { engineer },
  });
});
