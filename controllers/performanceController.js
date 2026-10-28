const Performance = require('../models/performanceModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// GET /api/v1/performance/my-summary
exports.getMySummary = catchAsync(async (req, res) => {
  const summary = await Performance.getSummary(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { summary },
  });
});

// GET /api/v1/performance/my-history?period=monthly
// GET /api/v1/performance/my-history?period=quarterly
exports.getMyHistory = catchAsync(async (req, res, next) => {
  const period = req.query.period || 'monthly';

  if (!['monthly', 'quarterly'].includes(period)) {
    return next(
      new AppError('Invalid period. Choose monthly or quarterly.', 400),
    );
  }

  const history = await Performance.getHistory(req.user.id, period);

  res.status(200).json({
    status: 'success',
    period,
    results: history.length,
    data: { history },
  });
});
