import React from 'react';
import { useLocation } from 'react-router-dom';
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
import RolePending from './pages/RolePending';
import BookRooms from './pages/BookRooms';
import TimeTable from './pages/TimeTable';

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

// Lecturer Pages
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import HomeworkChecker from './pages/lecturer/HomeworkChecker';
import ClassroomInfoLecturer from './pages/lecturer/ClassroomInfoLecturer';
import WorkloadStats from './pages/lecturer/WorkloadStats';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemAnalytics from './pages/admin/SystemAnalytics';
import SystemSettings from './pages/admin/SystemSettings';

import './App.css';
import './styles/NavBar.css';
import './styles/footer.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth0ProviderWithHistory from './auth/Auth0Provider';

function App() {
  return (
    <Auth0ProviderWithHistory>
      <div className='App'>
        <Router>
          <AppContent />
        </Router>
      </div>
    </Auth0ProviderWithHistory>
  );
}

function AppContent() {
  const location = useLocation();

  // Hide navbar on dashboard pages (they have their own sidebar navigation)
  const isDashboardPage = location.pathname.startsWith('/student/') || location.pathname.startsWith('/lecturer/') || location.pathname.startsWith('/admin/');

  return (
    <>
      {!isDashboardPage && <NavBar />}
      <Routes>
          {/* Main Pages */}
          <Route path='/' element={<Home/>} />
          <Route path='/login' element={<Auth0Login />} />
          <Route path='/callback' element={<Callback />} />
          <Route path='/auth0-debug' element={<Auth0Debug />} />
          <Route path='/auth0-config' element={<Auth0ConfigDebug />} />
          <Route path='/api-test' element={<ApiTest />} />
          <Route path='/auth-debug' element={<AuthDebugger />} />
          <Route path='/auth0-config-test' element={<Auth0ConfigTester />} />
          <Route path='/role-pending' element={<RolePending />} />
          <Route path='/bookrooms' element={<BookRooms />} />
          <Route path='/timetable' element={<TimeTable />} />

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

          {/* Lecturer Pages */}
          <Route path='/lecturer/dashboard' element={<ProtectedRoute requiredRole="lecturer"><LecturerDashboard /></ProtectedRoute>} />
          <Route path='/lecturer/homework-checker' element={<ProtectedRoute requiredRole="lecturer"><HomeworkChecker /></ProtectedRoute>} />
          <Route path='/lecturer/classroom' element={<ProtectedRoute requiredRole="lecturer"><ClassroomInfoLecturer /></ProtectedRoute>} />
          <Route path='/lecturer/stats' element={<ProtectedRoute requiredRole="lecturer"><WorkloadStats /></ProtectedRoute>} />

          {/* Admin Pages */}
          <Route path='/admin/dashboard' element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path='/admin/users' element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
          <Route path='/admin/analytics' element={<ProtectedRoute requiredRole="admin"><SystemAnalytics /></ProtectedRoute>} />
          <Route path='/admin/settings' element={<ProtectedRoute requiredRole="admin"><SystemSettings /></ProtectedRoute>} />
        </Routes>
        {!isDashboardPage && <Footer />}
      </>
    );
}



export default App;
