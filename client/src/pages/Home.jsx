import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserSyncContext } from '../contexts/UserSyncContext'
import FallingLeaves from '../components/FallingLeaves'
import '../styles/Home.css'

function Home() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, userRole } = useAuth()
  const { syncStatus } = useUserSyncContext()
  
  // Slideshow state
  const [currentSlide, setCurrentSlide] = useState(0)
  const screenshots = [
    { src: '/src/assets/Screenshot (823).png', alt: 'Dashboard Overview' },
    { src: '/src/assets/Screenshot (824).png', alt: 'Homework Management' },
    { src: '/src/assets/Screenshot (825).png', alt: 'Progress Tracking' }
  ]

  // Slideshow functions
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % screenshots.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + screenshots.length) % screenshots.length)
  }

  const goToSlide = (index) => {
    setCurrentSlide(index)
  }

  // Redirect authenticated users immediately
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole && syncStatus === 'synced') {
      console.log('Home component: Redirecting authenticated user to dashboard')
      navigate(`/${userRole}/dashboard`, { replace: true })
    }
  }, [isLoading, isAuthenticated, userRole, syncStatus, navigate])

  // Show loading for authenticated users while redirecting
  if (isAuthenticated && userRole && syncStatus === 'synced') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>Redirecting to Dashboard...</h2>
      </div>
    )
  }

  // Show home page for non-authenticated users
  return (
    <div className="home-container">
      {/* Four Colored Walls Background */}
      <div className="wall wall-1"></div>
      <div className="wall wall-2"></div>
      <div className="wall wall-3"></div>
      <div className="wall wall-4"></div>

      {/* Main Content */}
      <div className="about-section">
        {/* Navigation Bar with Logo and Login/Signup Buttons */}
        <div className="nav-buttons">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img src="/favicon.svg" alt="Logo" className="nav-logo-img" />
            <span className="nav-logo-text">Moodle Homework Planner</span>
          </div>
          <div className="nav-auth-buttons">
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login?mode=signup')}
            >
              SIGN UP
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => navigate('/login')}
            >
              LOG IN
            </button>
          </div>
        </div>

        {/* Four Color Circles */}
        <div className="colored-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
          <div className="circle circle-4"></div>
        </div>
        
        <p className="main-description">
          Manage homework, track progress, and collaborate effectively in your academic journey.
        </p>
        
        <div className="center-btn-container">
          <button 
            className="get-started-btn center-btn"
            onClick={() => navigate('/login?mode=signup')}
          >
            GET STARTED
          </button>
          
          <img 
            src="/src/assets/—Pngtree—hand drawn scribble curved arrow_21731770.png" 
            alt="Pointing Arrow" 
            className="pointing-arrow"
          />
        </div>
            
            <h2 className="about-title">About</h2>
            
            {/* Magazine-style layout: Logo on left */}
            <div className="magazine-layout">
              <div className="magazine-image">
                <img src="/favicon.svg" alt="Moodle Homework Planner Logo" className="magazine-logo" />
              </div>
                  <div className="magazine-content">
                    
                    <p className="about-text magazine-text">
                      The Moodle Homework Planner is a community-driven academic management platform that empowers students to take control of their learning journey. Managed by students and lecturers, our platform provides an intuitive way to organize homework, track progress, and collaborate with peers in a supportive academic environment.
                    </p>
                  </div>
            </div>
            
            <h3 className="about-subtitle">What Makes Us Different</h3>
            <div className="features-list">
              <div className="feature-item">
                <h4>Student-Centered Design</h4>
                <p>You're in control! Add your own homework assignments, set your deadlines, and organize your academic life exactly how you want it. No complex integrations or system dependencies - just simple, effective homework management.</p>
              </div>
              
              <div className="feature-item">
                <h4>Lecturer Workload Management</h4>
                <p>Lecturers can monitor their students' academic workload through comprehensive overview tools. See what courses your students are taking, track their assignment loads, and identify when students might be experiencing heavy weeks to provide appropriate support.</p>
              </div>
              
              <div className="feature-item">
                <h4>Homework Peer System</h4>
                <p>Choose peers for specific homework assignments when you need collaboration. Simply select classmates who can work with you on particular assignments - it's that straightforward and simple.</p>
              </div>
              
              <div className="feature-item">
                <h4>Flexible Progress Tracking</h4>
                <p>Watch your academic journey unfold with our simple yet powerful tracking system. See how your hard work translates into completed assignments and improved performance over time.</p>
              </div>
              
              <div className="feature-item">
                <h4>Course Workload Overview</h4>
                <p>Lecturers get detailed insights into student course loads and assignment distribution. Make informed decisions about assignment timing and identify students who may need additional support during challenging academic periods.</p>
              </div>
              
              <div className="feature-item">
                <h4>Always Accessible</h4>
                <p>Access your homework planner anywhere, anytime. Whether you're in the library, at home, or on the go, your academic organizer is always in your pocket.</p>
              </div>
            </div>
            
            {/* App Preview Slideshow Section */}
            <div className="app-preview-section">
              <h3 className="preview-title">See It In Action</h3>
              <p className="preview-description">
                Get a glimpse of how our platform looks and works in practice.
              </p>
              
              <div className="slideshow-container">
                <div className="slideshow-wrapper">
                  <button className="slide-btn prev-btn" onClick={prevSlide}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  </button>
                  
                  <div className="slide-container">
                    <img 
                      src={screenshots[currentSlide].src}
                      alt={screenshots[currentSlide].alt}
                      className="preview-image"
                    />
                  </div>
                  
                  <button className="slide-btn next-btn" onClick={nextSlide}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </button>
                </div>
                
                {/* Slide indicators */}
                <div className="slide-indicators">
                  {screenshots.map((_, index) => (
                    <button
                      key={index}
                      className={`indicator ${index === currentSlide ? 'active' : ''}`}
                      onClick={() => goToSlide(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <h3 className="about-subtitle">How It Works</h3>
            <p className="about-text">
              Getting started is simple! Sign up, enroll in your courses, and begin creating your homework assignments. Set your own deadlines, track your progress through our four-stage system (Not Started, In Progress, Completed, Graded), and choose peers for specific assignments when you need collaboration.
            </p>
            
            <p className="about-text">
              Our platform grows with your needs. Whether you're managing a heavy course load or looking for homework peers, you'll find the tools and community support to make your academic journey smoother and more enjoyable.
            </p>
            
            <p className="about-text">
              For lecturers, our platform provides powerful tools to manage course content, track student progress, and facilitate collaborative learning. Create assignments, monitor completion rates, and engage with students through our intuitive interface designed specifically for academic environments.
            </p>
            
            {/* Falling Leaves Component */}
            <FallingLeaves />
            
            <div className="status-system">
              <h3 className="status-title">Status Tracking System</h3>
              <p className="status-description">
                Every homework assignment is tracked through four distinct statuses, each represented by our color theme:
              </p>
              
              <div className="status-grid">
                <div className="status-item">
                  <div className="status-color yellow"></div>
                  <div className="status-info">
                    <span className="status-name">Not Started</span>
                    <span className="status-desc">Assignment created but work not yet begun</span>
                  </div>
                </div>
                
                <div className="status-item">
                  <div className="status-color teal"></div>
                  <div className="status-info">
                    <span className="status-name">In Progress</span>
                    <span className="status-desc">Currently working on the assignment</span>
                  </div>
                </div>
                
                <div className="status-item">
                  <div className="status-color green"></div>
                  <div className="status-info">
                    <span className="status-name">Completed</span>
                    <span className="status-desc">Assignment finished and submitted</span>
                  </div>
                </div>
                
                <div className="status-item">
                  <div className="status-color red"></div>
                  <div className="status-info">
                    <span className="status-name">Graded</span>
                    <span className="status-desc">Assignment evaluated with final grade</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mini Four Walls Section */}
            <div className="mini-walls-section">
              <div className="mini-wall mini-wall-1"></div>
              <div className="mini-wall mini-wall-2"></div>
              <div className="mini-wall mini-wall-3"></div>
              <div className="mini-wall mini-wall-4"></div>
            </div>
            
            {/* Media Section - Replaces Footer */}
            <div className="media-section">
              <span className="media-text">MEDIA</span>
              <br />
              <a
                href="https://www.instagram.com/moodle.planner?igsh=cTg2N2lybWp1b2tl"
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-link"
              >
                <svg width="45" height="45" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
      </div>
    </div>
  )
}

export default Home
