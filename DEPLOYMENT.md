# Deployment Guide for Moodle Homework Planner

## Backend Deployment (Render.com)

### Required Environment Variables

Set these environment variables in your Render dashboard:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://your-render-backend-url.onrender.com/api
AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret
CLIENT_URL=https://your-frontend-domain.com
PRODUCTION_CLIENT_URL=https://your-frontend-domain.com
JWT_SECRET=your-jwt-secret-key
```

### Build Settings

- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 18.x or higher

## Frontend Deployment

### Environment Variables

Create a `.env` file in the `client/` directory:

```
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api
VITE_AUTH0_AUDIENCE=https://your-render-backend-url.onrender.com/api
VITE_APP_BASE_URL=https://your-frontend-domain.com
VITE_AUTH0_REDIRECT_URI=https://your-frontend-domain.com/callback
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
```

### Frontend Deployment Options

1. **Vercel** (Recommended)
   - Connect GitHub repository
   - Set environment variables
   - Deploy automatically

2. **Netlify**
   - Connect GitHub repository
   - Set environment variables
   - Configure build command: `npm run build`
   - Set publish directory: `dist`

3. **Render** (Static Site)
   - Connect GitHub repository
   - Set environment variables
   - Configure build command: `npm run build`
   - Set publish directory: `dist`

## Deployment Steps

### Backend (Render)
1. Connect your GitHub repository to Render
2. Set the backend environment variables listed above
3. Configure the build and start commands
4. Deploy!

### Frontend
1. Deploy to Vercel/Netlify/Render
2. Set the frontend environment variables
3. Update Auth0 settings with production URLs
4. Deploy!

## Auth0 Configuration Updates

After deployment, update your Auth0 settings:

### Allowed Callback URLs
```
https://your-frontend-domain.com/callback
```

### Allowed Logout URLs
```
https://your-frontend-domain.com
```

### Allowed Web Origins
```
https://your-frontend-domain.com
```

### Allowed Origins (CORS)
```
https://your-frontend-domain.com
```

## Troubleshooting

- Ensure all environment variables are set correctly
- Check that your MongoDB Atlas cluster allows connections from Render's IP ranges
- Verify Auth0 configuration matches your production settings
- Make sure CORS is configured to allow your frontend domain
- Check that all API calls use production URLs, not localhost

## File Structure

The application uses a monorepo structure:
- `/server` - Backend Express.js API
- `/client` - Frontend React application
- Root `package.json` - Orchestrates both client and server

The start script will automatically install server dependencies and start the backend server.
