# Fix Vercel Environment Variable

## The Problem

Your `VITE_API_BASE_URL` in Vercel includes `/api` at the end, which causes double `/api/api/` in URLs.

## The Fix

### In Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select your project: `moodle-homework-planner`
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_API_BASE_URL`
5. **Change from:**
   ```
   https://moodle-homework-planner.onrender.com/api
   ```
6. **Change to:**
   ```
   https://moodle-homework-planner.onrender.com
   ```
7. Click **Save**
8. **Redeploy** your app

### After redeploy:

Your URLs will be correct:
- ✅ `https://moodle-homework-planner.onrender.com/api/homework`
- ✅ `https://moodle-homework-planner.onrender.com/api/users`
- ❌ ~~`https://moodle-homework-planner.onrender.com/api/api/homework`~~ (double /api)

## Why?

The code in `client/src/services/api.js` has a function called `withApi()` that automatically adds `/api` to all paths:

```javascript
const withApi = (path) => {
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api${path}`;
  return `/api/${path}`;
};
```

So you should NOT include `/api` in the `VITE_API_BASE_URL`.

## Quick Check

After redeploying, test in the browser console:

```javascript
// Should return: { status: 'OK', ... }
fetch('https://moodle-homework-planner.onrender.com/api/health')
  .then(r => r.json())
  .then(console.log)
```

If this works, your environment variable is correct!

