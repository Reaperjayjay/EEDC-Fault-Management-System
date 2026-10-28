const express = require('express');

const performanceReviewController = require('../controllers/performanceReviewController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Create a performance review
router.post(
  '/create',
  authController.restrictTo('admin', 'operator'),
  performanceReviewController.createReview,
);

// Get all performance reviews (admin/operator only)
router.get(
  '/getAll',
  authController.restrictTo('admin', 'operator'),
  performanceReviewController.getAllReviews,
);

// Get reviews for the logged-in engineer
router.get(
  '/my-reviews',
  authController.restrictTo('engineer'),
  performanceReviewController.getMyReviews,
);

// Get the logged-in engineer's performance summary
router.get(
  '/my-performance-summary',
  authController.restrictTo('engineer'),
  performanceReviewController.getMyPerformanceSummary,
);

// Get one performance review by ID
router.get('/:id', performanceReviewController.getReview);

module.exports = router;
