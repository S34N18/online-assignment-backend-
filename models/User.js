// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true, // Automatically convert to lowercase
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['student', 'lecturer'],
    default: 'student'
  },
  studentId: {
    type: String,
    sparse: true, // Allow null but must be unique if present
    validate: {
      validator: function(v) {
        // Only require studentId if role is student
        return this.role !== 'student' || (v && v.length > 0);
      },
      message: 'Student ID is required for student accounts'
    }
  },
  phoneNumber: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Fields for password reset
  resetCode: String,
  resetCodeExpires: Date,
  // Alternative field names for compatibility
  passwordResetCode: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified or new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash password with salt rounds of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords during login - MAIN METHOD YOUR AUTH USES
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Alternative method name for compatibility
userSchema.methods.comparePassword = async function(enteredPassword) {
  return this.matchPassword(enteredPassword);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Ensure unique indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);