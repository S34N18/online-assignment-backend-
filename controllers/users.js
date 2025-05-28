const User = require('../models/User');
const Classroom = require('../models/Classroom');
const bcrypt = require('bcryptjs');

// @desc    Get all users (Admin and Lecturers only)
// @route   GET /api/users
// @access  Private (Admin/Lecturers only)
exports.getUsers = async (req, res) => {
  try {
    const filter = {};
    let selectFields = '-password';

    // Role-based filtering and field selection
    if (req.user.role === 'admin') {
      // Admin can see all users with all fields
      if (req.query.role) {
        filter.role = req.query.role;
      }
    } else if (req.user.role === 'lecturer') {
      // Lecturers can only see students from their classrooms
      const myClassrooms = await Classroom.find({ lecturerId: req.user._id }).select('students');
      const studentIds = myClassrooms.flatMap(classroom => classroom.students);
      
      filter._id = { $in: studentIds };
      filter.role = 'student';
      selectFields = 'name email studentId createdAt';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view users'
      });
    }

    const users = await User.find(filter).select(selectFields);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error in getUsers:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin/Lecturers only, with restrictions)
exports.getUser = async (req, res) => {
  try {
    let selectFields = '-password';
    const userId = req.params.id;

    // Role-based access control
    if (req.user.role === 'lecturer') {
      // Check if lecturer has access to this student
      const hasAccess = await checkLecturerStudentAccess(req.user._id, userId);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this user'
        });
      }

      const user = await User.findById(userId).select('name email studentId role createdAt');
      
      if (!user || user.role !== 'student') {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: user
      });
    }

    // Admin can view any user
    if (req.user.role === 'admin') {
      const user = await User.findById(userId).select(selectFields);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: user
      });
    }

    // Students can only view their own profile
    if (req.user.role === 'student') {
      if (userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view other users'
        });
      }

      const user = await User.findById(userId).select(selectFields);
      return res.status(200).json({
        success: true,
        data: user
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Not authorized'
    });

  } catch (err) {
    console.error('Error in getUser:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
};

// @desc    Get my profile
// @route   GET /api/users/me
// @access  Private (All authenticated users)
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    let responseData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Add role-specific data
    if (user.role === 'student') {
      responseData.studentId = user.studentId;
      
      // Get enrolled classrooms with details
      const classrooms = await Classroom.find({ students: user._id })
        .populate('lecturerId', 'name email')
        .select('name description lecturerId createdAt');
      
      responseData.enrolledClassrooms = classrooms.length;
      responseData.classrooms = classrooms;
    } else if (user.role === 'lecturer') {
      // Get created classrooms with student count
      const classrooms = await Classroom.find({ lecturerId: user._id })
        .select('name description students createdAt');
      
      const classroomsWithCount = classrooms.map(classroom => ({
        _id: classroom._id,
        name: classroom.name,
        description: classroom.description,
        studentCount: classroom.students.length,
        createdAt: classroom.createdAt
      }));
      
      responseData.createdClassrooms = classrooms.length;
      responseData.classrooms = classroomsWithCount;
    }

    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// @desc    Update my profile
// @route   PUT /api/users/me
// @access  Private (All authenticated users)
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate input
    if (!name && !email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update'
      });
    }

    // Check email uniqueness if changing email
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Update allowed fields only
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    console.error('Error in updateMyProfile:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// @desc    Create user (Admin and Lecturers only)
// @route   POST /api/users
// @access  Private (Admin/Lecturers only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;

    // Role-based creation restrictions
    if (req.user.role === 'lecturer') {
      // Lecturers can only create students
      if (role && role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Lecturers can only create student accounts'
        });
      }
    }

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const userRole = role || 'student';

    if (userRole === 'student' && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for student accounts'
      });
    }

    if (studentId) {
      const existingStudentId = await User.findOne({ studentId: studentId.trim() });
      if (existingStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already registered'
        });
      }
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      studentId: userRole === 'student' ? studentId.trim() : undefined
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error('Error in createUser:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user'
    });
  }
};

