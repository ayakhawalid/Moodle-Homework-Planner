// Very simple Express server to test connection
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting server...');

const app = express();

// Enable CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({
    status: 'OK',
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('✅ Test endpoint requested');
  res.json({
    message: 'Backend is working!',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log('🎉 Server successfully started!');
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log('✅ Ready to accept connections!');
});

// Error handling
app.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
});
