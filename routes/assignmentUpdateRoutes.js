const express = require('express');

const assignmentUpdateController = require('../controllers/assignmentUpdateController');

const authController = require('../controllers/authController');

const router = express.Router();

// Every route requires login
router.use(authController.protect);

// Engineer creates progress update
router.post(
  '/',
  authController.restrictTo('engineer'),
  assignmentUpdateController.createUpdate,
);

// Admin/operator can view all progress
router.get(
  '/',
  authController.restrictTo('admin', 'operator'),
  assignmentUpdateController.getAllUpdates,
);

// Get progress history for an assignment
router.get(
  '/assignment/:assignmentId',
  assignmentUpdateController.getAssignmentUpdates,
);

// Get one update
router.get('/:id', assignmentUpdateController.getUpdate);

module.exports = router;
