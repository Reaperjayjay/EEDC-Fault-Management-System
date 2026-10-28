const express = require('express');

const performanceReportController = require('../controllers/Performancereportcontroller');
const authController = require('../controllers/authController');

const router = express.Router();

// Admin and operator pages only.
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'operator'));

router.get(
  '/reviewable-assignments',
  performanceReportController.getReviewableAssignments,
);
router.get('/overview', performanceReportController.getOverview);
router.get(
  '/engineers-summary',
  performanceReportController.getEngineersSummary,
);
router.get('/engineers/:id', performanceReportController.getEngineerDetails);

module.exports = router;
