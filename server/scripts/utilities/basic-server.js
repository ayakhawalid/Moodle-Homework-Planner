// Minimal Express server
console.log('Starting basic server...');

try {
  const express = require('express');
  console.log('✅ Express loaded');
  
  const app = express();
  console.log('✅ Express app created');

  // Basic middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    next();
  });

  app.use(express.json());
  console.log('✅ Middleware configured');

  // Health endpoint
  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'OK', message: 'Server is running!' });
  });

  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('Test endpoint requested');
    res.json({ message: 'Backend working!' });
  });

  console.log('✅ Routes configured');

  // Start server
  const PORT = 5000;
  const server = app.listen(PORT, () => {
    console.log('🎉 SERVER STARTED SUCCESSFULLY!');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log('✅ Ready for connections!');
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error('❌ Port 5000 is already in use!');
      console.error('💡 Try: netstat -ano | findstr :5000');
    }
  });

} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('💡 Make sure you ran: npm install');
}
