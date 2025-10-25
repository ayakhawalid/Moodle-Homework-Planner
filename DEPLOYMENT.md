# Deployment Guide for Moodle Homework Planner

## Render.com Deployment Configuration

### Required Environment Variables

Set these environment variables in your Render dashboard:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=your-auth0-audience
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

### Deployment Steps

1. Connect your GitHub repository to Render
2. Set the environment variables listed above
3. Configure the build and start commands
4. Deploy!

### Troubleshooting

- Ensure all environment variables are set correctly
- Check that your MongoDB Atlas cluster allows connections from Render's IP ranges
- Verify Auth0 configuration matches your production settings
- Make sure CORS is configured to allow your frontend domain

### File Structure

The application uses a monorepo structure:
- `/server` - Backend Express.js API
- `/client` - Frontend React application
- Root `package.json` - Orchestrates both client and server

The start script will automatically install server dependencies and start the backend server.
