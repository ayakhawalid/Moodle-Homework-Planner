#!/bin/bash

# Test Backend Connectivity
echo "🔍 Testing Backend Connectivity..."
echo ""

# Test 1: Health Check (No Auth)
echo "1. Testing Health Endpoint (No Auth Required):"
curl -s https://moodle-homework-planner.onrender.com/api/health || echo "❌ Backend not accessible"
echo ""
echo ""

# Test 2: Check MongoDB Connection
echo "2. Checking MongoDB Connection via Backend:"
curl -s https://moodle-homework-planner.onrender.com/api/health | grep -q "Connected" && echo "✅ MongoDB Connected" || echo "❌ MongoDB Not Connected"
echo ""
echo ""

# Test 3: Check if server is running on Render
echo "3. Checking Render Service Status:"
echo "Visit: https://dashboard.render.com"
echo ""

# Test 4: Check environment
echo "4. Backend URL should be:"
echo "   https://moodle-homework-planner.onrender.com"
echo ""
echo "   Check client/src/services/api.js:"
echo "   Line 6: baseURL: import.meta.env.VITE_API_BASE_URL || 'https://moodle-homework-planner.onrender.com'"
echo ""

echo "✅ Testing complete!"
echo ""
echo "If you see 404 errors in the app:"
echo "1. Backend might not be running on Render"
echo "2. Wait for user sync after login"
echo "3. Check browser console for detailed error messages"

