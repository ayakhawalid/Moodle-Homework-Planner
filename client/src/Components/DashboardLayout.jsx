import React from 'react';
import { useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import BackgroundToggle from './BackgroundToggle';
import { BackgroundToggleProvider } from '../contexts/BackgroundToggleContext';
import '../styles/DashboardLayout.css';

function DashboardLayout({ children, userRole }) {
  const location = useLocation();
  const isFullWidthPage = location.pathname === '/lecturer/workload-overview';

  return (
    <BackgroundToggleProvider>
      <div className="dashboard-container">
        <DashboardSidebar userRole={userRole} />
        <div className="dashboard-content">
          <div className={`content-wrapper${isFullWidthPage ? ' content-wrapper--full-width' : ''}`}>
            {children}
          </div>
        </div>
        <BackgroundToggle />
      </div>
    </BackgroundToggleProvider>
  );
}

export default DashboardLayout;
