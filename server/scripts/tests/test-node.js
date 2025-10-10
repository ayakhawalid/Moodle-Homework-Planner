// Test if Node.js is working
console.log('🔍 Testing Node.js...');
console.log('✅ Node.js version:', process.version);
console.log('✅ Platform:', process.platform);
console.log('✅ Current directory:', process.cwd());

// Test if we can create a basic HTTP server
try {
  const http = require('http');
  console.log('✅ HTTP module loaded');
  
  const server = http.createServer((req, res) => {
    console.log('📥 Request received:', req.url);
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ 
      message: 'Basic HTTP server working!',
      timestamp: new Date().toISOString()
    }));
  });
  
  const PORT = 3001;
  server.listen(PORT, () => {
    console.log('🎉 Basic HTTP server started!');
    console.log(`🌐 Test URL: http://localhost:${PORT}`);
    console.log('✅ Server is ready!');
  });
  
  server.on('error', (error) => {
    console.error('❌ Server error:', error.message);
  });
  
} catch (error) {
  console.error('❌ Failed to create server:', error.message);
}
