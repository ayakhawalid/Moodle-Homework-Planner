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

// Trust proxy - Required when running behind a reverse proxy (like Render)
// This allows Express to correctly identify client IPs from X-Forwarded-For header
app.set('trust proxy', true);

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

// Rate limiting - Configured for proxy environments (Render, Heroku, etc.)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // keyGenerator uses req.ip, which works correctly with 'trust proxy' setting
  keyGenerator: (req) => {
    // req.ip is now correctly set from X-Forwarded-For header due to trust proxy
    return req.ip || req.connection.remoteAddress;
  }
});
app.use('/api/', limiter);

// CORS configuration for Railway deployment
// Follow Railway's step 4: Configure CORS for Vercel frontend
const corsOrigins = [
  'https://moodle-homework-planner.vercel.app',
  // Support environment variable for custom domains
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  // Add localhost for local development
  ...(process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ] : [])
].filter(Boolean);

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true
}));

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
    console.error('[JWT Error] Unauthorized:', {
      name: err.name,
      message: err.message,
      code: err.code,
      status: err.status,
      expectedAudience: process.env.AUTH0_AUDIENCE,
      expectedIssuer: `https://${process.env.AUTH0_DOMAIN}/`
    });
    
    // Decode token if possible to see what audience it has
    const authHeader = req.headers?.authorization || req.get?.('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token, { complete: true });
        if (decoded && decoded.payload) {
          console.error('🚨 [JWT Error] Token Audience Mismatch:');
          console.error('   Token Audience (actual):', decoded.payload.aud);
          console.error('   Expected Audience (server):', process.env.AUTH0_AUDIENCE);
          console.error('   Token Issuer:', decoded.payload.iss);
          console.error('   Expected Issuer:', `https://${process.env.AUTH0_DOMAIN}/`);
          console.error('   Token Subject:', decoded.payload.sub);
          console.error('   Token Expiry:', new Date(decoded.payload.exp * 1000).toLocaleString());
          
          if (decoded.payload.aud !== process.env.AUTH0_AUDIENCE) {
            console.error('\n💡 SOLUTION:');
            console.error('   1. Clear browser localStorage:');
            console.error('      Object.keys(localStorage).forEach(key => key.startsWith("@@auth0spajs@@") && localStorage.removeItem(key));');
            console.error('   2. Log out and log back in to get new tokens');
            console.error('   3. OR check Auth0 Dashboard → APIs → Ensure identifier matches:', process.env.AUTH0_AUDIENCE);
          }
        }
      } catch (e) {
        console.error('[JWT Error] Could not decode token:', e.message);
      }
    } else {
      console.error('[JWT Error] No Authorization header found in request');
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      message: err.message,
      hint: `Expected audience: ${process.env.AUTH0_AUDIENCE}. Make sure your Auth0 tokens are issued for this audience.`
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
  console.log(`Auth0 Audience: ${process.env.AUTH0_AUDIENCE}`);
  console.log(`Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
  console.log(`\n⚠️  IMPORTANT: If you changed .env, make sure the server was restarted!`);
});

module.exports = app;
