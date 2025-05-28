const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, studentId, phoneNumber } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student',
      studentId,
      phoneNumber
    });

    // Create token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    console.log('=== LOGIN DEBUG ===');
    console.log('1. Incoming credentials:', { email, password });
    
    // Check for user - Fixed email case sensitivity
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log('2. User found in DB:', user ? 'YES' : 'NO');
    
    if (user) {
      console.log('3. User details:', {
        id: user._id,
        email: user.email,
        hasPassword: !!user.password,
        isActive: user.isActive,
        role: user.role
      });
    }

    if (!user) {
      console.log('❌ FAIL: No user found');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    console.log('4. Attempting password match...');
    const isMatch = await user.matchPassword(password);
    console.log('5. Password match result:', isMatch);

    // DEBUG - Password info
    console.log('6. DEBUG - Password info:', {
      enteredPassword: password,
      storedPasswordHash: user.password,
      storedPasswordStartsWith: user.password.substring(0, 10),
      isHashed: user.password.startsWith('$2a$') || user.password.startsWith('$2b$')
    });

    if (!isMatch) {
      console.log('❌ FAIL: Password mismatch');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is active
    console.log('7. User active status:', user.isActive);
    if (!user.isActive) {
      console.log('❌ FAIL: Account deactivated');
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    console.log(' SUCCESS: All checks passed');
    
    // Create token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current password and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Create new token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create a new lecturer
// @route   POST /api/auth/create-lecturer
// @access  Public (you might want to make this Private and require admin role)
exports.createLecturer = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create lecturer
    const lecturer = await User.create({
      name,
      email,
      password,
      role: 'lecturer',
      phoneNumber
    });

    res.status(201).json({
      success: true,
      message: 'Lecturer created successfully',
      data: {
        id: lecturer._id,
        name: lecturer.name,
        email: lecturer.email,
        role: lecturer.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`
      });
    }
    
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};