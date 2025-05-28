const express = require('express');
const router = express.Router();
const { register, login, getMe, updatePassword, createLecturer } = require('../controllers/auth');
const { protect } = require('../middleware/auth');




router.post('/create-lecturer', createLecturer);
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/updatepassword', protect, updatePassword);

module.exports = router;