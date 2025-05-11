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
