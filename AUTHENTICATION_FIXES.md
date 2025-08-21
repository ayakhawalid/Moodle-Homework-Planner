# Authentication & Permission Fixes for Moodle Homework Planner

## Overview
This document outlines the fixes implemented to resolve the 403 Forbidden errors when accessing admin endpoints.

## Issues Fixed

### 1. JWT Token Management
- **Problem**: API requests were missing JWT tokens
- **Solution**: Added token provider to automatically inject Auth0 tokens into API requests

### 2. Role-Based Access Control
- **Problem**: Frontend wasn't checking user roles before accessing admin endpoints
- **Solution**: Added role checking in UserSyncContext and permission-aware components

### 3. Error Handling
- **Problem**: 403 errors weren't being handled gracefully
- **Solution**: Added PermissionError component and proper error boundaries

## Files Updated/Created

### New Files Created:
1. `client/src/hooks/useAuthToken.js` - Token management hook
2. `client/src/Components/PermissionError.jsx` - Permission error display
3. `client/src/pages/admin/AdminDashboard.jsx` - Updated admin dashboard with permission checks
4. `client/src/pages/admin/UserManagement.jsx` - Updated user management with permission checks

### Updated Files:
1. `client/src/contexts/UserSyncContext.jsx` - Enhanced with role checking and proper token handling
2. `client/src/services/api.js` - Already had token provider support

## How to Use

### 1. Token Provider Setup
The authentication system now automatically handles token injection:

```javascript
// In your component
import { useAuthToken } from '../hooks/useAuthToken';

function MyComponent() {
  useAuthToken(); // This sets up automatic token injection
  // Your component logic
}
```

### 2. Role Checking
Use the UserSyncContext to check user roles:

```javascript
import { useUserSyncContext } from '../contexts/UserSyncContext';

function AdminComponent() {
  const { isAdmin, isLecturer, isStudent, hasRole } = useUserSyncContext();
  
  if (!isAdmin) {
    return <PermissionError />;
  }
  
  // Admin-only content
}
```

### 3. API Calls
All API calls now automatically include the JWT token:

```javascript
import { apiService } from '../services/api';

// This will automatically include the JWT token
const users = await apiService.user.getAll();
const stats = await apiService.user.getStats();
```

## Environment Variables

Ensure these are set in your `.env` files:

### Server (.env)
```
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=your-api-audience
VITE_API_BASE_URL=http://localhost:5000/api
```

## Testing the Fixes

### 1. Test Admin Access
1. Log in as an admin user
2. Navigate to `/admin/dashboard`
3. Verify you can see user statistics
4. Navigate to `/admin/users`
5. Verify you can see the user list

### 2. Test Non-Admin Access
1. Log in as a student or lecturer
2. Try to access `/admin/dashboard`
3. Verify you see the PermissionError component

### 3. Test Token Expiration
1. Let your token expire
2. Try to make an API call
3. Verify you're redirected to login

## Common Issues and Solutions

### 1. Still getting 403 errors
- Check that your Auth0 roles are properly configured
- Verify the JWT token includes the correct roles claim
- Check server logs for detailed error messages

### 2. Token not being injected
- Ensure `useAuthToken()` is called in your component tree
- Check browser console for token provider errors
- Verify Auth0 configuration is correct

### 3. Role checking not working
- Ensure UserSyncContext is properly wrapping your app
- Check that the user role is being returned from the backend
- Verify the role field in your User model

## Backend Configuration

### Auth0 Setup
1. Create roles in Auth0: `admin`, `lecturer`, `student`
2. Add roles to the JWT token using Auth0 Rules
3. Configure the audience to match your API

### User Model
Ensure your User model has:
- `role` field (string: 'admin', 'lecturer', 'student')
- `auth0_id` field (string)
- `is_active` field (boolean, default: true)

## Next Steps
1. Test all admin endpoints with different user roles
2. Add more granular permissions (e.g., course-level access)
3. Implement refresh token handling
4. Add audit logging for admin actions
