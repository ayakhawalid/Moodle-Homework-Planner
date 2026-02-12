import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserSyncContext } from '../contexts/UserSyncContext'
import FallingLeaves from '../Components/FallingLeaves'
import '../styles/Home.css'

function Home() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, userRole } = useAuth()
  const { syncStatus } = useUserSyncContext()
  const [featureSlide, setFeatureSlide] = useState(0)

  const featureCards = [
    { title: 'Student-Centered Design', text: "You're in control! Add your own homework assignments, set your deadlines, and organize your academic life exactly how you want it. No complex integrations or system dependencies - just simple, effective homework management." },
    { title: 'Lecturer Workload Management', text: 'Lecturers can monitor their students\' academic workload through comprehensive overview tools. See what courses your students are taking, track their assignment loads, and identify when students might be experiencing heavy weeks to provide appropriate support.' },
    { title: 'Homework Peer System', text: 'Choose peers for specific homework assignments when you need collaboration. Simply select classmates who can work with you on particular assignments - it\'s that straightforward and simple.' },
    { title: 'Flexible Progress Tracking', text: 'Watch your academic journey unfold with our simple yet powerful tracking system. See how your hard work translates into completed assignments and improved performance over time.' },
    { title: 'Course Workload Overview', text: 'Lecturers get detailed insights into student course loads and assignment distribution. Make informed decisions about assignment timing and identify students who may need additional support during challenging academic periods.' },
    { title: 'Always Accessible', text: 'Access your homework planner anywhere, anytime. Whether you\'re in the library, at home, or on the go, your academic organizer is always in your pocket.' },
    { title: 'Not Started', text: 'Assignment created but work not yet begun.', type: 'status', color: 'coral' },
    { title: 'In Progress', text: 'Currently working on the assignment.', type: 'status', color: 'yellow' },
    { title: 'Completed', text: 'Assignment finished and submitted.', type: 'status', color: 'green' },
    { title: 'Graded', text: 'Assignment evaluated with final grade.', type: 'status', color: 'teal' }
  ]

  const nextFeature = () => setFeatureSlide(s => (s + 1) % featureCards.length)
  const prevFeature = () => setFeatureSlide(s => (s - 1 + featureCards.length) % featureCards.length)

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

            <div className="about-and-different-row">
              <div className="about-column">
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
                <h3 className="about-subtitle how-it-works-title">How It Works</h3>
                <p className="about-text">
                  Getting started is simple! Sign up, enroll in your courses, and begin creating your homework assignments. Set your own deadlines, track your progress through our four-stage system (Not Started, In Progress, Completed, Graded), and choose peers for specific assignments when you need collaboration.
                </p>
                <p className="about-text">
                  Our platform grows with your needs. Whether you're managing a heavy course load or looking for homework peers, you'll find the tools and community support to make your academic journey smoother and more enjoyable.
                </p>
                <p className="about-text">
                  For lecturers, our platform provides powerful tools to manage course content, track student progress, and facilitate collaborative learning. Create assignments, monitor completion rates, and engage with students through our intuitive interface designed specifically for academic environments.
                </p>
              </div>
              <div className="different-column">
                <div className="feature-slider">
                  <button type="button" className="feature-slider-btn feature-slider-prev" onClick={prevFeature} aria-label="Previous">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div className="feature-slider-track-wrap">
                    <div className="feature-slider-track" style={{ width: `${featureCards.length * 100}%`, transform: `translateX(-${featureSlide * (100 / featureCards.length)}%)` }}>
                      {featureCards.map((card, i) => (
                        <div key={i} className={`feature-card feature-slide ${card.type === 'status' ? `feature-card-status feature-card-${card.color}` : ''}`} style={{ flex: `0 0 ${100 / featureCards.length}%`, minWidth: `${100 / featureCards.length}%` }}>
                          {card.type === 'status' && <div className={`feature-card-status-circle feature-card-status-circle-${card.color}`} aria-hidden="true" />}
                          <div className="feature-card-content">
                            <h4>{card.title}</h4>
                            <p>{card.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="feature-slider-btn feature-slider-next" onClick={nextFeature} aria-label="Next">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                </div>
                <FallingLeaves />
              </div>
            </div>
            
      </div>
    </div>
  )
}

export default Home
