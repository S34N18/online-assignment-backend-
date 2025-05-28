const express = require('express');
const router = express.Router();
const {
  createClassroom,
  getClassrooms,
  getClassroomById,
  getMyClassrooms,
  joinClassroom,
  leaveClassroom,
  addMultipleStudents,
  removeStudents,
  getClassroomAssignments,
  getAvailableStudents,
  getClassroomStudents
} = require('../controllers/classroom');

const { protect, authorize } = require('../middleware/auth');

// ========== PUBLIC ROUTES (with authentication) ==========

// Get all classrooms based on user role
router.get('/', protect, getClassrooms);

// Get my specific classrooms (role-based)
router.get('/my-classrooms', protect, getMyClassrooms);

// Get single classroom by ID (role-based access)
router.get('/:id', protect, getClassroomById);

// Get assignments for a classroom (role-based access)
router.get('/:id/assignments', protect, getClassroomAssignments);

// ========== LECTURER-ONLY ROUTES ==========

// Create classroom
router.post('/', protect, authorize('lecturer', 'admin'), createClassroom);

// Get available students for a classroom
router.get('/:id/available-students', protect, authorize('lecturer', 'admin'), getAvailableStudents);

// Get students in a classroom
router.get('/:id/students', protect, authorize('lecturer', 'admin'), getClassroomStudents);

// Add multiple students to classroom
router.post('/:id/add-students', protect, authorize('lecturer', 'admin'), addMultipleStudents);

// Remove students from classroom
router.put('/:classroomId/remove-students', protect, authorize('lecturer', 'admin'), removeStudents);

// ========== STUDENT-ONLY ROUTES ==========

// Join classroom by code
router.post('/join', protect, authorize('student'), joinClassroom);

// Leave classroom
router.delete('/:id/leave', protect, authorize('student'), leaveClassroom);

module.exports = router;