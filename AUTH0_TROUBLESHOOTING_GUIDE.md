# Auth0 Troubleshooting Guide

## Current Issues Identified

### 1. Auth0 M2M Client Secret Missing
**Problem**: The server `.env` file has `AUTH0_M2M_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET_HERE` which is a placeholder.

**Solution**: 
1. Go to Auth0 Dashboard > Applications > Machine to Machine Applications
2. Find your M2M application (should be named something like "Moodle Homework Planner (Machine to Machine)")
3. Go to Settings tab
4. Copy the Client Secret
5. Replace `YOUR_ACTUAL_CLIENT_SECRET_HERE` in `server/.env` with the actual secret

### 2. Port Mismatch Issues
**Problem**: The configuration files had mismatched ports between client and server.

**Fixed**: Updated the following files to use port 5174 for client:
- `client/.env`: Updated redirect URI and app base URL
- `server/.env`: Updated CLIENT_URL for CORS

### 3. Auth0 Application Configuration
**Required Auth0 Dashboard Settings**:

#### Application Settings (Single Page Application)
- **Allowed Callback URLs**: `http://localhost:5174/callback`
- **Allowed Logout URLs**: `http://localhost:5174`
- **Allowed Web Origins**: `http://localhost:5174`
- **Allowed Origins (CORS)**: `http://localhost:5174`

#### Machine to Machine Application Settings
- **Authorized APIs**: Must include your API (audience: `http://localhost:5000`)
- **Scopes**: Must include:
  - `read:users`
  - `update:users`
  - `delete:users`
  - `read:roles`
  - `read:role_members`
  - `create:role_members`
  - `delete:role_members`

### 4. Role Configuration in Auth0
**Required Roles**:
1. `admin` - Full access
2. `lecturer` - Course management access
3. `student` - Basic access

**Role Assignment**:
- Roles must be assigned to users in Auth0 Dashboard > User Management > Users
- Or use the Auth0 Management API to assign roles programmatically

## Testing Steps

### Step 1: Verify Environment Configuration
```bash
# Check server environment
cat server/.env | grep AUTH0

# Check client environment  
cat client/.env | grep VITE_AUTH0
```

### Step 2: Test Auth0 Management API Connection
1. Start the server: `cd server && npm start`
2. Visit: `http://localhost:5000/api/users/test-auth0-simple`
3. Should return success if M2M credentials are correct

### Step 3: Test Frontend Auth0 Integration
1. Start the client: `cd client && npm run dev`
2. Visit: `http://localhost:5174`
3. Try to login - should redirect to Auth0 login page

### Step 4: Test Role Synchronization
1. Login as an admin user
2. Visit: `http://localhost:5174/admin/users`
3. Click "Refresh Roles" button
4. Check if roles are properly fetched from Auth0

## Common Issues and Solutions

### Issue: "Auth0 is not authenticated" on login page
**Causes**:
1. Incorrect Auth0 domain or client ID
2. Mismatched redirect URI
3. Auth0 application not properly configured

**Solutions**:
1. Verify environment variables match Auth0 Dashboard settings
2. Check browser console for specific Auth0 errors
3. Ensure Auth0 application is enabled

### Issue: Management API calls fail
**Causes**:
1. Missing or incorrect M2M client secret
2. Insufficient scopes/permissions
3. M2M application not authorized for the API

**Solutions**:
1. Update client secret in server/.env
2. Add required scopes in Auth0 Dashboard
3. Authorize M2M app for your API

### Issue: Roles not syncing properly
**Causes**:
1. Custom claims not configured in Auth0 Rules/Actions
2. Role names don't match expected values
3. User doesn't have roles assigned in Auth0

**Solutions**:
1. Create Auth0 Action to add roles to token
2. Ensure role names are exactly: 'admin', 'lecturer', 'student'
3. Assign roles to users in Auth0 Dashboard

## Next Steps

1. **Fix M2M Client Secret**: Replace placeholder with actual secret
2. **Verify Auth0 Dashboard Configuration**: Ensure all URLs and scopes are correct
3. **Test Authentication Flow**: Verify login/logout works
4. **Test Role Management**: Verify admin can manage user roles
5. **Test Auth0 Sync**: Verify user operations sync with Auth0
