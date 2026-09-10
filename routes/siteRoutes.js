const express = require('express');
const siteController = require('../controllers/siteController');
const authController = require('../controllers/authController');
const engineerController = require('../controllers/engineerController');

const router = express.Router();
//router.param('id', siteController.checkID);

router
  .route('/')
  .get(authController.protect, siteController.GetAllSite)
  .post(siteController.CreateSite);

router.patch(
  '/me',
  authController.restrictTo('engineer'),
  engineerController.updateMyProfile,
);

router
  .route('/:id')
  .get(siteController.Getonesite)
  .patch(siteController.Updatesite)
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'operator'),
    siteController.deleteSite,
  );

module.exports = router;
