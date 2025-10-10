#!/usr/bin/env node

/**
 * Auth0 Management API Test Script
 * 
 * This script tests the Auth0 Management API configuration and helps diagnose
 * role synchronization issues.
 * 
 * Usage: node test-auth0-setup.js
 */

require('dotenv').config();
const { ManagementClient } = require('auth0');
const mongoose = require('mongoose');
const User = require('./models/User');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testAuth0Configuration() {
  log(colors.bold + colors.blue, '🔍 Testing Auth0 Management API Configuration...\n');

  // 1. Check environment variables
  log(colors.yellow, '1. Checking Environment Variables:');
  const requiredEnvVars = {
    'AUTH0_DOMAIN': process.env.AUTH0_DOMAIN,
    'AUTH0_M2M_CLIENT_ID': process.env.AUTH0_M2M_CLIENT_ID,
    'AUTH0_M2M_CLIENT_SECRET': process.env.AUTH0_M2M_CLIENT_SECRET
  };

  let envConfigValid = true;
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      log(colors.red, `   ❌ ${key}: Not set`);
      envConfigValid = false;
    } else if (value.includes('REPLACE_WITH') || value.includes('YOUR_ACTUAL')) {
      log(colors.red, `   ❌ ${key}: Contains placeholder value`);
      envConfigValid = false;
    } else {
      const displayValue = key === 'AUTH0_M2M_CLIENT_SECRET' 
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)} (${value.length} chars)`
        : value;
      log(colors.green, `   ✅ ${key}: ${displayValue}`);
    }
  }

  if (!envConfigValid) {
    log(colors.red, '\n❌ Environment configuration is invalid. Please fix the issues above.');
    return false;
  }

  // 2. Test Management API connection
  log(colors.yellow, '\n2. Testing Auth0 Management API Connection:');
  
  try {
    const management = new ManagementClient({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_M2M_CLIENT_ID,
      clientSecret: process.env.AUTH0_M2M_CLIENT_SECRET,
      scope: 'read:users update:users read:roles read:role_members create:role_members delete:role_members'
    });

    // Test basic connection by fetching roles
    const roles = await management.roles.getAll();
    log(colors.green, `   ✅ Successfully connected to Auth0 Management API`);
    log(colors.green, `   ✅ Found ${roles.data.length} roles: ${roles.data.map(r => r.name).join(', ')}`);

    // 3. Test specific user role fetching
    log(colors.yellow, '\n3. Testing User Role Fetching:');
    
    // Connect to database to get test user
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/moodle-homework-planner');
    
    const testUser = await User.findOne({ email: 'lovely.m.2004@gmail.com' });
    if (!testUser) {
      log(colors.yellow, '   ⚠️  Test user (lovely.m.2004@gmail.com) not found in database');
      return true;
    }

    log(colors.blue, `   📋 Testing with user: ${testUser.email} (${testUser.auth0_id})`);
    log(colors.blue, `   📋 Current role in DB: ${testUser.role || 'null'}`);

    // Fetch roles from Auth0
    const userRoles = await management.users.getRoles({ id: testUser.auth0_id });
    const roleNames = userRoles.data.map(role => role.name);
    
    log(colors.green, `   ✅ Roles from Auth0: ${roleNames.length > 0 ? roleNames.join(', ') : 'No roles assigned'}`);

    // Compare with database
    if (roleNames.length === 0) {
      log(colors.yellow, '   ⚠️  User has no roles assigned in Auth0');
      log(colors.yellow, '   💡 Go to Auth0 Dashboard > User Management > Users > lovely.m.2004@gmail.com > Roles to assign a role');
    } else {
      const expectedRole = roleNames.includes('admin') ? 'admin' : 
                          roleNames.includes('lecturer') ? 'lecturer' : 'student';
      
      if (testUser.role === expectedRole) {
        log(colors.green, `   ✅ Database role matches Auth0 role: ${expectedRole}`);
      } else {
        log(colors.red, `   ❌ Role mismatch! Auth0: ${roleNames.join(', ')}, Database: ${testUser.role || 'null'}`);
        log(colors.yellow, '   💡 Run the role sync to fix this: POST /api/users/refresh-roles');
      }
    }

    return true;

  } catch (error) {
    log(colors.red, `   ❌ Auth0 Management API Error: ${error.message}`);
    
    if (error.message.includes('Unauthorized')) {
      log(colors.yellow, '\n💡 Troubleshooting Tips:');
      log(colors.yellow, '   1. Verify the CLIENT_SECRET is correct in your .env file');
      log(colors.yellow, '   2. Check that the Machine-to-Machine application is authorized for the Management API');
      log(colors.yellow, '   3. Ensure the application has the required scopes:');
      log(colors.yellow, '      - read:users, update:users, read:roles, read:role_members, create:role_members, delete:role_members');
    }
    
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  try {
    const success = await testAuth0Configuration();
    
    if (success) {
      log(colors.bold + colors.green, '\n🎉 Auth0 configuration test completed successfully!');
      log(colors.green, '\nNext steps:');
      log(colors.green, '1. If roles are mismatched, use the "Sync Roles from Auth0" button in the admin panel');
      log(colors.green, '2. Or call POST /api/users/refresh-roles to sync all user roles');
    } else {
      log(colors.bold + colors.red, '\n❌ Auth0 configuration test failed!');
      log(colors.red, 'Please fix the issues above before proceeding.');
      process.exit(1);
    }
  } catch (error) {
    log(colors.red, `\n❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { testAuth0Configuration };
