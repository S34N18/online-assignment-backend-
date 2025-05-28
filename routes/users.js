const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  getMyProfile,
  updateMyProfile,
  createUser,
  updateUser,
  deleteUser,
  getMyStudents,
  getLecturers,
  changePassword
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');

// ========== ROUTES FOR ALL AUTHENTICATED USERS ==========

// Get my profile
router.get('/me', protect, getMyProfile);

// Update my profile
router.put('/me', protect, updateMyProfile);

// Change password
router.put('/change-password', protect, changePassword);

// Get lecturers (role-based access)
router.get('/lecturers', protect, getLecturers);

// ========== ADMIN & LECTURER ROUTES ==========

// Get all users (Admin sees all, Lecturers see only students)
router.get('/', protect, authorize('lecturer' ), getUsers);

// Create user (Admin can create any, Lecturers can create only students)
router.post('/', protect, authorize('lecturer'), createUser);

// ========== LECTURER-SPECIFIC ROUTES ==========

// Get my students (Lecturers only)
router.get('/my-students', protect, authorize('lecturer'), getMyStudents);

// ========== INDIVIDUAL USER ROUTES ==========

// Get single user (role-based access)
router.get('/:id', protect, getUser);

// Update user (Admin full access, Lecturers limited to students)
router.put('/:id', protect, authorize('lecturer'), updateUser);

// Delete user (Admin full access, Lecturers limited to students)
router.delete('/:id', protect, authorize('lecturer'), deleteUser);

module.exports = router;