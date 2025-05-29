const User = require('../models/User'); 
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const forgotPassword = async (req, res) => {
  try {
    console.log('Forgot password request received:', req.body);
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address'
      });
    }

    console.log('Looking for user with email:', email);

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }

    console.log('User found:', user.name);

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Generated reset code:', resetCode);

    // Save reset code to user
    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    console.log('Reset code saved to user');

    // For now, just log the code instead of sending email
    console.log('RESET CODE FOR', email, ':', resetCode);

    res.status(200).json({
      success: true,
      message: 'Password reset code generated (check server console for code)',
      resetCode: resetCode // Remove this in production!
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate reset code: ' + error.message
    });
  }
};