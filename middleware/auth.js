const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes (only authorized users can access)
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1]; // Get token from 'Bearer <token>'
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. No token provided.'
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request object
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found, authorization failed.'
      });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid token.'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User with role '${req.user.role}' is not authorized to access this route.`
      });
    }
    next(); // Proceed if the user is authorized
  };
};


// Check if user owns resource or is admin
exports.ownerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated'
    });
  }

  // Admin can access anything
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user owns the resource (assuming req.params.id is the resource owner)
  if (req.params.id === req.user.id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Not authorized to access this resource'
  });
};

// Middleware to check classroom ownership/enrollment
exports.checkClassroomAccess = async (req, res, next) => {
  try {
    const classroomId = req.params.id || req.params.classroomId;
    
    if (!classroomId) {
      return res.status(400).json({
        success: false,
        message: 'Classroom ID is required'
      });
    }

    const Classroom = require('../models/Classroom');
    const classroom = await Classroom.findById(classroomId);

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found'
      });
    }

    // Admin has full access
    if (req.user.role === 'admin') {
      req.classroom = classroom;
      return next();
    }

    // Lecturer can access their own classrooms
    if (req.user.role === 'lecturer') {
      if (classroom.lecturerId.toString() === req.user._id.toString()) {
        req.classroom = classroom;
        return next();
      }
    }

    // Student can access classrooms they're enrolled in
    if (req.user.role === 'student') {
      const isEnrolled = classroom.students.some(
        studentId => studentId.toString() === req.user._id.toString()
      );
      if (isEnrolled) {
        req.classroom = classroom;
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this classroom'
    });

  } catch (error) {
    console.error('Classroom access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking classroom access'
    });
  }
};

// Middleware to log user actions (optional)
exports.logUserAction = (action) => {
  return (req, res, next) => {
    console.log(`User ${req.user.email} (${req.user.role}) performed action: ${action} at ${new Date().toISOString()}`);
    next();
  };
};