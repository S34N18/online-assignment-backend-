const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const mongoose = require('mongoose');

// Create a classroom
exports.createClassroom = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    // Check if classroom code already exists
    const existingClassroom = await Classroom.findOne({ code: code.toUpperCase() });
    if (existingClassroom) {
      return res.status(400).json({ 
        message: 'Classroom code already exists. Please use a unique code.' 
      });
    }

    // Create new classroom
    const newClassroom = new Classroom({
      name: name.trim(),
      code: code.toUpperCase(),
      description: description ? description.trim() : '',
      lecturerId: req.user._id,
    });

    await newClassroom.save();
    
    // Populate lecturer details in the response
    await newClassroom.populate('lecturerId', 'name email');

    res.status(201).json(newClassroom);
  } catch (err) {
    console.error('Classroom creation error:', err);
    
    // Handle unique constraint error
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: 'A classroom with this code already exists.' 
      });
    }

    res.status(500).json({ 
      message: 'Error creating classroom',
      error: err.message 
    });
  }
};

// Get all classrooms
exports.getClassrooms = async (req, res) => {
  try {
    let classrooms;
    const populateOptions = {
      path: 'lecturerId',
      select: 'name email'
    };

    if (req.user.role === 'admin') {
      classrooms = await Classroom.find()
        .populate(populateOptions)
        .select('name code description lecturerId students');
    } else if (req.user.role === 'lecturer') {
      classrooms = await Classroom.find({ lecturerId: req.user._id })
        .populate(populateOptions)
        .select('name code description lecturerId students');
    } else {
      return res.status(403).json({ message: 'Not authorized to view classrooms' });
    }

    return res.status(200).json(classrooms);
      } catch (err) {
    console.error('Classroom fetch error:', err);
    res.status(500).json({ 
      message: 'Error fetching classrooms', 
      error: err.message 
    });
  }
};

// Get classroom by ID
exports.getClassroomById = async (req, res) => {
  try {
    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(req.params.id)
      .populate('lecturerId', 'name email')
      .populate('students', 'name email');

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check if user has permission to view this classroom
    if (req.user.role !== 'admin' && 
        classroom.lecturerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this classroom' });
    }

    res.status(200).json(classroom);
  } catch (err) {
    console.error('Error fetching classroom details:', err);
    res.status(500).json({ 
      message: 'Error fetching classroom details', 
      error: err.message 
    });
  }
};

// Add students
exports.addStudents = async (req, res) => {
  const { classroomId } = req.params;
  const { studentIds } = req.body;

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

    // Prevent duplicate student additions
    const uniqueStudentIds = [...new Set([
      ...classroom.students.map(id => id.toString()),
      ...studentIds
    ])];

    classroom.students = uniqueStudentIds;
    await classroom.save();

    await classroom.populate({
      path: 'students',
      select: 'name email'
    });

    res.status(200).json(classroom);
  } catch (err) {
    console.error('Add students error:', err);
    res.status(500).json({ 
      message: 'Error adding students to classroom',
      error: err.message 
    });
  }
};

// Remove students
exports.removeStudents = async (req, res) => {
  const { classroomId } = req.params;
  const { studentIds } = req.body;

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

    classroom.students = classroom.students.filter(
      studentId => !studentIds.includes(studentId.toString())
    );

    await classroom.save();

    res.status(200).json({
      message: 'Students removed successfully',
      classroom
    });
  } catch (err) {
    console.error('Remove students error:', err);
    res.status(500).json({ 
      message: 'Error removing students from classroom',
      error: err.message 
    });
  }
};


// Get classroom assignments
exports.getClassroomAssignments = async (req, res) => {
    try {
      const classroomId = req.params.id;
  
      const assignments = await Assignment.find({ classroom: classroomId });
  
      if (!assignments) {
        return res.status(404).json({ message: 'No assignments found for this classroom.' });
      }
  
      res.status(200).json(assignments);
    } catch (err) {
      console.error('Error fetching classroom assignments:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };