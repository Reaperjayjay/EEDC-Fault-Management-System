const express = require('express');

const performanceReviewController = require('../controllers/performanceReviewController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Create performance review
router.post(
  '/',
  authController.restrictTo('admin', 'operator'),
  performanceReviewController.createReview,
);

// Get all performance reviews
router.get(
  '/',
  authController.restrictTo('admin', 'operator'),
  performanceReviewController.getAllReviews,
);

// Get one performance review
router.get('/:id', performanceReviewController.getReview);

module.exports = router;
