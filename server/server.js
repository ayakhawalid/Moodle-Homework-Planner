require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const { startPeriodicSync } = require('./services/syncAuth0'); // Import the sync service

// Import database connection
const connectDB = require('./config/database');

// Import middleware
const { checkJwt, extractUser } = require('./middleware/auth');

// Import routes
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const roleRequestsRoutes = require('./routes/roleRequests');
const courseRoutes = require('./routes/courses');
const homeworkRoutes = require('./routes/homework');
const classRoutes = require('./routes/classes');
const examRoutes = require('./routes/exams');
const studyProgressRoutes = require('./routes/studyProgress');
const lecturerDashboardRoutes = require('./routes/lecturerDashboard');
const studentDashboardRoutes = require('./routes/studentDashboard');
const lecturerManagementRoutes = require('./routes/lecturerManagement');
const studentSubmissionRoutes = require('./routes/studentSubmission');
const studentHomeworkRoutes = require('./routes/studentHomework');
const testDataRoutes = require('./routes/testData');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
})
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`Database: ${mongoose.connection.name || 'moodle-homework-planner'}`);
    startPeriodicSync(15); // Start periodic sync every 15 minutes
  })
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration - Prevents CORS errors
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Build list of allowed origins
    const allowedOrigins = [
      // Local development
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      
      // Vercel production (exact match)
      'https://moodle-homework-planner.vercel.app',
      
      // Environment variables (can be set for custom domains)
      process.env.CLIENT_URL,
      process.env.PRODUCTION_CLIENT_URL,
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check if origin matches exactly
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      return callback(null, true);
    }
    
    // Check if it's a Vercel deployment (any *.vercel.app URL)
    if (origin && origin.match(/^https:\/\/.*\.vercel\.app$/)) {
      console.log(`✅ CORS: Allowed Vercel deployment: ${origin}`);
      return callback(null, true);
    }
    
    // For development mode, allow localhost from any port
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      console.log(`✅ CORS: Allowed localhost origin (dev mode): ${origin}`);
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.warn(`⚠️  CORS: Rejected origin: ${origin}`);
    console.log('Allowed origins:', allowedOrigins);
    
    // In production, reject unknown origins
    if (process.env.NODE_ENV === 'production') {
      const error = new Error(`Origin ${origin} not allowed by CORS policy`);
      console.error('CORS Error:', error.message);
      return callback(error, false);
    }
    
    // In development, allow everything to avoid blocking during testing
    console.log(`⚠️  CORS: Allowing origin in dev mode: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Allow-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight response for 24 hours
}));

// Add CORS preflight handling
app.options('*', cors());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

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

// API Routes
app.use('/api/users', checkJwt, extractUser, userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/role-requests', roleRequestsRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/study-progress', studyProgressRoutes);
app.use('/api/lecturer-dashboard', lecturerDashboardRoutes);
app.use('/api/student-dashboard', studentDashboardRoutes);
app.use('/api/lecturer-management', lecturerManagementRoutes);
app.use('/api/student-submission', studentSubmissionRoutes);
app.use('/api/student-homework', studentHomeworkRoutes);
app.use('/api/test-data', testDataRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
});

module.exports = app;
