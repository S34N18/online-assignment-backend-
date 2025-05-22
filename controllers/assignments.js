
const Assignment = require('../models/Assignment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/assignments';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `assignment-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Check file type
    const filetypes = /pdf|doc|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: File upload only supports the following filetypes - pdf, doc, docx, txt');
    }
  }
}).single('file'); // FIXED: Changed from fields() to single()

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
exports.getAssignments = async (req, res) => {
  try {
    // Add filtering options
    const filter = {};

    // For students, only show assignments
    // For lecturers, we can add a filter query param to show only their assignments
    if (req.user.role === 'lecturer' && req.query.mine === 'true') {
      filter.createdBy = req.user.id;
    }

    const assignments = await Assignment.find(filter)
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
exports.getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate({
      path: 'createdBy',
      select: 'name email'
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Create new assignment
// @route   POST /api/assignments
// @access  Private (Lecturers only)
exports.createAssignment = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          success: false,
          message: typeof err === 'string' ? err : 'File upload error'
        });
      }

      console.log('Request body:', req.body); // Debug log
      console.log('Uploaded file:', req.file); // Debug log

      const { title, description, deadline, classroomId } = req.body;

      // Validate required fields
      if (!title || !description || !deadline || !classroomId) {
        return res.status(400).json({
          success: false,
          message: 'Please provide title, description, deadline, and classroomId'
        });
      }

      // Handle single file upload
      let attachments = [];
      if (req.file) {
        // Single file uploaded
        attachments.push({
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size
        });
      }

      const assignment = await Assignment.create({
        title,
        description,
        dueDate: deadline, // Map from deadline to dueDate
        classroomId, // Add classroom association
        createdBy: req.user.id,
        attachments,
        allowedFormats: req.body.allowedFormats ? req.body.allowedFormats.split(',') : undefined,
        maxFileSize: req.body.maxFileSize || undefined
      });

      res.status(201).json({
        success: true,
        data: assignment
      });
    } catch (err) {
      console.error('Assignment creation error:', err);
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to create assignment'
      });
    }
  });
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Lecturers only)
exports.updateAssignment = async (req, res) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Make sure user is the assignment creator
    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this assignment'
      });
    }

    // Handle file upload for updates - similar to create but more complex
    // For simplicity, we'll just update the text fields here
    const { title, description, dueDate, allowedFormats, maxFileSize } = req.body;

    assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        dueDate,
        allowedFormats: allowedFormats ? allowedFormats.split(',') : assignment.allowedFormats,
        maxFileSize: maxFileSize || assignment.maxFileSize
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      success: true,
      data: assignment
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Lecturers only)
exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Make sure user is the assignment creator
    if (assignment.createdBy.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this assignment'
      });
    }

    // Delete any associated files
    if (assignment.attachments && assignment.attachments.length > 0) {
      assignment.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }

    await assignment.deleteOne(); // FIXED: Changed from remove() to deleteOne()

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// @desc    Download assignment file
// @route   GET /api/assignments/:id/download/:fileIndex
// @access  Private
exports.downloadAssignmentFile = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if fileIndex is valid
    const fileIndex = parseInt(req.params.fileIndex);
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= assignment.attachments.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file index'
      });
    }

    const file = assignment.attachments[fileIndex];
    
    // Check if file exists on server
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set content-disposition header to force download
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Type', file.mimetype);

    // Stream the file
    const fileStream = fs.createReadStream(file.path);
    fileStream.pipe(res);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};