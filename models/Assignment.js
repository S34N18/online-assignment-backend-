const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, 'Please add a title']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  dueDate: {
    type: Date,
    required: [true, 'Please add a due date']
  },
  classroomId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Classroom',
    required: [true, 'Please add a classroom']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  }],
  allowedFormats: {
    type: [String],
    default: ['pdf', 'doc', 'docx', 'txt']
  },
  maxFileSize: {
    type: Number,
    default: 10 * 1024 * 1024 // 10MB in bytes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
