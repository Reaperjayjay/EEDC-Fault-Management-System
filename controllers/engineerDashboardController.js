const EngineerDashboard = require('../models/engineerDashboardModel');

exports.getDashboard = async (req, res, next) => {
  try {
    // protect middleware should set req.user.
    const userId = req.user.id;

    const dashboard = await EngineerDashboard.getDashboard(userId);

    res.status(200).json({
      status: 'success',
      data: {
        dashboard,
      },
    });
  } catch (error) {
    if (error.message === 'No engineer profile is linked to this account.') {
      return res.status(404).json({
        status: 'fail',
        message: error.message,
      });
    }

    next(error);
  }
};
