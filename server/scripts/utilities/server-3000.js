// Server on port 3000 to avoid conflicts
console.log('Starting server on port 3000...');

try {
  const express = require('express');
  console.log('✅ Express loaded');
  
  const app = express();
  console.log('✅ Express app created');

  // Basic middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', '*');
    next();
  });

  app.use(express.json());
  console.log('✅ Middleware configured');

  // Health endpoint
  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
      status: 'OK', 
      message: 'Server is running on port 3000!',
      timestamp: new Date().toISOString()
    });
  });

  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('Test endpoint requested');
    res.json({ 
      message: 'Backend working on port 3000!',
      timestamp: new Date().toISOString()
    });
  });

  // Auth test endpoint (without JWT for now)
  app.get('/api/auth-test', (req, res) => {
    console.log('Auth test requested');
    res.json({ 
      message: 'Auth endpoint working!',
      note: 'JWT validation will be added later',
      timestamp: new Date().toISOString()
    });
  });

  console.log('✅ Routes configured');

  // Start server
  const PORT = 3000;
  const server = app.listen(PORT, () => {
    console.log('🎉 SERVER STARTED SUCCESSFULLY!');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Test: http://localhost:${PORT}/api/test`);
    console.log(`🔗 Auth Test: http://localhost:${PORT}/api/auth-test`);
    console.log('✅ Ready for connections!');
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.error(`💡 Try: netstat -ano | findstr :${PORT}`);
    }
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('💡 Make sure you ran: npm install');
}
