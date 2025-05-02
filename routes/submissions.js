const express = require('express');
const router = express.Router();
const {
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  deleteSubmission,
  gradeSubmission,
  downloadSubmissionFile
} = require('../controllers/submissions');
const { protect, authorize } = require('../middleware/auth');

// ✅ Add multer and path setup
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/submissions/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// ✅ File upload route
router.post(
  '/upload',
  protect,
  authorize('student'),
  upload.single('file'),
  async (req, res) => {
    try {
      const Submission = require('../models/Submission');
      const newSubmission = new Submission({
        student: req.user.id,
        assignmentId: req.body.assignmentId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        submittedAt: new Date(),
      });
      await newSubmission.save();
      res.status(200).json({ message: 'File uploaded successfully', submission: newSubmission });
    } catch (err) {
      res.status(500).json({ message: 'Upload failed', error: err.message });
    }
  }
);

// ✅ File download route
router.get(
  '/download/:filename',
  protect,
  authorize('lecturer'),
  (req, res) => {
    const filePath = path.join(__dirname, '../uploads/submissions/', req.params.filename);

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        return res.status(404).json({ message: 'File not found' });
      }
      res.download(filePath, req.params.filename);
    });
  }
);

// ✅ Your existing RESTful routes
router
  .route('/')
  .get(protect, getSubmissions)
  .post(protect, authorize('student'), createSubmission);

router
  .route('/:id')
  .get(protect, getSubmission)
  .put(protect, authorize('student'), updateSubmission)
  .delete(protect, authorize('student'), deleteSubmission);

router
  .route('/:id/grade')
  .put(protect, authorize('lecturer'), gradeSubmission);


  router.get('/download/:filename', protect, authorize('lecturer'), downloadSubmissionFile);


// ✅ Export at the end
module.exports = router;
