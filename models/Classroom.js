
const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Ensures classroom names are unique
  },
  code: {
    type: String,
    required: true,
    unique: true, // Classroom code (maybe a short identifier)
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
}, { timestamps: true });

module.exports = mongoose.model('Classroom', classroomSchema);
