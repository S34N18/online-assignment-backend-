const express = require('express');
const router = express.Router();
const {
  createClassroom,
  getClassrooms,
  addStudents,
  removeStudents
} = require('../controllers/classroomController');

const { protect, authorize } = require('../middleware/auth');

// Routes

// Create classroom → Only lecturers
router.post('/', protect, authorize('lecturer'), createClassroom);

// Get classrooms → Lecturers can view their own, admins can view all
router.get('/', protect, getClassrooms);

// Add students to a classroom → Only lecturers
router.put('/add-students/:classroomId', protect, authorize('lecturer'), addStudents);

// Remove students from a classroom → Only lecturers
router.put('/remove-students/:classroomId', protect, authorize('lecturer'), removeStudents);

module.exports = router;
