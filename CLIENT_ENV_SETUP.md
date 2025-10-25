# Client Environment Variables Setup Guide

## Create .env file in client/ directory

Create a file named `.env` in the `client/` directory with the following content:

```bash
# ===========================================
# PRODUCTION CONFIGURATION (for Vercel)
# ===========================================

# API Configuration  
# Note: API_BASE_URL should NOT have /api, but AUDIENCE should match your Auth0 API identifier (which likely has /api)
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com/api

# App Configuration
VITE_APP_BASE_URL=https://moodle-homework-planner.vercel.app
VITE_AUTH0_REDIRECT_URI=https://moodle-homework-planner.vercel.app/callback
```

## For Local Development

If you want to run locally, comment out the production URLs and uncomment these:

```bash
# VITE_API_BASE_URL=http://localhost:5000
# VITE_AUTH0_AUDIENCE=http://localhost:5000
# VITE_APP_BASE_URL=http://localhost:5173
# VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
```

## Steps to Create the File

1. Navigate to the `client/` directory
2. Create a new file named `.env`
3. Copy the production configuration above
4. Replace the placeholder values with your actual values

## Required Values to Replace

- `your-auth0-domain.auth0.com` → Your actual Auth0 domain
- `your-auth0-client-id` → Your actual Auth0 client ID
- `moodle-homework-planner.onrender.com` → Your actual Render backend URL
- `moodle-homework-planner.vercel.app` → Your actual Vercel frontend URL

## Vercel Environment Variables

In your Vercel dashboard, set these same variables:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add each variable:
   - `VITE_AUTH0_DOMAIN`
   - `VITE_AUTH0_CLIENT_ID`
   - `VITE_AUTH0_AUDIENCE`
   - `VITE_API_BASE_URL`
   - `VITE_APP_BASE_URL`
   - `VITE_AUTH0_REDIRECT_URI`

## Important Notes

- Never commit `.env` files to git (they should be in .gitignore)
- Environment variables starting with `VITE_` are exposed to the browser
- Make sure URLs match exactly between Auth0 settings and environment variables
- No trailing slashes in URLs unless required
