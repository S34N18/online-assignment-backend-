
const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const User = require('../models/User');
const { verifyToken, verifyLecturerRole } = require('../middleware/auth');

// Create a new classroom (only lecturers allowed)
router.post('/', verifyToken, verifyLecturerRole, async (req, res) => {
  try {
    const { name, code } = req.body;

    // Check if classroom with the same code already exists
    const existingClassroom = await Classroom.findOne({ code });
    if (existingClassroom) {
      return res.status(400).json({ message: 'Classroom code already exists' });
    }

    const newClassroom = new Classroom({
      name,
      code,
      lecturerId: req.user._id, // Assign the current logged-in lecturer as the creator
    });

    await newClassroom.save();
    res.status(201).json(newClassroom);
  } catch (err) {
    res.status(500).json({ message: 'Error creating classroom' });
  }
});

// Get all classrooms (only for admin and lecturers of respective classrooms)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Admins can view all classrooms
    if (req.user.role === 'admin') {
      const classrooms = await Classroom.find().populate('lecturerId', 'name email');
      return res.status(200).json(classrooms);
    }

    // Lecturers can only view classrooms they own
    if (req.user.role === 'lecturer') {
      const classrooms = await Classroom.find({ lecturerId: req.user._id }).populate('lecturerId', 'name email');
      return res.status(200).json(classrooms);
    }

    res.status(403).json({ message: 'Not authorized to view classrooms' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching classrooms' });
  }
});

// Add students to a classroom
router.put('/add-students/:classroomId', verifyToken, verifyLecturerRole, async (req, res) => {
  const { classroomId } = req.params;
  const { studentIds } = req.body;

  try {
    // Find the classroom
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

    // Add students to the classroom
    classroom.students.push(...studentIds);
    await classroom.save();

    res.status(200).json(classroom);
  } catch (err) {
    res.status(500).json({ message: 'Error adding students to classroom' });
  }
});

// Remove students from a classroom
router.put('/remove-students/:classroomId', verifyToken, verifyLecturerRole, async (req, res) => {
    const { classroomId } = req.params;
    const { studentIds } = req.body;
  
    try {
      const classroom = await Classroom.findById(classroomId);
      if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
  
      // Filter out the students to remove
      classroom.students = classroom.students.filter(
        studentId => !studentIds.includes(studentId.toString())
      );
  
      await classroom.save();
  
      res.status(200).json({
        message: 'Students removed successfully',
        classroom
      });
    } catch (err) {
      res.status(500).json({ message: 'Error removing students from classroom' });
    }
  });
  








module.exports = router;
