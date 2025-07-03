import React from 'react'
import homeImage from '../assets/home.jpg'

function Home() {
  return (
    <div style={{
      backgroundImage: `url(${homeImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-preference',
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0
    }}>
    </div>
  )
}

export default Home
