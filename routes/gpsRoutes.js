const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const gpsController = require('../controllers/gpsController');

router.use(authController.protect);

router.get(
  '/my-assignments',
  authController.restrictTo('engineer'),
  gpsController.getMyAssignments,
);

router.post(
  '/:id/location',
  authController.restrictTo('engineer'),
  gpsController.updateLocation,
);

router.post(
  '/:id/check-in',
  authController.restrictTo('engineer'),
  gpsController.checkIn,
);

module.exports = router;
