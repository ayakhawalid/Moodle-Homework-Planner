# Vercel Configuration Instructions

## Current Issue
You're getting 404 errors because Vercel isn't properly configured for your monorepo structure.

## Solution Options

### Option 1: Configure Vercel Project Settings (Recommended)

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → General
4. Set these values:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option 2: Use the vercel.json file

The current `vercel.json` should work, but you might need to:

1. **Delete the current deployment**
2. **Redeploy** with the new configuration
3. **Or manually trigger a redeploy**

### Option 3: Alternative vercel.json

If the current one doesn't work, try this configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Steps to Fix

1. **Update Vercel project settings** (Option 1 - most reliable)
2. **Or update vercel.json** and redeploy
3. **Test the /callback route** after redeployment

## Why This Happens

- Vercel is trying to serve files from the root directory
- But your React app is in the `client/` subdirectory
- The routing configuration tells Vercel to serve `index.html` for all routes
- But it needs to know where to find the built files
