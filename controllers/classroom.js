const Classroom = require('../models/Classroom');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a classroom (Lecturers only)
exports.createClassroom = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const classroom = await Classroom.create({
      name,
      code,
      description,
      lecturerId: req.user._id,
    });

    res.status(201).json(classroom);
  } catch (error) {
    console.error("Error creating classroom:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get classrooms based on user role
exports.getClassrooms = async (req, res) => {
  try {
    let classrooms;
    const populateOptions = {
      path: 'lecturerId',
      select: 'name email'
    };

    if (req.user.role === 'admin') {
      // Admin can see all classrooms
      classrooms = await Classroom.find()
        .populate(populateOptions)
        .populate('students', 'name email studentId')
        .select('name code description lecturerId students createdAt');
    } else if (req.user.role === 'lecturer') {
      // Lecturers can only see their own classrooms
      classrooms = await Classroom.find({ lecturerId: req.user._id })
        .populate(populateOptions)
        .populate('students', 'name email studentId')
        .select('name code description lecturerId students createdAt');
    } else if (req.user.role === 'student') {
      // Students can only see classrooms they're enrolled in
      classrooms = await Classroom.find({ students: req.user._id })
        .populate(populateOptions)
        .select('name code description lecturerId createdAt');
    } else {
      return res.status(403).json({ message: 'Not authorized to view classrooms' });
    }

    return res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms
    });
  } catch (err) {
    console.error('Classroom fetch error:', err);
    res.status(500).json({ 
      message: 'Error fetching classrooms', 
      error: err.message 
    });
  }
};

// Get classroom by ID with role-based access
exports.getClassroomById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(req.params.id)
      .populate('lecturerId', 'name email')
      .populate('students', 'name email studentId');

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Role-based access control
    if (req.user.role === 'admin') {
      // Admin can view any classroom
      return res.status(200).json({ success: true, data: classroom });
    } else if (req.user.role === 'lecturer') {
      // Lecturers can only view their own classrooms
      if (classroom.lecturerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this classroom' });
      }
      return res.status(200).json({ success: true, data: classroom });
    } else if (req.user.role === 'student') {
      // Students can only view classrooms they're enrolled in
      const isEnrolled = classroom.students.some(
        student => student._id.toString() === req.user._id.toString()
      );
      if (!isEnrolled) {
        return res.status(403).json({ message: 'Not authorized to view this classroom' });
      }
      // Return limited data for students (hide student list)
      const studentView = {
        _id: classroom._id,
        name: classroom.name,
        code: classroom.code,
        description: classroom.description,
        lecturerId: classroom.lecturerId,
        createdAt: classroom.createdAt
      };
      return res.status(200).json({ success: true, data: studentView });
    }

    return res.status(403).json({ message: 'Not authorized' });
  } catch (err) {
    console.error('Error fetching classroom details:', err);
    res.status(500).json({ 
      message: 'Error fetching classroom details', 
      error: err.message 
    });
  }
};

// Get my classrooms (role-specific endpoint)
exports.getMyClassrooms = async (req, res) => {
  try {
    let classrooms;

    if (req.user.role === 'lecturer') {
      // Get classrooms where user is the lecturer
      classrooms = await Classroom.find({ lecturerId: req.user._id })
        .populate('students', 'name email studentId')
        .select('name code description students createdAt')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'student') {
      // Get classrooms where user is enrolled as student
      classrooms = await Classroom.find({ students: req.user._id })
        .populate('lecturerId', 'name email')
        .select('name code description lecturerId createdAt')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ message: 'Invalid role for this endpoint' });
    }

    res.status(200).json({
      success: true,
      count: classrooms.length,
      data: classrooms
    });
  } catch (error) {
    console.error('Error fetching my classrooms:', error);
    res.status(500).json({ 
      message: 'Error fetching your classrooms',
      error: error.message 
    });
  }
};

// Join classroom by code (Students only)
exports.joinClassroom = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Classroom code is required' });
    }

    // Only students can join classrooms
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join classrooms' });
    }

    const classroom = await Classroom.findOne({ code });
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found with this code' });
    }

    // Check if student is already enrolled
    const isAlreadyEnrolled = classroom.students.includes(req.user._id);
    if (isAlreadyEnrolled) {
      return res.status(400).json({ message: 'You are already enrolled in this classroom' });
    }

    // Add student to classroom
    classroom.students.push(req.user._id);
    await classroom.save();

    // Return classroom info without student list
    const classroomInfo = await Classroom.findById(classroom._id)
      .populate('lecturerId', 'name email')
      .select('name code description lecturerId createdAt');

    res.status(200).json({
      success: true,
      message: 'Successfully joined classroom',
      data: classroomInfo
    });
  } catch (error) {
    console.error('Error joining classroom:', error);
    res.status(500).json({ 
      message: 'Error joining classroom',
      error: error.message 
    });
  }
};

