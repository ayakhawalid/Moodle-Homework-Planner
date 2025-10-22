import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import BackgroundToggle from './BackgroundToggle';
import { BackgroundToggleProvider } from '../contexts/BackgroundToggleContext';
import '../styles/DashboardLayout.css';

function DashboardLayout({ children, userRole }) {
  return (
    <BackgroundToggleProvider>
      <div className="dashboard-container">
        <DashboardSidebar userRole={userRole} />
        <div className="dashboard-content">
          <div className="content-wrapper">
            {children}
          </div>
        </div>
        <BackgroundToggle />
      </div>
    </BackgroundToggleProvider>
  );
}

export default DashboardLayout;
