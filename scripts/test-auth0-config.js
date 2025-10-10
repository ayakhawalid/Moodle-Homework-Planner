#!/usr/bin/env node

/**
 * Auth0 Configuration Test Script
 * This script helps diagnose Auth0 configuration issues
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    return env;
  } catch (error) {
    log(`Error reading ${filePath}: ${error.message}`, 'red');
    return {};
  }
}

async function testAuth0Config() {
  log('🔍 Auth0 Configuration Test', 'blue');
  log('================================', 'blue');

  // Load environment files
  const serverEnv = loadEnvFile(path.join(__dirname, 'server', '.env'));
  const clientEnv = loadEnvFile(path.join(__dirname, 'client', '.env'));

  // Test 1: Check environment variables
  log('\n1. Environment Variables Check', 'yellow');
  log('------------------------------', 'yellow');

  const requiredServerVars = [
    'AUTH0_DOMAIN',
    'AUTH0_AUDIENCE', 
    'AUTH0_M2M_CLIENT_ID',
    'AUTH0_M2M_CLIENT_SECRET'
  ];

  const requiredClientVars = [
    'VITE_AUTH0_DOMAIN',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_REDIRECT_URI',
    'VITE_AUTH0_AUDIENCE'
  ];

  let configValid = true;

  // Check server environment
  log('Server Environment:', 'blue');
  requiredServerVars.forEach(varName => {
    const value = serverEnv[varName];
    if (!value || value === 'YOUR_ACTUAL_CLIENT_SECRET_HERE') {
      log(`  ❌ ${varName}: Missing or placeholder value`, 'red');
      configValid = false;
    } else {
      log(`  ✅ ${varName}: ${value.substring(0, 20)}...`, 'green');
    }
  });

  // Check client environment
  log('\nClient Environment:', 'blue');
  requiredClientVars.forEach(varName => {
    const value = clientEnv[varName];
    if (!value) {
      log(`  ❌ ${varName}: Missing`, 'red');
      configValid = false;
    } else {
      log(`  ✅ ${varName}: ${value}`, 'green');
    }
  });

  // Test 2: Check domain consistency
  log('\n2. Domain Consistency Check', 'yellow');
  log('---------------------------', 'yellow');
  
  if (serverEnv.AUTH0_DOMAIN === clientEnv.VITE_AUTH0_DOMAIN) {
    log(`  ✅ Domains match: ${serverEnv.AUTH0_DOMAIN}`, 'green');
  } else {
    log(`  ❌ Domain mismatch:`, 'red');
    log(`     Server: ${serverEnv.AUTH0_DOMAIN}`, 'red');
    log(`     Client: ${clientEnv.VITE_AUTH0_DOMAIN}`, 'red');
    configValid = false;
  }

  // Test 3: Check audience consistency
  log('\n3. Audience Consistency Check', 'yellow');
  log('-----------------------------', 'yellow');
  
  if (serverEnv.AUTH0_AUDIENCE === clientEnv.VITE_AUTH0_AUDIENCE) {
    log(`  ✅ Audiences match: ${serverEnv.AUTH0_AUDIENCE}`, 'green');
  } else {
    log(`  ❌ Audience mismatch:`, 'red');
    log(`     Server: ${serverEnv.AUTH0_AUDIENCE}`, 'red');
    log(`     Client: ${clientEnv.VITE_AUTH0_AUDIENCE}`, 'red');
    configValid = false;
  }

  // Test 4: Test Auth0 Management API (if credentials are available)
  if (serverEnv.AUTH0_M2M_CLIENT_SECRET && 
      serverEnv.AUTH0_M2M_CLIENT_SECRET !== 'YOUR_ACTUAL_CLIENT_SECRET_HERE') {
    
    log('\n4. Auth0 Management API Test', 'yellow');
    log('----------------------------', 'yellow');
    
    try {
      // Get Management API token
      const tokenResponse = await axios.post(`https://${serverEnv.AUTH0_DOMAIN}/oauth/token`, {
        client_id: serverEnv.AUTH0_M2M_CLIENT_ID,
        client_secret: serverEnv.AUTH0_M2M_CLIENT_SECRET,
        audience: `https://${serverEnv.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials'
      });

      log('  ✅ Successfully obtained Management API token', 'green');

      // Test getting users (basic API call)
      const usersResponse = await axios.get(`https://${serverEnv.AUTH0_DOMAIN}/api/v2/users?per_page=1`, {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      });

      log(`  ✅ Successfully fetched users (${usersResponse.data.length} users)`, 'green');

    } catch (error) {
      log(`  ❌ Management API test failed: ${error.message}`, 'red');
      if (error.response?.data) {
        log(`     Details: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
      }
      configValid = false;
    }
  } else {
    log('\n4. Auth0 Management API Test', 'yellow');
    log('----------------------------', 'yellow');
    log('  ⚠️  Skipped - M2M client secret not configured', 'yellow');
  }

  // Test 5: Check if server is running
  log('\n5. Server Connectivity Test', 'yellow');
  log('---------------------------', 'yellow');
  
  try {
    const response = await axios.get('http://localhost:5000/api/users/test-auth0-simple');
    log('  ✅ Server is running and Auth0 test endpoint accessible', 'green');
  } catch (error) {
    log('  ❌ Server connectivity test failed', 'red');
    log('     Make sure the server is running: cd server && npm start', 'yellow');
  }

  // Summary
  log('\n📋 Summary', 'blue');
  log('==========', 'blue');
  
  if (configValid) {
    log('✅ Configuration appears to be valid!', 'green');
    log('\nNext steps:', 'blue');
    log('1. Start the server: cd server && npm start', 'yellow');
    log('2. Start the client: cd client && npm run dev', 'yellow');
    log('3. Test login at http://localhost:5174', 'yellow');
  } else {
    log('❌ Configuration issues found!', 'red');
    log('\nPlease fix the issues above and run this test again.', 'yellow');
    log('See AUTH0_TROUBLESHOOTING_GUIDE.md for detailed instructions.', 'yellow');
  }
}

// Run the test
testAuth0Config().catch(error => {
  log(`\n💥 Test script failed: ${error.message}`, 'red');
  process.exit(1);
});
