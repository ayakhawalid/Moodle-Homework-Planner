import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import '../styles/DashboardLayout.css';

function DashboardLayout({ children, userRole }) {
  return (
    <div className="dashboard-container">
      <DashboardSidebar userRole={userRole} />
      <div className="dashboard-content">
        <div className="content-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
