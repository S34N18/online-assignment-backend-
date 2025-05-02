const Submission = require('../models/submission');
const fs = require('fs'); // Node's built-in File System module
const path = require('path'); // Helps resolve file paths

// @desc    Get all submissions (lecturer can view all)
// @route   GET /api/submissions
// @access  Private
exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate('assignment', 'title')
      .populate('student', 'name email');

    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching submissions' });
  }
};

// @desc    Get single submission by ID
// @route   GET /api/submissions/:id
// @access  Private
exports.getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('assignment', 'title')
      .populate('student', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new submission (student uploads)
// @route   POST /api/submissions
// @access  Private (Student only)
exports.createSubmission = async (req, res) => {
  try {
    const { assignment, comments } = req.body;

    const files = req.files.map(file => ({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    }));

    const submission = new Submission({
      assignment,
      student: req.user.id,
      files,
      comments
    });

    await submission.save();

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error creating submission' });
  }
};

// @desc    Update submission (before deadline)
// @route   PUT /api/submissions/:id
// @access  Private (Student only)
exports.updateSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Make sure student owns it
    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    submission.comments = req.body.comments || submission.comments;
    await submission.save();

    res.status(200).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error updating submission' });
  }
};

// @desc    Delete a submission
// @route   DELETE /api/submissions/:id
// @access  Private (Student only)
exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Make sure student owns it
    if (submission.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await submission.remove();

    res.status(200).json({ message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting submission' });
  }
};

// @desc    Grade a submission
// @route   PUT /api/submissions/:id/grade
// @access  Private (Lecturer only)
exports.gradeSubmission = async (req, res) => {
  try {
    const { grade, feedback } = req.body;

    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();

    await submission.save();

    res.status(200).json({ message: 'Submission graded', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error grading submission' });
  }
};

// 🔽 NEW FUNCTION ADDED FOR DOWNLOADING FILES 🔽
// @desc    Download a specific submitted file
// @route   GET /api/submissions/download/:filename
// @access  Private (Lecturer only)
exports.downloadSubmissionFile = (req, res) => {
  const filename = req.params.filename;

  // Build the full path to the file
  const filePath = path.join(__dirname, '../uploads/submissions', filename);

  // Check if file exists before attempting to download
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ message: 'File not found' });
    }

    // If exists, send it to the user as a download
    res.download(filePath);
  });
};


// ✅ "Multer is a middleware for Node.js that processes multipart/form-data. It helps parse and store uploaded files like assignment PDFs into the server’s storage directory. Without multer, Express cannot understand file uploads properly."