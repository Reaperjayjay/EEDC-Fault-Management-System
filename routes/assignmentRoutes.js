const express = require('express');

const assignmentController = require('../controllers/assignmentController');
const authController = require('../controllers/authController');

const router = express.Router();

// All assignment routes require authentication.
router.use(authController.protect);

// List all assignments and create an assignment.
router
  .route('/')
  .get(
    authController.restrictTo('admin', 'operator'),
    assignmentController.getAllAssignments,
  )
  .post(
    authController.restrictTo('admin', 'operator'),
    assignmentController.createAssignment,
  );

// Only the logged-in engineer can retrieve their own assignments.
router.get(
  '/my-assignments',
  authController.restrictTo('engineer'),
  assignmentController.getMyAssignments,
);

// NEW: all engineers ranked, optionally for one fault (?faultId=4).
router.get(
  '/engineer-ranking',
  authController.restrictTo('admin', 'operator'),
  assignmentController.getEngineerRanking,
);

// NEW: engineers suited to a fault (matched by specialization, distance, rating).
router.get(
  '/faults/:faultId/suggested-engineers',
  authController.restrictTo('admin', 'operator'),
  assignmentController.getSuggestedEngineers,
);

// NEW: assign an engineer to a fault.
// Send { "engineerId": 3 } to choose one, or {} to auto-assign the best match.
router.post(
  '/faults/:faultId/assign',
  authController.restrictTo('admin', 'operator'),
  assignmentController.assignEngineer,
);

// Get one assignment.
router.get('/:id', assignmentController.getAssignment);

// Update the status of an assignment belonging to the engineer.
router.patch(
  '/:id/status',
  authController.restrictTo('engineer'),
  assignmentController.updateAssignmentStatus,
);

module.exports = router;
