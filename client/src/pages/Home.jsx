import React from 'react'
import homeImage from '../assets/home.jpg'
import '../styles/Home.css'

function Home() {
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
