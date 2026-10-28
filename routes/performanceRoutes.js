const express = require('express');
const authController = require('../controllers/authController');
const performanceController = require('../controllers/performanceController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('engineer'));

// Engineer's calculated performance statistics
router.get('/my-summary', performanceController.getMySummary);

// Engineer's monthly or quarterly history
router.get('/my-history', performanceController.getMyHistory);

module.exports = router;
