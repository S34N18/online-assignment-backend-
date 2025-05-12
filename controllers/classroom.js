const Classroom = require('../models/Classroom');

// Create a classroom
exports.createClassroom = async (req, res) => {
  try {
    const { name, code } = req.body;
    const existingClassroom = await Classroom.findOne({ code });

    if (existingClassroom) {
      return res.status(400).json({ message: 'Classroom code already exists' });
    }

    const newClassroom = new Classroom({
      name,
      code,
      lecturerId: req.user._id,
    });

    await newClassroom.save();
    res.status(201).json(newClassroom);
  } catch (err) {
    res.status(500).json({ message: 'Error creating classroom' });
  }
};

// Get all classrooms
exports.getClassrooms = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const classrooms = await Classroom.find().populate('lecturerId', 'name email');
      return res.status(200).json(classrooms);
    }

    if (req.user.role === 'lecturer') {
      const classrooms = await Classroom.find({ lecturerId: req.user._id }).populate('lecturerId', 'name email');
      return res.status(200).json(classrooms);
    }

    res.status(403).json({ message: 'Not authorized to view classrooms' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching classrooms' });
  }
};

// Add students
exports.addStudents = async (req, res) => {
  const { classroomId } = req.params;
  const { studentIds } = req.body;

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

    classroom.students.push(...studentIds);
    await classroom.save();

    res.status(200).json(classroom);
  } catch (err) {
    res.status(500).json({ message: 'Error adding students to classroom' });
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
    res.status(500).json({ message: 'Error removing students from classroom' });
  }
};
