import React from 'react';
import NavBar from './Components/NavBar';
import Footer from './Components/footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
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

import './App.css';
import './styles/NavBar.css';
import './styles/footer.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className='App'>
      <Router>
        <NavBar />
        <Routes>
          {/* Main Pages */}
          <Route path='/' element={<Home/>} />
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Signup />} />
          <Route path='/bookrooms' element={<BookRooms />} />
          <Route path='/timetable' element={<TimeTable />} />

          {/* Student Pages */}
          <Route path='/student/dashboard' element={<StudentDashboard />} />
          <Route path='/student/classroom' element={<ClassroomInfoStudent />} />
          <Route path='/student/planner' element={<Planner />} />
          <Route path='/student/homework' element={<HomeworkPlanner />} />
          <Route path='/student/progress' element={<Progress />} />
          <Route path='/student/classes' element={<ClassesPlanner />} />
          <Route path='/student/timer' element={<StudyTimer />} />
          <Route path='/student/tracker' element={<StudyTracker />} />
          <Route path='/student/exams' element={<ExamsFinals />} />
          <Route path='/student/partner' element={<ChoosePartner />} />

          {/* Lecturer Pages */}
          <Route path='/lecturer/dashboard' element={<LecturerDashboard />} />
          <Route path='/lecturer/homework-checker' element={<HomeworkChecker />} />
          <Route path='/lecturer/classroom' element={<ClassroomInfoLecturer />} />
          <Route path='/lecturer/stats' element={<WorkloadStats />} />
        </Routes>
        <Footer />
      </Router>
    </div>
  );
}



export default App;
