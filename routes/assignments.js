const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment
} = require('../controllers/assignments');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getAssignments)
  .post(protect, authorize('lecturer'), createAssignment);

router
  .route('/:id')
  .get(protect, getAssignment)
  .put(protect, authorize('lecturer'), updateAssignment)
  .delete(protect, authorize('lecturer'), deleteAssignment);

module.exports = router;