const express = require('express');
const engineerController = require('../controllers/engineerController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// IMPORTANT: /me must come before /:id
router.patch(
  '/me',
  authController.restrictTo('engineer'),
  engineerController.updateMyProfile,
);

router
  .route('/')
  .get(
    authController.restrictTo('admin', 'operator'),
    engineerController.getAllEngineers,
  )
  .post(
    authController.restrictTo('admin', 'operator'),
    engineerController.createEngineer,
  );

router
  .route('/:id')
  .get(engineerController.getEngineer)
  .patch(
    authController.restrictTo('admin', 'operator'),
    engineerController.updateEngineer,
  )
  .delete(
    authController.restrictTo('admin'),
    engineerController.deleteEngineer,
  );

module.exports = router;
