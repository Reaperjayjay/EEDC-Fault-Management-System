const express = require('express');

const faultController = require('../controllers/faultController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

router
  .route('/')
  .get(faultController.getAllFaults)
  .post(faultController.createFault);

router
  .route('/:id')
  .get(faultController.getFault)
  .delete(authController.restrictTo('admin'), faultController.deleteFault);

router.patch('/:id/status', faultController.updateFaultStatus);

module.exports = router;
