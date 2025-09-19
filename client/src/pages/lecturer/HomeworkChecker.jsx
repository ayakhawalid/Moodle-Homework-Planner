import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import { Grade as GradingIcon, Assignment as AssignmentIcon, Comment as CommentIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import '../../styles/DashboardLayout.css';

function HomeworkChecker() {
  const location = useLocation();
  const [homeworkData, setHomeworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [courseFilter, setCourseFilter] = useState('');
  
  // Get pre-selected course from navigation state
  const selectedCourseId = location.state?.selectedCourseId;

  // Set the course filter when a course is pre-selected
  useEffect(() => {
    if (selectedCourseId && !courseFilter) {
      setCourseFilter(selectedCourseId);
    }
  }, [selectedCourseId, courseFilter]);

  useEffect(() => {
    const fetchHomeworkData = async () => {
      try {
        setLoading(true);
        const response = await apiService.lecturerDashboard.getHomeworkChecker(statusFilter, courseFilter || null);
        setHomeworkData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching homework data:', err);
        setError('Failed to load homework data');
      } finally {
        setLoading(false);
      }
    };

    fetchHomeworkData();
  }, [statusFilter, courseFilter]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handleCourseChange = (courseId) => {
    setCourseFilter(courseId);
  };

  if (loading) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Loading Homework Checker...</h1>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userRole="lecturer">
        <div className="welcome-section">
          <h1 className="welcome-title">Error Loading Homework</h1>
          <p className="welcome-subtitle">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  // Get the selected course name for display
  const selectedCourse = homeworkData?.courses?.find(course => course._id === courseFilter);
  const courseName = location.state?.courseName || selectedCourse?.name;

  return (
    <DashboardLayout userRole="lecturer">
      <div className="welcome-section">
        <h1 className="welcome-title">Homework Checker ✅</h1>
        <p className="welcome-subtitle">
          Review, grade, and provide feedback on student homework submissions
          {courseName && (
            <span style={{ display: 'block', marginTop: '8px', fontSize: '16px', fontWeight: 'bold', color: '#1976d2' }}>
              📚 Currently viewing: {courseName}
            </span>
          )}
        </p>
      </div>

            <div className="dashboard-grid">
        {/* Filters */}
        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Filters</h3>
              <p className="card-subtitle">Filter homework by status and course</p>
            </div>
          </div>
          <div className="card-content">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px',
              alignItems: 'end'
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status:</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    width: '100%',
                    minWidth: '120px'
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Course:</label>
                <select 
                  value={courseFilter} 
                  onChange={(e) => handleCourseChange(e.target.value)}
                  style={{ 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    width: '100%',
                    minWidth: '200px',
                    maxWidth: '350px'
                  }}
                >
                  <option value="">All Courses</option>
                  {homeworkData?.courses?.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.code ? `${course.code} - ${course.name}` : course.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Pending Submissions</h3>
              <p className="card-subtitle">Assignments to review</p>
            </div>
          </div>
          <div className="card-content">
            <p>View and grade recently submitted assignments from your students.</p>
            {homeworkData?.homework && homeworkData.homework.length > 0 ? (
              <div style={{marginTop: '15px'}}>
                {homeworkData.homework.map((hw) => (
                  <div 
                    key={hw._id} 
                    style={{
                      marginBottom: '10px', 
                      padding: '10px', 
                      background: hw.is_overdue ? '#f8d7da' : '#fff3cd', 
                      borderRadius: '8px',
                      border: hw.is_overdue ? '1px solid #f5c6cb' : '1px solid #ffeaa7'
                    }}
                  >
                    <strong>{hw.title}</strong><br />
                    <small style={{color: hw.is_overdue ? '#721c24' : '#856404'}}>
                      {hw.statistics.submitted} submissions - Due: {new Date(hw.due_date).toLocaleDateString()}
                      {hw.is_overdue && ' (OVERDUE)'}
                    </small>
                    <div style={{marginTop: '5px', fontSize: '12px'}}>
                      Course: {hw.course.name} ({hw.course.code}) | 
                      Status: {hw.status.replace('_', ' ')} | 
                      Graded: {hw.statistics.graded}/{hw.statistics.submitted}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{marginTop: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <p style={{margin: 0, color: '#666'}}>No homework found with the current filters.</p>
              </div>
            )}
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{homeworkData?.grading_progress?.pending || 0}</span>
              <span className="stat-label">To Grade</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{homeworkData?.homework?.filter(hw => hw.is_overdue).length || 0}</span>
              <span className="stat-label">Overdue</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <GradingIcon />
            </div>
            <div>
              <h3 className="card-title">Grading Progress</h3>
              <p className="card-subtitle">Track your grading</p>
            </div>
          </div>
          <div className="card-content">
            <p>Monitor your grading progress and maintain consistent feedback quality.</p>
            <div className="progress-container">
              <div className="progress-label">
                <span>Grading Progress</span>
                <span>{homeworkData?.grading_progress?.completion_rate || 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${homeworkData?.grading_progress?.completion_rate || 0}%`}}></div>
              </div>
            </div>
            <div className="progress-container">
              <div className="progress-label">
                <span>Total Assignments</span>
                <span>{homeworkData?.grading_progress?.total || 0}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: `${homeworkData?.grading_progress?.completion_rate || 0}%`}}></div>
              </div>
            </div>
          </div>
          <div className="card-stats">
            <div className="stat-item">
              <span className="stat-value">{homeworkData?.grading_progress?.fully_graded || 0}</span>
              <span className="stat-label">Graded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{homeworkData?.grading_progress?.pending || 0}</span>
              <span className="stat-label">Remaining</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <CommentIcon />
            </div>
            <div>
              <h3 className="card-title">Feedback Tools</h3>
              <p className="card-subtitle">Provide quality feedback</p>
            </div>
          </div>
          <div className="card-content">
            <p>Use advanced tools to provide comprehensive feedback to your students.</p>
            <h4 style={{marginTop: '15px', marginBottom: '10px'}}>Available Tools:</h4>
            <ul style={{paddingLeft: '20px', lineHeight: '1.6'}}>
              <li>Rubric-based grading</li>
              <li>Audio feedback recording</li>
              <li>Inline comments and annotations</li>
              <li>Grade distribution analysis</li>
              <li>Plagiarism detection</li>
            </ul>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon primary">
              <AssessmentIcon />
            </div>
            <div>
              <h3 className="card-title">Grade Analytics</h3>
              <p className="card-subtitle">Performance insights</p>
            </div>
          </div>
          <div className="card-content">
            <p>Analyze grade distributions and student performance trends.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#d4edda', borderRadius: '8px'}}>
                <strong>Grading Progress</strong><br />
                <small style={{color: '#155724'}}>{homeworkData?.grading_progress?.completion_rate || 0}% Complete</small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Fully Graded</strong><br />
                <small style={{color: '#666'}}>{homeworkData?.grading_progress?.fully_graded || 0} assignments</small>
              </div>
              <div style={{padding: '10px', background: '#fff3cd', borderRadius: '8px'}}>
                <strong>Pending Grading</strong><br />
                <small style={{color: '#856404'}}>{homeworkData?.grading_progress?.pending || 0} assignments</small>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon secondary">
              <AssignmentIcon />
            </div>
            <div>
              <h3 className="card-title">Recent Activity</h3>
              <p className="card-subtitle">Latest submissions</p>
            </div>
          </div>
          <div className="card-content">
            <p>Stay updated with the most recent homework submissions.</p>
            <div style={{marginTop: '15px'}}>
              {homeworkData?.homework && homeworkData.homework.length > 0 ? (
                homeworkData.homework.slice(0, 5).map((hw, index) => (
                  <div key={hw._id} style={{marginBottom: '8px', fontSize: '14px', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>
                    <strong>{hw.title}</strong><br />
                    <small>
                      {hw.statistics.submitted} submissions - {hw.course.name} ({hw.course.code})<br />
                      Due: {new Date(hw.due_date).toLocaleDateString()}
                      {hw.is_overdue && ' (OVERDUE)'}
                    </small>
                  </div>
                ))
              ) : (
                <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666'}}>
                  No recent homework submissions
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div className="card-icon accent">
              <AssessmentIcon />
            </div>
            <div>
              <h3 className="card-title">Quick Actions</h3>
              <p className="card-subtitle">Common tasks</p>
            </div>
          </div>
          <div className="card-content">
            <p>Quick access to grading tools and statistics.</p>
            <div style={{marginTop: '15px'}}>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Grading Summary</strong><br />
                <small style={{color: '#666'}}>
                  Total: {homeworkData?.grading_progress?.total || 0} | 
                  Graded: {homeworkData?.grading_progress?.fully_graded || 0} | 
                  Pending: {homeworkData?.grading_progress?.pending || 0}
                </small>
              </div>
              <div style={{marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Overdue Assignments</strong><br />
                <small style={{color: '#666'}}>
                  {homeworkData?.homework?.filter(hw => hw.is_overdue).length || 0} assignments need immediate attention
                </small>
              </div>
              <div style={{padding: '10px', background: '#f8f9fa', borderRadius: '8px'}}>
                <strong>Completion Rate</strong><br />
                <small style={{color: '#666'}}>
                  {homeworkData?.grading_progress?.completion_rate || 0}% of assignments fully graded
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default HomeworkChecker;
