# CORS Configuration Guide

## Overview
CORS (Cross-Origin Resource Sharing) is configured in `server/server.js` to prevent cross-origin request errors.

## Current Configuration

### Allowed Origins

The backend accepts requests from:

1. **Local Development:**
   - `http://localhost:5173` (Vite default)
   - `http://localhost:5174`
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:5173`
   - `http://127.0.0.1:5174`
   - Any `localhost` URL (development mode only)

2. **Vercel Deployments:**
   - `https://moodle-homework-planner.vercel.app` (production)
   - Any `*.vercel.app` URL (preview deployments)

3. **Custom Domains:**
   - Set via environment variables:
     - `CLIENT_URL`
     - `PRODUCTION_CLIENT_URL`
     - `FRONTEND_URL`

## How It Works

### Development Mode
- Allows ALL localhost origins
- Logs all requests for debugging
- More lenient to prevent blocking during development

### Production Mode
- Strict origin checking
- Only allows pre-configured origins
- Rejects unknown origins
- Logs rejected origins

## Setting Up for Your Deployment

### 1. For Vercel Frontend + Render Backend

**Render Backend** (`server/.env`):
```env
# Optional - only needed if you want to track the frontend URL
CLIENT_URL=https://moodle-homework-planner.vercel.app
```

**Vercel Frontend** (`client/.env`):
```env
# Don't include /api at the end!
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### 2. For Custom Domain

If you have a custom domain, add it to:

**Render Environment Variables:**
```
PRODUCTION_CLIENT_URL=https://yourcustomdomain.com
```

Then the backend will automatically allow it.

### 3. Testing Locally

Frontend:
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

Backend:
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

CORS will automatically allow localhost in dev mode.

## Debugging CORS Issues

### Check Backend Logs
When a request is made, you'll see:
```
✅ CORS: Allowed origin: https://your-app.vercel.app
```

Or if rejected:
```
⚠️  CORS: Rejected origin: https://bad-origin.com
Allowed origins: [...]
```

### Browser Console
CORS errors show as:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

### Common Issues & Solutions

#### Issue 1: "No 'Access-Control-Allow-Origin' header"
**Solution:** Check that your frontend URL is in the allowed list

#### Issue 2: "Credential is not supported"
**Solution:** This means credentials are sent. Check that:
- `credentials: true` is set (already configured ✅)
- Frontend sends credentials: `credentials: 'include'` in fetch calls

#### Issue 3: "Preflight request doesn't pass"
**Solution:** Make sure OPTIONS method is allowed (already configured ✅)

## Adding New Origins

### For a New Frontend URL:

1. **Temporary:** Update `server/server.js` and add to `allowedOrigins` array:
   ```javascript
   const allowedOrigins = [
     // ... existing origins
     'https://your-new-frontend.com'
   ];
   ```

2. **Permanent (Recommended):** Use environment variable:
   
   In `server/.env`:
   ```env
   CLIENT_URL=https://your-new-frontend.com
   ```
   
   Then the backend will automatically include it.

### For Multiple Frontends:

```javascript
// In server.js, you can add multiple URLs
const allowedOrigins = [
  'https://frontend1.com',
  'https://frontend2.com',
  process.env.CLIENT_URL,
  process.env.OTHER_FRONTEND_URL
].filter(Boolean);
```

## Security Features

1. **Production Mode:**
   - Strict origin checking
   - Rejects unknown origins
   - Logs all rejections

2. **Credential Handling:**
   - Supports authentication cookies
   - Required for Auth0 integration

3. **Preflight Caching:**
   - Caches CORS preflight requests for 24 hours
   - Reduces server load

4. **Logging:**
   - Logs all allowed origins
   - Logs rejected origins with details
   - Helps debugging

## Testing CORS

### Test from Browser Console:
```javascript
// Should work (your Vercel URL)
fetch('https://your-backend.onrender.com/api/health', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Test with Curl:
```bash
# Simple request
curl -I https://your-backend.onrender.com/api/health

# Preflight request
curl -X OPTIONS https://your-backend.onrender.com/api/health \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```

## Environment Variables Summary

### Backend (Render)
```env
# Optional - frontend URL(s)
CLIENT_URL=https://your-frontend.vercel.app
PRODUCTION_CLIENT_URL=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# Required for Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=https://your-backend.onrender.com

# Required for MongoDB
MONGODB_URI=mongodb+srv://...

# Optional - controls behavior
NODE_ENV=production  # or development
```

### Frontend (Vercel)
```env
# Required - backend URL (NO /api at the end!)
VITE_API_BASE_URL=https://your-backend.onrender.com

# Required for Auth0
VITE_AUTH0_DOMAIN=your-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-backend.onrender.com
```

## Quick Reference

| Environment | Frontend URL | Backend URL | Status |
|------------|-------------|-------------|---------|
| Local Dev | http://localhost:5173 | http://localhost:5000 | ✅ Auto-allowed |
| Vercel Prod | https://app.vercel.app | https://backend.onrender.com | ✅ Configured |
| Custom Domain | https://yourapp.com | https://backend.onrender.com | ⚠️ Need to add |

## Need Help?

If you get CORS errors:

1. Check backend logs for origin rejection messages
2. Verify your frontend URL matches an allowed origin
3. Check that `VITE_API_BASE_URL` is set correctly (no `/api` at the end!)
4. Clear browser cache and hard refresh (Ctrl+Shift+R)
5. Check Network tab in browser DevTools for CORS error details

## Summary

✅ All localhost URLs are allowed in development  
✅ All Vercel deployments (*.vercel.app) are allowed  
✅ Environment variables can add custom domains  
✅ Production mode is secure  
✅ Dev mode is lenient for testing  
✅ Logging helps debug issues  

This configuration should prevent CORS errors now and in the future! 🎉

