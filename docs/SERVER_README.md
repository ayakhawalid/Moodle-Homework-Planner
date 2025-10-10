# Moodle Homework Planner - Backend API

Express.js + MongoDB backend for the Moodle Homework Planner application with Auth0 integration.

## 🚀 Features

- **MongoDB Database** with 9 collections matching your schema
- **Auth0 Integration** for secure authentication
- **Role-based Authorization** (Admin, Lecturer, Student)
- **RESTful API** with comprehensive endpoints
- **File Upload Support** for homework and class materials
- **Study Progress Tracking** with analytics
- **Automatic User Sync** from Auth0

## 📊 Database Schema

### Collections:
1. **Users** - Store all users with Auth0 integration
2. **Courses** - Course management with lecturer assignments
3. **Homework** - Assignment tracking with due dates
4. **Files** - File uploads for homework and classes
5. **Grades** - Grade management for homework and exams
6. **Partners** - Student partnership tracking
7. **Classes** - Class session management
8. **Exams** - Exam scheduling and management
9. **StudyProgress** - Daily/monthly study tracking

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Auth0 account configured

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Environment Configuration
Create a `.env` file with:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/moodle-homework-planner
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/moodle-homework-planner

# Auth0 Configuration
AUTH0_DOMAIN=dev-a82hpy3yh6az7pc7.us.auth0.com
AUTH0_AUDIENCE=http://localhost:5000

# CORS Configuration
CLIENT_URL=http://localhost:5173
```

### 3. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Database will be created automatically

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 4. Auth0 Configuration
1. Add API audience in Auth0 Dashboard
2. Update Auth0 domain and audience in `.env`
3. Configure JWT verification

### 5. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 📡 API Endpoints

### Authentication
- `GET /api/health` - Health check
- `GET /api/auth-test` - Test authentication

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/stats` - Get user statistics (Admin only)
- `PUT /api/users/:id/role` - Update user role (Admin only)

### Courses (Coming Soon)
- Course management endpoints

### Homework (Coming Soon)
- Assignment management endpoints

### Grades (Coming Soon)
- Grade management endpoints

### Study Progress (Coming Soon)
- Progress tracking endpoints

## 🔐 Authentication & Authorization

### JWT Token Required
All API endpoints (except health check) require a valid JWT token from Auth0.

### Role-based Access:
- **Admin**: Full access to all endpoints
- **Lecturer**: Access to their courses and students
- **Student**: Access to their own data

### Headers Required:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 🧪 Testing the API

### 1. Test Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Test Authentication
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
     http://localhost:5000/api/auth-test
```

### 3. Get User Profile
```bash
curl -H "Authorization: Bearer <your_jwt_token>" \
     http://localhost:5000/api/users/profile
```

## 📁 Project Structure

```
server/
├── config/
│   └── database.js          # MongoDB connection
├── middleware/
│   └── auth.js              # Auth0 JWT verification
├── models/
│   ├── User.js              # User schema
│   ├── Course.js            # Course schema
│   ├── Homework.js          # Homework schema
│   ├── File.js              # File schema
│   ├── Grade.js             # Grade schema
│   ├── Partner.js           # Partner schema
│   ├── Class.js             # Class schema
│   ├── Exam.js              # Exam schema
│   └── StudyProgress.js     # Study progress schema
├── routes/
│   └── users.js             # User endpoints
├── uploads/                 # File upload directory
├── .env                     # Environment variables
├── package.json             # Dependencies
└── server.js               # Main server file
```

## 🔄 Auto User Sync

When a user logs in through the React app:
1. JWT token is verified
2. User info is extracted from token
3. User is automatically created/updated in MongoDB
4. Role is synced from Auth0 custom claims

## 🚀 Next Steps

1. **Install dependencies**: `npm install`
2. **Configure environment**: Update `.env` file
3. **Start MongoDB**: Local or Atlas
4. **Run server**: `npm run dev`
5. **Test endpoints**: Use the provided curl commands
6. **Connect React app**: Update API base URL in React app

## 📝 Notes

- Server runs on port 5000 by default
- CORS is configured for React app on port 5173
- File uploads are stored in `/uploads` directory
- All timestamps are automatically managed
- Database indexes are optimized for performance
