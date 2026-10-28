const express = require('express');

const router = express.Router();

const { protect, restrictTo } = require('../controllers/authController');

const {
  getMyProfile,
  updateMyProfile,
} = require('../controllers/profileController');

router.use(protect);
router.use(restrictTo('engineer', 'user'));

router.route('/me').get(getMyProfile).patch(updateMyProfile);

module.exports = router;
