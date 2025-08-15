require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const { checkJwt, extractUser } = require('./middleware/auth');

// Import routes
const userRoutes = require('./routes/users');
// const courseRoutes = require('./routes/courses');
// const homeworkRoutes = require('./routes/homework');
// const gradeRoutes = require('./routes/grades');
// const fileRoutes = require('./routes/files');
// const studyProgressRoutes = require('./routes/studyProgress');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: 'Connected'
  });
});

// Auth test endpoint
app.get('/api/auth-test', checkJwt, extractUser, (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.userInfo
  });
});

// API Routes
app.use('/api/users', checkJwt, extractUser, userRoutes);
// app.use('/api/courses', checkJwt, extractUser, courseRoutes);
// app.use('/api/homework', checkJwt, extractUser, homeworkRoutes);
// app.use('/api/grades', checkJwt, extractUser, gradeRoutes);
// app.use('/api/files', checkJwt, extractUser, fileRoutes);
// app.use('/api/study-progress', checkJwt, extractUser, studyProgressRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // JWT errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: err.message
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      messages: errors
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
});

module.exports = app;
