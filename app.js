const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const devRoutes = require('./routes/dev'); 





// Load env
dotenv.config();

// Create necessary upload directories
const uploadDir = path.join(__dirname, 'uploads/submissions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads/submissions directory.');
}

// Init Express
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
app.use(helmet());

// MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/assignment-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ✅ Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/submissions', express.static(path.join(__dirname, 'uploads/submissions')));

// ✅ Log file access (for debugging)
app.use('/uploads/submissions', (req, res, next) => {
  console.log('🔍 File requested:', req.url);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/classrooms', require('./routes/classrooms'));

// Error Handler
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: err.message
  });
});





app.use('/api/auth' , devRoutes)





const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
