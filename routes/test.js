const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Protected route (any logged-in user)
router.get('/protected', protect, (req, res) => {
  res.json({
    success: true,
    message: `Hello ${req.user.name}, you have access to this protected route`
  });
});

// Admin-only route
router.get('/admin-only', protect, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome, admin ${req.user.name}`
  });
});

module.exports = router;
