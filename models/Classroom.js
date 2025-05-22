const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true, // Remove whitespace from start and end
  },
  code: {
    type: String,
    required: true,
    unique: true, // Keeps unique code constraint
    trim: true,
    uppercase: true, // Normalize code to uppercase
  },
  description: {
    type: String,
    trim: true,
  },
  lecturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Only a lecturer can create a class
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { 
  timestamps: true,
  // Add a compound index to allow same name for different lecturers
  index: { name: 1, lecturerId: 1 }
});

// Pre-save hook to ensure code is uppercase
classroomSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Classroom', classroomSchema);