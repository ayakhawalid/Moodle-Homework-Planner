#!/bin/bash

# MongoDB Atlas Setup Script
# This script helps you set up your environment variables for MongoDB Atlas

echo "🚀 Setting up MongoDB Atlas connection..."

# Create .env file in server directory
cat > server/.env << EOF
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB

# Auth0 Configuration (update these with your actual values)
AUTH0_DOMAIN=your-auth0-domain
AUTH0_AUDIENCE=http://localhost:5000

# CORS Configuration
CLIENT_URL=http://localhost:5173
PRODUCTION_CLIENT_URL=https://your-production-domain.com
EOF

echo "✅ Created server/.env file with MongoDB Atlas connection"
echo ""
echo "📝 Next steps:"
echo "1. Update the Auth0 configuration in server/.env with your actual Auth0 values"
echo "2. Run your backend server: cd server && npm start"
echo "3. You should see: '✅ Connected to MongoDB Atlas'"
echo ""
echo "🔧 Your MongoDB Atlas connection string:"
echo "mongodb+srv://aia-user1:aia@cluster0.y9gor0a.mongodb.net/plannerDB"
