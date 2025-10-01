import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserSyncContext } from '../contexts/UserSyncContext'
import homeImage from '../assets/pexels-cup-of-couple-6177605.jpg'
import '../styles/Home.css'

function Home() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, userRole } = useAuth()
  const { syncStatus } = useUserSyncContext()

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
      {/* Colored Circles Above Header */}
      <div className="colored-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
      </div>

      {/* Full Background Image */}
      <div className="home-background">
        <div 
          className="background-image"
          style={{
            backgroundImage: `url(${homeImage})`
          }}
        ></div>
        
        {/* Centered Content Overlay */}
        <div className="content-overlay">
          <div className="content-section">
            <div className="title-section">
              <img src="/favicon.svg" alt="Logo" className="home-logo" />
              <h1 className="main-title">Moodle Homework Planner</h1>
            </div>
            <p className="main-description">
              Manage homework, track progress, and collaborate effectively in your academic journey.
            </p>
            
            <div className="action-buttons">
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
        </div>
      </div>
    </div>
  )
}

export default Home
