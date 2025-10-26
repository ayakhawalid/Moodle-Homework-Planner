# Debugging 404 Errors - Complete Guide

## Problem Summary
All pages are getting 404 errors when trying to fetch data from MongoDB Atlas.

## Root Causes

### 1. Backend Not Running
If the backend server isn't running, ALL API calls will fail.

**Check:** 
```bash
cd server
npm run dev
```

**Or on Render:**
- Go to your Render dashboard
- Check if the service is running
- Look for logs

### 2. Backend URL Issue
The frontend might be pointing to the wrong backend URL.

**Check `client/.env` or `client/.env.local`:**
```env
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com
```

**Or for local development:**
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. User Not Synced to Database
When you first log in, the user profile needs to be synced from Auth0 to MongoDB.

**What happens:**
1. User logs in with Auth0 ✅
2. Frontend calls `POST /api/users` to sync profile
3. If this fails or hasn't completed yet, all other routes return 404

**Check:**
- Open browser console
- Look for: `Error fetching homework` or `User not found in database`
- The new error messages will say: "User profile not synced"

## Solutions

### Solution 1: Fix Backend Routes (Already Done)
I've updated `server/routes/homework.js` to return better error messages:
- Changed 404 to 500 status code
- Added descriptive error message
- Made it clear the issue is user sync timing

### Solution 2: Wait for User Sync
The `UserSyncContext` should sync your profile automatically. Check:
- Browser console for sync status
- Network tab for `/api/users` POST request

### Solution 3: Test Backend Connectivity

**Test from browser console:**
```javascript
// Check if backend is accessible
fetch('https://moodle-homework-planner.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)

// Should return: { status: 'OK', database: 'Connected', ... }
```

### Solution 4: Check Your Environment Variables

**Server (`server/.env`):**
```env
MONGODB_URI=mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com
```

**Client (`client/.env.local`):**
```env
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com
```

### Solution 5: Manual User Sync Test

**Create a test script to check if your user exists:**

```javascript
// In browser console after logging in
const token = await window.getAccessTokenSilently();
const response = await fetch('https://moodle-homework-planner.onrender.com/api/users/profile', {
  headers: { Authorization: `Bearer ${token}` }
});
const user = await response.json();
console.log('User:', user);
```

## Common Error Messages

### "Failed to load resource: 404"
This means the backend isn't running OR the route doesn't exist.

### "User not found in database"
The old error. Now changed to: "User profile not synced" with better explanation.

### "Network error - please check your connection"
Backend is unreachable. Check if:
- Server is running
- URL is correct
- Firewall isn't blocking

## Step-by-Step Debugging

1. **Check backend status:**
   ```bash
   curl https://moodle-homework-planner.onrender.com/api/health
   ```

2. **Check user sync:**
   - Log in to frontend
   - Open browser DevTools → Network
   - Filter by "users"
   - Look for POST to `/api/users` - should return 200

3. **Check database connection:**
   ```bash
   cd server
   npm run dev
   # Should see: "✅ Connected to MongoDB Atlas"
   ```

4. **Verify Auth0 token:**
   - Open browser console
   - Look for JWT token errors
   - Check if audience matches

## Quick Fixes

### If backend URL is wrong:
Update `client/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000  # for local dev
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com  # for production
```

### If CORS errors:
Check `server/server.js` has your frontend URL in allowed origins.

### If "User not found" errors:
The issue is timing - user sync happens after login. The app now has better error handling, but you might need to:
- Wait a few seconds after logging in
- Refresh the page
- Check browser console for sync status

## Next Steps

After deploying these changes:
1. Restart your backend server
2. Clear browser cache
3. Log out and log back in
4. Check if error messages are now more helpful
5. Check if user sync completes successfully

## Still Having Issues?

Check these logs:
- **Backend:** Render dashboard logs or `npm run dev` output
- **Frontend:** Browser console (F12)
- **Network:** DevTools → Network tab

The new error messages should tell you exactly what's wrong!

