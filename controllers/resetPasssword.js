const User = require('../models/User');

const resetPassword = async (req, res) => {
  try {
    const { email, passwordResetCode, newPassword } = req.body;

    console.log('Reset password attempt:', { email, passwordResetCode });

    // Find user with reset code - try both field names for compatibility
    const user = await User.findOne({ 
      email,
      $or: [
        { resetCode: passwordResetCode },
        { passwordResetCode: passwordResetCode }
      ]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "Invalid reset code or user not found" 
      });
    }

    // Check if the reset code has expired - check both field names
    if ((user.resetCodeExpires && user.resetCodeExpires < Date.now()) ||
        (user.passwordResetExpires && user.passwordResetExpires < Date.now())) {
      return res.status(400).json({ 
        success: false,
        error: "Password reset code has expired" 
      });
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters long"
      });
    }

    // Set the new password and clear reset fields
    user.password = newPassword; // This will be hashed by the pre-save hook
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;

    await user.save(); // This triggers the pre-save hook to hash the password

    res.status(200).json({ 
      success: true,
      message: "Password reset successful" 
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ 
      success: false,
      error: "Something went wrong"
    });
  }
};

module.exports = resetPassword;