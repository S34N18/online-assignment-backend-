const express = require('express');
const router = express.Router();
const {
  createClassroom,
  getClassrooms,
  getClassroomById,
  addStudents,
  removeStudents,
  getClassroomAssignments
} = require('../controllers/classroom');

const { protect, authorize } = require('../middleware/auth');

// Routes

// Create classroom → Only lecturers
router.post('/', protect, authorize('lecturer'), createClassroom);

// Get classrooms → Lecturers can view their own, admins can view all
router.get('/', protect, getClassrooms);

// Get single classroom by ID
router.get('/:id', protect, getClassroomById);

// Add students to a classroom → Only lecturers
router.put('/add-students/:classroomId', protect, authorize('lecturer'), addStudents);

// Remove students from a classroom → Only lecturers
router.put('/remove-students/:classroomId', protect, authorize('lecturer'), removeStudents);

// Get assignments for a classroom 
router.get('/:classroomId/assignments', protect, getClassroomAssignments);


module.exports = router;