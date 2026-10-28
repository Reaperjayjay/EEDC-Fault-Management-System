const express = require('express');

const engineerManagementController = require('../controllers/Engineermanagementcontroller');
const authController = require('../controllers/authController');

const router = express.Router();

// Admin and operator pages only.
router.use(authController.protect);
router.use(authController.restrictTo('admin', 'operator'));

router.get('/', engineerManagementController.getAll);
router.get('/:id', engineerManagementController.getOne);
router.patch('/:id', engineerManagementController.updateDetails);
router.patch('/:id/active', engineerManagementController.setActive);

module.exports = router;
