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

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ✅ Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/submissions';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });


// ✅ FILE UPLOAD: Student submits assignment
router.post(
  '/',
  protect,
  authorize('student'),
  upload.array('files', 5), // Accept up to 5 files
  createSubmission
);


// ✅ FILE DOWNLOAD: Allow both lecturers and students to download submission files
router.get(
  '/download/:filename',
  protect, // Keep protection but remove lecturer-only restriction
  downloadSubmissionFile
);


// ✅ RESTful API routes
router
  .route('/')
  .get(protect, getSubmissions); // Only lecturers/students can view depending on role

router
  .route('/:id')
  .get(protect, getSubmission)
  .put(protect, authorize('student'), updateSubmission)
  .delete(protect, authorize('student'), deleteSubmission);

router
  .route('/:id/grade')
  .put(protect, authorize('lecturer'), gradeSubmission);


module.exports = router;