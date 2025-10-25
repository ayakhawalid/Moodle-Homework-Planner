# Environment Configuration Guide

## Frontend (Client) Environment Variables

Create a `.env` file in the `client/` directory with these variables:

```bash
# Production URLs (for deployment)
# Note: API_BASE_URL should NOT have /api, but AUDIENCE should match your Auth0 API identifier
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com
VITE_AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com/api
VITE_APP_BASE_URL=https://your-frontend-domain.com
VITE_AUTH0_REDIRECT_URI=https://your-frontend-domain.com/callback

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
```

## Backend (Server) Environment Variables

Set these in your Render dashboard:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# Auth0 Configuration
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com/api
AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret

# Client URLs (for CORS)
CLIENT_URL=https://your-frontend-domain.com
PRODUCTION_CLIENT_URL=https://your-frontend-domain.com

# JWT Secret
JWT_SECRET=your-jwt-secret-key
```

## Development vs Production

### Development (Local)
```bash
# Frontend .env
VITE_API_BASE_URL=http://localhost:5000
VITE_AUTH0_AUDIENCE=http://localhost:5000
VITE_APP_BASE_URL=http://localhost:5173
VITE_AUTH0_REDIRECT_URI=http://localhost:5173/callback
```

### Production (Render)
```bash
# Frontend .env
VITE_API_BASE_URL=https://moodle-homework-planner.onrender.com
VITE_AUTH0_AUDIENCE=https://moodle-homework-planner.onrender.com/api
VITE_APP_BASE_URL=https://your-frontend-domain.com
VITE_AUTH0_REDIRECT_URI=https://your-frontend-domain.com/callback
```

## Important Notes

1. **Replace `moodle-homework-planner.onrender.com`** with your actual Render backend URL
2. **Replace `your-frontend-domain.com`** with your actual frontend domain
3. **Replace Auth0 values** with your actual Auth0 configuration
4. **Update Auth0 settings** to include your production URLs in:
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
   - Allowed Origins (CORS)

## Deployment Checklist

- [ ] Backend deployed to Render with environment variables
- [ ] Frontend environment variables configured
- [ ] Auth0 settings updated with production URLs
- [ ] CORS configured to allow frontend domain
- [ ] Database connection string updated
- [ ] All hardcoded localhost URLs replaced
