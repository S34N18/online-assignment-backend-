// routes/dev.js (or any dev-only route file)
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const router = express.Router();

// POST /api/dev/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: 'Email and new password are required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: 'Password reset successfully (DEV ONLY)' });
  } catch (error) {
    console.error('Dev password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
