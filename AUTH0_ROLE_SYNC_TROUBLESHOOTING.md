# Auth0 Role Synchronization Troubleshooting Guide

## Problem Description

Users' roles in the website's user management table don't match the roles configured in Auth0. For example:
- User "lovely.m.2004@gmail.com" shows "pending" in the website
- But in Auth0, the user has been assigned the "student" role

## Root Cause

The Auth0 Management API credentials are not properly configured, preventing the website from fetching current user roles from Auth0.

## Solution Steps

### 1. Configure Auth0 Management API Credentials

#### Get the Credentials from Auth0 Dashboard:

1. **Go to Auth0 Dashboard**: https://manage.auth0.com/
2. **Navigate to Applications** → **Machine to Machine Applications**
3. **Find your backend application** (or create one if it doesn't exist)
4. **Copy the Client ID and Client Secret**
5. **Authorize the application** for the Auth0 Management API
6. **Grant the required scopes**:
   - `read:users`
   - `update:users`
   - `read:roles`
   - `read:role_members`
   - `create:role_members`
   - `delete:role_members`

#### Update the Environment File:

Edit `server/.env` and replace the placeholder values:

```env
# Auth0 Management API (Machine to Machine)
AUTH0_M2M_CLIENT_ID=your_actual_client_id_here
AUTH0_M2M_CLIENT_SECRET=your_actual_client_secret_here
```

**Important**: The client secret should be a long string (usually 64 characters) that looks like:
```
AUTH0_M2M_CLIENT_SECRET=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890abcdef12
```

### 2. Test the Configuration

Run the test script to verify everything is working:

```bash
cd server
node test-auth0-setup.js
```

This will:
- ✅ Check environment variables
- ✅ Test Auth0 Management API connection
- ✅ Verify user role fetching
- ✅ Compare Auth0 roles with database roles

### 3. Sync User Roles

Once the configuration is working, sync the roles:

#### Option A: Sync a specific user
```bash
cd server
node sync-user-role.js lovely.m.2004@gmail.com
```

#### Option B: Sync all users
```bash
cd server
node sync-user-role.js --all
```

#### Option C: Use the admin interface
1. Log in as an admin
2. Go to User Management
3. Click "Sync Roles from Auth0" button

### 4. Verify the Fix

1. **Check the database**: The user's role should now be updated
2. **Check the admin interface**: The user should show the correct role instead of "pending"
3. **Test user login**: The user should have access to features based on their role

## Common Issues and Solutions

### Issue: "Unauthorized" Error

**Symptoms**: 
- Auth0 Management API calls fail with "Unauthorized"
- Test script shows ❌ for API connection

**Solutions**:
1. Verify the client secret is correct
2. Check that the Machine-to-Machine application is authorized for the Management API
3. Ensure all required scopes are granted

### Issue: User Shows "Pending" Role

**Symptoms**:
- User appears as "pending" in the admin interface
- Database shows `role: null` for the user

**Solutions**:
1. Assign a role to the user in Auth0 Dashboard
2. Run role synchronization
3. Check that the user's Auth0 ID is correctly stored in the database

### Issue: Role Sync Doesn't Update Database

**Symptoms**:
- Auth0 has the correct role
- Sync appears to run without errors
- Database role remains unchanged

**Solutions**:
1. Check server logs for detailed error messages
2. Verify database connection
3. Ensure the user exists in both Auth0 and the database
4. Check that the Auth0 user ID matches between systems

## Manual Database Check

To manually check a user's current status:

```javascript
// Connect to MongoDB and run:
const user = await User.findOne({ email: 'lovely.m.2004@gmail.com' });
console.log('User role in DB:', user.role);
console.log('Auth0 ID:', user.auth0_id);
console.log('Last updated:', user.updatedAt);
```

## Auth0 Dashboard Check

To verify roles in Auth0:

1. Go to Auth0 Dashboard → User Management → Users
2. Search for the user email
3. Click on the user
4. Go to the "Roles" tab
5. Verify the assigned roles

## Prevention

To prevent this issue in the future:

1. **Always configure Auth0 Management API credentials** when setting up the application
2. **Test the configuration** using the provided test script
3. **Monitor role synchronization** in server logs
4. **Set up automated role sync** on user login (already implemented)
5. **Use the admin interface** to manually sync roles when needed

## Files Modified/Created

- `server/.env` - Updated with proper Auth0 credentials
- `server/test-auth0-setup.js` - New test script
- `server/sync-user-role.js` - New sync utility
- `AUTH0_ROLE_SYNC_TROUBLESHOOTING.md` - This documentation

## Related Code

The role synchronization logic is implemented in:
- `server/services/auth0Management.js` - Auth0 API integration
- `server/routes/users.js` - User management endpoints
- `server/middleware/auth.js` - Authentication middleware
- `client/src/pages/admin/UserManagement.jsx` - Admin interface