// @desc    Update user (Admin only, Lecturers limited)
// @route   PUT /api/users/:id
// @access  Private (Admin/Lecturers with restrictions)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, studentId } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Role-based update restrictions
    if (req.user.role === 'lecturer') {
      // Check if lecturer has access to this student
      const hasAccess = await checkLecturerStudentAccess(req.user._id, userId);
      
      if (!hasAccess || user.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this user'
        });
      }
      
      // Lecturers cannot change roles
      if (role && role !== user.role) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to change user role'
        });
      }
    }

    // Validate input
    if (!name && !email && !role && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one field to update'
      });
    }

    // Check email uniqueness if changing email
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    // Check student ID uniqueness if changing student ID
    if (studentId && studentId !== user.studentId) {
      const existingStudentId = await User.findOne({ studentId: studentId.trim() });
      if (existingStudentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already registered'
        });
      }
    }

    // Prevent lecturer downgrade (Admin only)
    if (user.role === 'lecturer' && role === 'student' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot downgrade a lecturer to a student'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name ? name.trim() : user.name,
        email: email ? email.toLowerCase().trim() : user.email,
        role: role || user.role,
        studentId: (role === 'student' || user.role === 'student') ? 
          (studentId ? studentId.trim() : user.studentId) : undefined
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (err) {
    console.error('Error in updateUser:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

// @desc    Delete user (Admin only, Lecturers limited)
// @route   DELETE /api/users/:id
// @access  Private (Admin/Lecturers with restrictions)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Role-based deletion restrictions
    if (req.user.role === 'lecturer') {
      // Check if lecturer has access to this student
      const hasAccess = await checkLecturerStudentAccess(req.user._id, userId);
      
      if (!hasAccess || user.role !== 'student') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this user'
        });
      }
    }

    // Remove user from any classrooms they're enrolled in
    if (user.role === 'student') {
      await Classroom.updateMany(
        { students: user._id },
        { $pull: { students: user._id } }
      );
    }

    // If deleting a lecturer, handle their classrooms
    if (user.role === 'lecturer') {
      const lecturerClassrooms = await Classroom.find({ lecturerId: user._id });
      if (lecturerClassrooms.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete lecturer with active classrooms. Please reassign or delete classrooms first.'
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

// @desc    Get students in my classrooms (Lecturers only)
// @route   GET /api/users/my-students
// @access  Private (Lecturers only)
exports.getMyStudents = async (req, res) => {
  try {
    if (req.user.role !== 'lecturer') {
      return res.status(403).json({
        success: false,
        message: 'Only lecturers can access this endpoint'
      });
    }

    // Get all classrooms created by this lecturer with populated students
    const myClassrooms = await Classroom.find({ lecturerId: req.user._id })
      .populate({
        path: 'students',
        select: 'name email studentId createdAt',
        options: { sort: { name: 1 } }
      })
      .select('name description students createdAt')
      .sort({ name: 1 });

    // Extract unique students from all classrooms
    const studentMap = new Map();
    const classroomData = [];

    myClassrooms.forEach(classroom => {
      const classroomInfo = {
        classroomId: classroom._id,
        classroomName: classroom.name,
        classroomDescription: classroom.description,
        studentCount: classroom.students.length,
        students: classroom.students,
        createdAt: classroom.createdAt
      };
      classroomData.push(classroomInfo);

      // Add students to the map to avoid duplicates
      classroom.students.forEach(student => {
        if (!studentMap.has(student._id.toString())) {
          studentMap.set(student._id.toString(), {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId,
            createdAt: student.createdAt
          });
        }
      });
    });

    const uniqueStudents = Array.from(studentMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      totalClassrooms: myClassrooms.length,
      totalStudents: uniqueStudents.length,
      students: uniqueStudents,
      classroomBreakdown: classroomData
    });
  } catch (error) {
    console.error('Error fetching my students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your students'
    });
  }
};

// @desc    Get lecturers (Students can see lecturers of their classrooms)
// @route   GET /api/users/lecturers
// @access  Private (Students and above)
exports.getLecturers = async (req, res) => {
  try {
    let lecturers;

    if (req.user.role === 'admin') {
      // Admin can see all lecturers
      lecturers = await User.find({ role: 'lecturer' })
        .select('name email createdAt')
        .sort({ name: 1 });
    } else if (req.user.role === 'student') {
      // Students can only see lecturers of classrooms they're enrolled in
      const myClassrooms = await Classroom.find({ students: req.user._id })
        .populate('lecturerId', 'name email createdAt')
        .select('lecturerId name');

      const lecturerMap = new Map();
      myClassrooms.forEach(classroom => {
        if (classroom.lecturerId && !lecturerMap.has(classroom.lecturerId._id.toString())) {
          lecturerMap.set(classroom.lecturerId._id.toString(), classroom.lecturerId);
        }
      });

      lecturers = Array.from(lecturerMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    } else if (req.user.role === 'lecturer') {
      // Lecturers can see other lecturers
      lecturers = await User.find({ 
        role: 'lecturer',
        _id: { $ne: req.user._id } // Exclude self
      })
      .select('name email createdAt')
      .sort({ name: 1 });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      count: lecturers.length,
      data: lecturers
    });
  } catch (error) {
    console.error('Error fetching lecturers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lecturers'
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private (All authenticated users)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    const user = await User.findById(req.user.id);

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // Update password (let pre-save hook handle hashing)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// Helper function to check if lecturer has access to a student
async function checkLecturerStudentAccess(lecturerId, studentId) {
  try {
    const classroom = await Classroom.findOne({
      lecturerId: lecturerId,
      students: studentId
    });
    return !!classroom; // Returns true if classroom exists, false otherwise
  } catch (error) {
    console.error('Error checking lecturer-student access:', error);
    return false;
  }
}