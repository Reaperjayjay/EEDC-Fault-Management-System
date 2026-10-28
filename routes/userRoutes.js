const express = require('express');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const customerDashboardController = require('../controllers/customerDashboardController');

const router = express.Router();

// PUBLIC ROUTES
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgetPassword', authController.forgetPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// PROTECT ALL ROUTES BELOW THIS LINE
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// CUSTOMER DASHBOARD
router.get(
  '/customer-dashboard',
  authController.restrictTo('user'),
  customerDashboardController.getCustomerDashboard,
);

// ONLY ADMIN CAN CHANGE USER ROLE
router.patch(
  '/:id/role',
  authController.restrictTo('admin'),
  userController.changeRole,
);

// ADMIN AND OPERATOR ROUTES
router.use(authController.restrictTo('admin', 'operator'));

router
  .route('/')
  .get(userController.getAllUser)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
