// Test different ports to find one that works
const http = require('http');

const ports = [3000, 3001, 8000, 8080, 9000];

console.log('🔍 Testing available ports...');

ports.forEach(port => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ 
      message: `Server working on port ${port}!`,
      port: port,
      timestamp: new Date().toISOString()
    }));
  });
  
  server.listen(port, () => {
    console.log(`✅ Server started on port ${port}`);
    console.log(`🌐 Test: http://localhost:${port}`);
  });
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`❌ Port ${port} is in use`);
    } else {
      console.log(`❌ Port ${port} error: ${error.message}`);
    }
  });
});

console.log('🎯 Try opening any of the URLs above in your browser');
console.log('🔄 Press Ctrl+C to stop all servers');
