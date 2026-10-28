const express = require('express');
const authController = require('../controllers/authController');
const engineerDashboardController = require('../controllers/engineerDashboardController');

const router = express.Router();

router.use(authController.protect);
router.use(authController.restrictTo('engineer'));

router.get('/', engineerDashboardController.getDashboard);

module.exports = router;
