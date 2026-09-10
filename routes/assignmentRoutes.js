const express = require('express');

const assignmentController = require('../controllers/assignmentController');
const authController = require('../controllers/authController');

const router = express.Router();

// ALL ASSIGNMENT ROUTES REQUIRE LOGIN
router.use(authController.protect);

// GET ALL ASSIGNMENTS
// CREATE ASSIGNMENT
router
  .route('/')
  .get(assignmentController.getAllAssignments)
  .post(
    authController.restrictTo('admin', 'operator'),
    assignmentController.createAssignment,
  );

router
  .route('/my-assignments')
  .get(
    authController.protect,
    authController.restrictTo('engineer'),
    assignmentController.getMyAssignments,
  );

// GET ONE ASSIGNMENT
router.get('/:id', assignmentController.getAssignment);

// UPDATE ASSIGNMENT STATUS
router.patch('/:id/status', assignmentController.updateAssignmentStatus);

module.exports = router;
