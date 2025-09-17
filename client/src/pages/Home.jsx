import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserSyncContext } from '../contexts/UserSyncContext'
import homeImage from '../assets/home.jpg'
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
    <div
      className="home-container"
      style={{
        backgroundImage: `url(${homeImage})`
      }}>
      
    </div>
  )
}

export default Home
