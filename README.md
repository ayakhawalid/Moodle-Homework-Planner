# Moodle Homework Planner

A comprehensive community web application for managing homework, tracking progress, and organizing academic schedules. Built with React, Node.js, Express, and MongoDB.

## 📁 Project Structure

```
Moodle Homework Planner/
│
├── 📂 client/                    # Frontend React application
│   ├── src/                      # Source code
│   │   ├── Components/           # Reusable React components
│   │   ├── pages/                # Page components (Student, Lecturer, Admin)
│   │   ├── contexts/             # React contexts
│   │   ├── hooks/                # Custom React hooks
│   │   ├── services/             # API service layer
│   │   ├── styles/               # CSS stylesheets
│   │   └── auth/                 # Auth0 authentication
│   ├── public/                   # Static assets
│   ├── dist/                     # Production build (auto-generated)
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Vite configuration
│
├── 📂 server/                    # Backend Node.js/Express application
│   ├── routes/                   # API route handlers
│   │   ├── studentDashboard.js   # Student endpoints
│   │   ├── lecturerDashboard.js  # Lecturer endpoints
│   │   ├── courses.js            # Course management
│   │   ├── homework.js           # Homework endpoints
│   │   ├── exams.js              # Exam endpoints
│   │   └── users.js              # User management
│   ├── models/                   # MongoDB/Mongoose models
│   │   ├── User.js               # User model
│   │   ├── Course.js             # Course model
│   │   ├── Homework.js           # Homework model
│   │   └── ...                   # Other models
│   ├── services/                 # Business logic services
│   ├── middleware/               # Express middleware
│   ├── config/                   # Configuration files
│   ├── scripts/                  # Utility scripts
│   │   ├── seeds/                # Database seeding scripts
│   │   ├── tests/                # Test scripts
│   │   └── utilities/            # Utility scripts
│   ├── uploads/                  # File uploads directory
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Main server entry point
│
├── 📂 docs/                      # Documentation
│   ├── ADMIN_GUIDE.md            # Administrator guide
│   ├── AUTH0_SETUP.md            # Auth0 configuration guide
│   ├── CLIENT_README.md          # Frontend documentation
│   └── SERVER_README.md          # Backend documentation
│
├── 📂 scripts/                   # Root-level utility scripts
│   ├── fix-roles-correct.js      # Role fixing script
│   ├── test-auth0-config.js      # Auth0 testing
│   └── test-callback-url.js      # Callback URL testing
│
├── 📂 database/                  # MongoDB database files (gitignored)
├── 📂 data/                      # Application data (gitignored)
│
├── .gitignore                    # Git ignore rules
├── package.json                  # Root dependencies
└── README.md                     # This file

```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Moodle Homework Planner"
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Configure environment variables**
   
   Create `.env` files in both `client/` and `server/` directories. See `docs/AUTH0_SETUP.md` for Auth0 configuration details.

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Run the application**
   
   In separate terminal windows:
   
   ```bash
   # Terminal 1 - Start backend server
   cd server
   npm start
   
   # Terminal 2 - Start frontend dev server
   cd client
   npm run dev
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

## 📚 Documentation

- **Admin Guide**: `docs/ADMIN_GUIDE.md`
- **Auth0 Setup**: `docs/AUTH0_SETUP.md`
- **Client Documentation**: `docs/CLIENT_README.md`
- **Server Documentation**: `docs/SERVER_README.md`

## 🛠️ Development

### Available Scripts

**Client:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Server:**
- `npm start` - Start server
- `npm run dev` - Start with nodemon (auto-restart)
- `npm test` - Run tests

### Database Seeding

```bash
cd server
node scripts/seeds/seed-cs-courses.js
node scripts/seeds/seed-student-dashboard.js
```

### Utility Scripts

Located in `server/scripts/utilities/`:
- `fix-roles-manual.js` - Fix user roles
- `sync-user-role.js` - Sync user roles with Auth0
- `port-test.js` - Test port availability

## 👥 User Roles

- **Student**: Create homework, track progress, view schedules
- **Lecturer**: Create homework, tracke students progress, view schedules, manage courses
- **Admin**: User management, system configuration

## 🔐 Authentication

This application uses Auth0 for authentication. See `docs/AUTH0_SETUP.md` for configuration instructions.

## 📦 Tech Stack

**Frontend:**
- React 18
- Vite
- Material-UI
- React Router
- Axios

**Backend:**
- Node.js
- Express.js
- MongoDB
- Mongoose
- Auth0

## 📧 Contact

email: aia.khaw110@gmail.com

