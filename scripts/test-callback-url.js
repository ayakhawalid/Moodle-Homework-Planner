#!/usr/bin/env node

/**
 * Test script to verify Auth0 callback URL configuration
 */

const fs = require('fs');
const path = require('path');

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
    console.log(`❌ Error reading ${filePath}: ${error.message}`);
    return {};
  }
}

console.log('🔍 Auth0 Callback URL Configuration Test');
console.log('==========================================');

// Load environment files
const clientEnv = loadEnvFile(path.join(__dirname, 'client', '.env'));

console.log('\n📋 Current Configuration:');
console.log('-------------------------');
console.log(`Domain: ${clientEnv.VITE_AUTH0_DOMAIN}`);
console.log(`Client ID: ${clientEnv.VITE_AUTH0_CLIENT_ID}`);
console.log(`Redirect URI: ${clientEnv.VITE_AUTH0_REDIRECT_URI}`);
console.log(`Audience: ${clientEnv.VITE_AUTH0_AUDIENCE}`);

console.log('\n✅ Required Auth0 Dashboard Settings:');
console.log('-------------------------------------');
console.log('Go to: Auth0 Dashboard > Applications > Your SPA > Settings');
console.log('');
console.log('Allowed Callback URLs:');
console.log(`  ${clientEnv.VITE_AUTH0_REDIRECT_URI || 'http://localhost:5173/callback'}`);
console.log('');
console.log('Allowed Logout URLs:');
console.log(`  ${clientEnv.VITE_APP_BASE_URL || 'http://localhost:5173'}`);
console.log('');
console.log('Allowed Web Origins:');
console.log(`  ${clientEnv.VITE_APP_BASE_URL || 'http://localhost:5173'}`);
console.log('');
console.log('Allowed Origins (CORS):');
console.log(`  ${clientEnv.VITE_APP_BASE_URL || 'http://localhost:5173'}`);

console.log('\n🚀 Testing Steps:');
console.log('-----------------');
console.log('1. Update Auth0 Dashboard with the URLs above');
console.log('2. Restart your development servers:');
console.log('   cd server && npm start');
console.log('   cd client && npm run dev');
console.log('3. Clear browser cache/cookies for localhost');
console.log('4. Visit: http://localhost:5173');
console.log('5. Try logging in');

console.log('\n🔧 Troubleshooting:');
console.log('-------------------');
console.log('If you still get callback URL mismatch:');
console.log('• Double-check the Auth0 Dashboard URLs match exactly');
console.log('• Make sure you\'re using the correct Auth0 application');
console.log('• Try logging out and clearing all Auth0 sessions');
console.log('• Check browser developer tools for specific error messages');

// Check if callback route exists
const appJsPath = path.join(__dirname, 'client', 'src', 'App.jsx');
try {
  const appContent = fs.readFileSync(appJsPath, 'utf8');
  if (appContent.includes('/callback')) {
    console.log('\n✅ Callback route found in App.jsx');
  } else {
    console.log('\n❌ Callback route NOT found in App.jsx');
  }
} catch (error) {
  console.log('\n⚠️  Could not verify callback route in App.jsx');
}

console.log('\n' + '='.repeat(50));