// Leave classroom (Students only)
exports.leaveClassroom = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    // Only students can leave classrooms
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can leave classrooms' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check if student is enrolled
    const isEnrolled = classroom.students.includes(req.user._id);
    if (!isEnrolled) {
      return res.status(400).json({ message: 'You are not enrolled in this classroom' });
    }

    // Remove student from classroom
    classroom.students = classroom.students.filter(
      studentId => studentId.toString() !== req.user._id.toString()
    );
    await classroom.save();

    res.status(200).json({
      success: true,
      message: 'Successfully left classroom'
    });
  } catch (error) {
    console.error('Error leaving classroom:', error);
    res.status(500).json({ 
      message: 'Error leaving classroom',
      error: error.message 
    });
  }
};

// Get classroom assignments with role-based access
// Get classroom assignments with role-based access
exports.getClassroomAssignments = async (req, res) => {
  try {
    const classroomId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check access permissions
    let hasAccess = false;
    if (req.user.role === 'admin') {
      hasAccess = true;
    } else if (req.user.role === 'lecturer') {
      hasAccess = classroom.lecturerId.toString() === req.user._id.toString();
    } else if (req.user.role === 'student') {
      hasAccess = classroom.students.includes(req.user._id);
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Not authorized to view assignments for this classroom' });
    }

    // Fix: Use 'classroomId' instead of 'classroom' for both find and populate
    const assignments = await Assignment.find({ classroomId: classroomId })
      .populate('classroomId', 'name code')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (err) {
    console.error('Error fetching classroom assignments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// Get available students (Lecturers only)
exports.getAvailableStudents = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check if user has permission (lecturer of this classroom or admin)
    if (req.user.role !== 'admin' && 
        classroom.lecturerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this classroom' });
    }

    const currentStudentIds = classroom.students.map(student => student.toString());
    
    const availableStudents = await User.find({
      role: 'student',
      _id: { $nin: currentStudentIds }
    }).select('name email studentId _id');

    res.status(200).json({
      success: true,
      count: availableStudents.length,
      data: availableStudents
    });
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ 
      message: 'Error fetching available students',
      error: error.message 
    });
  }
};

// Add multiple students to classroom (Lecturers only)
exports.addMultipleStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Student IDs are required' });
    }

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check if user has permission (lecturer of this classroom or admin)
    if (req.user.role !== 'admin' && 
        classroom.lecturerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this classroom' });
    }

    // Verify all provided IDs are valid students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student'
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Some student IDs are invalid' });
    }

    // Add students to classroom (avoid duplicates)
    const currentStudentIds = classroom.students.map(student => student.toString());
    const newStudentIds = studentIds.filter(id => !currentStudentIds.includes(id));
    
    if (newStudentIds.length === 0) {
      return res.status(400).json({ message: 'All selected students are already in the classroom' });
    }

    classroom.students.push(...newStudentIds);
    await classroom.save();

    const updatedClassroom = await Classroom.findById(id)
      .populate('students', 'name email studentId')
      .populate('lecturerId', 'name email');

    res.status(200).json({
      success: true,
      message: `${newStudentIds.length} student(s) added successfully`,
      data: updatedClassroom
    });
  } catch (error) {
    console.error('Error adding students:', error);
    res.status(500).json({ 
      message: 'Error adding students to classroom',
      error: error.message 
    });
  }
};

// Remove students from classroom (Lecturers only)
exports.removeStudents = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { studentIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(classroomId)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Check permissions
    if (req.user.role !== 'admin' && 
        classroom.lecturerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to manage this classroom' });
    }

    classroom.students = classroom.students.filter(
      studentId => !studentIds.includes(studentId.toString())
    );

    await classroom.save();

    const updatedClassroom = await Classroom.findById(classroomId)
      .populate('students', 'name email studentId');

    res.status(200).json({
      success: true,
      message: 'Students removed successfully',
      data: updatedClassroom
    });
  } catch (err) {
    console.error('Remove students error:', err);
    res.status(500).json({ 
      message: 'Error removing students from classroom',
      error: err.message 
    });
  }
};

// Get classroom students (Lecturers only)
exports.getClassroomStudents = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid classroom ID' });
    }

    const classroom = await Classroom.findById(id)
      .populate('students', 'name email studentId createdAt');

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    // Only lecturers and admins can view student lists
    if (req.user.role !== 'admin' && 
        (req.user.role !== 'lecturer' || classroom.lecturerId.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view classroom students' });
    }

    res.status(200).json({
      success: true,
      count: classroom.students.length,
      data: classroom.students
    });
  } catch (error) {
    console.error('Error fetching classroom students:', error);
    res.status(500).json({ 
      message: 'Error fetching classroom students',
      error: error.message 
    });
  }
};