const User = require('../models/User'); 
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email (case insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    // Generate a 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry time for security (10 minutes)
    const expires = Date.now() + 10 * 60 * 1000;

    // Use both field names for compatibility
    user.resetCode = resetCode;
    user.resetCodeExpires = expires;
    user.passwordResetCode = resetCode; // For compatibility
    user.passwordResetExpires = expires; // For compatibility
    
    await user.save();

    // Send the code via email
    const transporter = nodemailer.createTransporter({
      service: 'Gmail', // or use SMTP config
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Use the code below to reset your password:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>Best regards,<br>Your App Team</p>
        </div>
      `,
      text: `Hello ${user.name}, use this code to reset your password: ${resetCode}. This code will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      success: true,
      message: 'Reset code sent successfully' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Something went wrong' 
    });
  }
};

module.exports = forgotPassword;