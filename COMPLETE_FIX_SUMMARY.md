# Complete Fix Summary for 404 Errors and Missing Data

## The Two Problems You Had

### Problem 1: 404 Errors (Currently Happening)
**Cause:** You added `/api` to `VITE_API_BASE_URL` in Vercel  
**Result:** Double `/api/api/` in URLs → 404 errors

**Fix:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Change `VITE_API_BASE_URL` from:
   ```
   https://moodle-homework-planner.onrender.com/api  ❌
   ```
   to:
   ```
   https://moodle-homework-planner.onrender.com      ✅
   ```
3. Redeploy your app

### Problem 2: Data from Atlas Not Showing (Before the /api change)
**Cause:** User profile not synced to MongoDB yet  
**Result:** Empty data/no data on dashboards

**Why it happens:**
- When you first log in, Auth0 authenticates you ✅
- But your profile needs to be synced to MongoDB ✅
- The `UserSyncContext` handles this automatically
- It calls `POST /api/users` to create/update your profile

**This should fix automatically after you fix Problem 1**

## How User Sync Works

```
1. User logs in with Auth0
   ↓
2. UserSyncContext activates (client/src/contexts/UserSyncContext.jsx)
   ↓
3. Calls POST /api/users with user data
   ↓
4. Server creates/updates user in MongoDB
   ↓
5. syncStatus changes from 'syncing' → 'synced'
   ↓
6. All dashboard pages wait for 'synced' status
   ↓
7. Then fetch and display data
```

## How to Verify It's Fixed

### Step 1: Fix Vercel Environment Variable
See instructions above ↑

### Step 2: Test the Backend
```bash
curl https://moodle-homework-planner.onrender.com/api/health
```
Should return: `{"status":"OK","database":"Connected",...}`

### Step 3: Test in Browser
1. Open your app in browser
2. Open DevTools Console (F12)
3. Log in
4. Look for these logs:
   ```
   UserSyncContext - Setting up token provider
   UserSyncContext - Token retrieved successfully
   User synced successfully
   ```

### Step 4: Check Network Tab
1. Open DevTools → Network tab
2. Log in again
3. Look for `POST /api/users` request
4. Should return 200 (not 404)

### Step 5: Check Your Dashboard
1. After logging in, wait 2-3 seconds
2. Dashboard should show data
3. If not, check console for error messages

## Common Issues & Solutions

### Issue: "User profile not synced" error (500)
**Solution:** Wait a few seconds after login, then refresh the page

### Issue: Still getting 404 errors
**Check:**
1. Did you remove `/api` from `VITE_API_BASE_URL`? 
2. Did you redeploy after changing the env var?
3. Try clearing browser cache

### Issue: Data still not showing
**Check:**
1. Open console and look for error messages
2. Open Network tab and see if API calls are returning data
3. Check if `syncStatus === 'synced'` in console

### Issue: "Student not found" or "Lecturer not found"
**Solution:** This is the old error. I've already updated `server/routes/homework.js` to show better error messages. The new error says:
```json
{
  "error": "User profile not synced",
  "message": "Your user profile is not yet synced with the database..."
}
```

## What I Fixed in the Code

### In `server/routes/homework.js`:
Changed error handling from 404 to 500 with better messages:
- **Before:** `return res.status(404).json({ error: 'Student not found' });`
- **After:** Returns 500 with detailed error message explaining it's a sync issue

This helps debugging because:
- 404 = route doesn't exist (confusing when route DOES exist)
- 500 = server error (more accurate - user sync timing issue)

## Quick Debugging Commands

### Test Backend Health:
```bash
curl https://moodle-homework-planner.onrender.com/api/health
```

### Test Backend in Browser:
```javascript
// In browser console
fetch('https://moodle-homework-planner.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

### Check Your Environment:
```javascript
// In browser console
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
```

### Check User Sync:
```javascript
// In browser console
const token = await window.getAccessTokenSilently();
fetch('https://moodle-homework-planner.onrender.com/api/users/profile', {
  headers: { Authorization: `Bearer ${token}` }
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

## Files Changed

1. ✅ `server/routes/homework.js` - Better error handling
2. ✅ Created `DEBUGGING_404_ERRORS.md` - Debugging guide
3. ✅ Created `VERCEL_ENV_FIX.md` - Vercel fix instructions
4. ✅ Created `test-backend.sh` - Test script

## Next Steps

1. **Fix Vercel environment variable** (remove `/api`)
2. **Redeploy**
3. **Test in browser**
4. **Check console for any remaining errors**

## If Still Having Issues

Run this in browser console after logging in:

```javascript
// Check all environment variables
console.log({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_AUTH0_DOMAIN: import.meta.env.VITE_AUTH0_DOMAIN,
  VITE_AUTH0_CLIENT_ID: import.meta.env.VITE_AUTH0_CLIENT_ID,
  VITE_AUTH0_AUDIENCE: import.meta.env.VITE_AUTH0_AUDIENCE
});

// Check sync status
import { useUserSyncContext } from './contexts/UserSyncContext';
// This will only work in a React component, but gives you the idea
```

Good luck! The main fix is removing `/api` from your `VITE_API_BASE_URL` in Vercel. 🚀

