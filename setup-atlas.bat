@echo off
echo 🚀 Setting up MongoDB Atlas connection...

REM Create .env file in server directory
(
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=development
echo.
echo # MongoDB Atlas Configuration
echo MONGODB_URI=mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB
echo.
echo # Auth0 Configuration (update these with your actual values)
echo AUTH0_DOMAIN=your-auth0-domain
echo AUTH0_AUDIENCE=http://localhost:5000
echo.
echo # CORS Configuration
echo CLIENT_URL=http://localhost:5173
echo PRODUCTION_CLIENT_URL=https://your-production-domain.com
) > server\.env

echo ✅ Created server\.env file with MongoDB Atlas connection
echo.
echo 📝 Next steps:
echo 1. Update the Auth0 configuration in server\.env with your actual Auth0 values
echo 2. Run your backend server: cd server ^&^& npm start
echo 3. You should see: '✅ Connected to MongoDB Atlas'
echo.
echo 🔧 Your MongoDB Atlas connection string:
echo mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB
pause
