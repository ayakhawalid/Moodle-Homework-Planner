import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavBar from './Components/NavBar';
import Footer from './Components/footer';
import Home from './pages/Home';

import Auth0Login from './pages/Auth0Login';
import Callback from './pages/Callback';
import ProtectedRoute from './Components/ProtectedRoute';
import Auth0Debug from './Components/Auth0Debug';
import Auth0ConfigDebug from './Components/Auth0ConfigDebug';
import ApiTest from './Components/ApiTest';
import AuthDebugger from './Components/AuthDebugger';
import Auth0ConfigTester from './Components/Auth0ConfigTester';
import AuthDebugPanel from './Components/AuthDebugPanel';
import BackendTest from './Components/BackendTest';
import RolePending from './pages/RolePending';
import TimeTable from './pages/TimeTable';
import RoleRequests from './pages/RoleRequests';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import ClassroomInfoStudent from './pages/student/ClassroomInfoStudent';
import Planner from './pages/student/Planner';
import HomeworkPlanner from './pages/student/HomeworkPlanner';
import Progress from './pages/student/Progress';
import ClassesPlanner from './pages/student/ClassesPlanner';
import StudyTimer from './pages/student/StudyTimer';
import StudyTracker from './pages/student/StudyTracker';
import ExamsFinals from './pages/student/ExamsFinals';
import ChoosePartner from './pages/student/ChoosePartner';
import CourseEnrollment from './pages/student/CourseEnrollment';

// Lecturer Pages
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import HomeworkChecker from './pages/lecturer/HomeworkChecker';

import WorkloadStats from './pages/lecturer/WorkloadStats';
import CourseManagement from './pages/lecturer/CourseManagement';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemAnalytics from './pages/admin/SystemAnalytics';
import Profile from './pages/Profile';

import './App.css';
import './styles/NavBar.css';
import './styles/footer.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Auth0ProviderWithHistory from './auth/Auth0Provider';
import { UserSyncProvider, useUserSyncContext } from "./contexts/UserSyncContext.jsx";

function App() {
  return (
    <Router>
      <Auth0ProviderWithHistory>
        <UserSyncProvider>
          <div className='App'>
            <AppContent />
          </div>
        </UserSyncProvider>
      </Auth0ProviderWithHistory>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  // Hide navbar on dashboard pages (they have their own sidebar navigation)
  // Also hide on /profile since it renders inside DashboardLayout
  // Hide navbar on login/signup pages (they have their own logo)
  const isDashboardPage =
    location.pathname.startsWith('/student/') ||
    location.pathname.startsWith('/lecturer/') ||
    location.pathname.startsWith('/admin/') ||
    location.pathname === '/profile' ||
    location.pathname === '/role-requests';

  const isLoginPage = 
    location.pathname === '/login' ||
    location.pathname.startsWith('/login?');

  const isHomePage = location.pathname === '/';

  return (
    <>
      {!isDashboardPage && !isLoginPage && !isHomePage && <NavBar />}
      <Routes>
          {/* Main Pages */}
          <Route path='/' element={<Home />} />
          <Route path='/login' element={<Auth0Login />} />
          <Route path='/callback' element={<Callback />} />
          <Route path='/auth0-debug' element={<Auth0Debug />} />
          <Route path='/auth0-config' element={<Auth0ConfigDebug />} />
          <Route path='/api-test' element={<ApiTest />} />
          <Route path='/auth-debug' element={<AuthDebugger />} />
          <Route path='/auth0-config-test' element={<Auth0ConfigTester />} />
          <Route path='/debug-panel' element={<AuthDebugPanel />} />
          <Route path='/backend-test' element={<BackendTest />} />
          <Route path='/role-pending' element={<RolePending />} />
          <Route path='/timetable' element={<TimeTable />} />
          <Route path='/profile' element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path='/role-requests' element={<ProtectedRoute><RoleRequests /></ProtectedRoute>} />

          {/* Student Pages */}
          <Route path='/student/dashboard' element={<ProtectedRoute requiredRole="student"><StudentDashboard /></ProtectedRoute>} />
          <Route path='/student/classroom' element={<ProtectedRoute requiredRole="student"><ClassroomInfoStudent /></ProtectedRoute>} />
          <Route path='/student/planner' element={<ProtectedRoute requiredRole="student"><Planner /></ProtectedRoute>} />
          <Route path='/student/homework' element={<ProtectedRoute requiredRole="student"><HomeworkPlanner /></ProtectedRoute>} />
          <Route path='/student/progress' element={<ProtectedRoute requiredRole="student"><Progress /></ProtectedRoute>} />
          <Route path='/student/classes' element={<ProtectedRoute requiredRole="student"><ClassesPlanner /></ProtectedRoute>} />
          <Route path='/student/timer' element={<ProtectedRoute requiredRole="student"><StudyTimer /></ProtectedRoute>} />
          <Route path='/student/tracker' element={<ProtectedRoute requiredRole="student"><StudyTracker /></ProtectedRoute>} />
          <Route path='/student/exams' element={<ProtectedRoute requiredRole="student"><ExamsFinals /></ProtectedRoute>} />
          <Route path='/student/partner' element={<ProtectedRoute requiredRole="student"><ChoosePartner /></ProtectedRoute>} />
          <Route path='/student/courses' element={<ProtectedRoute requiredRole="student"><CourseEnrollment /></ProtectedRoute>} />
          

          {/* Lecturer Pages */}
          <Route path='/lecturer/dashboard' element={<ProtectedRoute requiredRole="lecturer"><LecturerDashboard /></ProtectedRoute>} />
          <Route path='/lecturer/homework-checker' element={<ProtectedRoute requiredRole="lecturer"><HomeworkChecker /></ProtectedRoute>} />
          <Route path='/lecturer/stats' element={<ProtectedRoute requiredRole="lecturer"><WorkloadStats /></ProtectedRoute>} />
          <Route path='/lecturer/courses' element={<ProtectedRoute requiredRole="lecturer"><CourseManagement /></ProtectedRoute>} />
          

          {/* Admin Pages */}
          <Route path='/admin/dashboard' element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path='/admin/users' element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
          <Route path='/admin/analytics' element={<ProtectedRoute requiredRole="admin"><SystemAnalytics /></ProtectedRoute>} />
          
          
        </Routes>
        {!isDashboardPage && <Footer />}
      </>
    );
}



export default App;
