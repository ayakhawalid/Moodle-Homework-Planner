import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import Chart from 'react-apexcharts';
import DashboardLayout from '../../Components/DashboardLayout';
import { apiService } from '../../services/api';
import api from '../../services/api';

const SystemAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const [userGrowthData, setUserGrowthData] = useState({
    series: [{
      name: 'Users',
      data: [30, 40, 35, 50, 49, 60, 70, 91, 125, 150, 180, 200]
    }],
    options: {
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: false
        }
      },
      colors: ['#95E1D3'],
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
        }
      },
      xaxis: {
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      },
      yaxis: {
        title: {
          text: 'Number of Users'
        }
      }
    }
  });

  const [roleDistributionData, setRoleDistributionData] = useState({
    series: [0, 0, 0],
    options: {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Students', 'Lecturers', 'Admins'],
      colors: ['#D6F7AD', '#FCE38A', '#F38181'],
      legend: {
        position: 'bottom'
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: {
            width: 200
          },
          legend: {
            position: 'bottom'
          }
        }
      }]
    }
  });

  const [activityData, setActivityData] = useState({
    series: [{
      name: 'Logins',
      data: [44, 55, 57, 56, 61, 58, 63]
    }, {
      name: 'Assignments Submitted',
      data: [76, 85, 101, 98, 87, 105, 91]
    }],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      colors: ['#95E1D3', '#D6F7AD'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      },
      yaxis: {
        title: {
          text: 'Count'
        }
      },
      fill: {
        opacity: 1
      }
    }
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const s = await apiService.user.getStats();
        setStats(s);
        // Update role distribution from backend stats
        setRoleDistributionData((prev) => ({
          ...prev,
          series: [s?.roles?.students || 0, s?.roles?.lecturers || 0, s?.roles?.admins || 0]
        }));
        // Fetch analytics overview (growth + weekly activity)
        try {
          const overview = await api.get('/analytics/overview').then(r => r.data);
          if (overview?.userGrowth?.labels && overview?.userGrowth?.counts) {
            setUserGrowthData(prev => ({
              ...prev,
              options: { ...prev.options, xaxis: { ...prev.options.xaxis, categories: overview.userGrowth.labels } },
              series: [{ name: 'Users', data: overview.userGrowth.counts }]
            }));
          }
          if (overview?.weeklyActivity?.labels) {
            setActivityData(prev => ({
              ...prev,
              options: { ...prev.options, xaxis: { ...prev.options.xaxis, categories: overview.weeklyActivity.labels } },
              series: [
                { name: 'Logins', data: overview.weeklyActivity.logins || [] },
                { name: 'New Users', data: overview.weeklyActivity.newUsers || [] }
              ]
            }));
          }
        } catch (e) {
          console.warn('Analytics overview fetch failed', e?.message);
        }
      } catch (e) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout userRole="admin">
      <Box>
        <Typography variant="h3" component="h1" sx={{ 
          fontWeight: '600',
          fontSize: '2.5rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: '1.2',
          color: '#2c3e50',
          mb: 1
        }}>
          System Analytics
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ 
          mb: 4,
          fontWeight: '300',
          fontSize: '1.1rem',
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          color: '#7f8c8d',
          lineHeight: '1.6',
          letterSpacing: '0.3px'
        }}>
          Comprehensive analytics and insights about your platform
        </Typography>

        {error && (
          <Box mb={2}><Typography color="error">{error}</Typography></Box>
        )}

        <Grid container spacing={3}>
          {/* User Growth Chart */}
          <Grid item xs={12} lg={8}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  User Growth Over Time
                </Typography>
                <Chart
                  options={userGrowthData.options}
                  series={userGrowthData.series}
                  type="area"
                  height={350}
                />
              </div>
            </div>
          </Grid>

          {/* Role Distribution */}
          <Grid item xs={12} lg={4}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  User Role Distribution
                </Typography>
                <Chart
                  options={roleDistributionData.options}
                  series={roleDistributionData.series}
                  type="donut"
                  height={350}
                />
                <Box mt={2}>
                  <Typography variant="body2" color="textSecondary">Students: {stats?.roles?.students ?? '—'}</Typography>
                  <Typography variant="body2" color="textSecondary">Lecturers: {stats?.roles?.lecturers ?? '—'}</Typography>
                  <Typography variant="body2" color="textSecondary">Admins: {stats?.roles?.admins ?? '—'}</Typography>
                </Box>
              </div>
            </div>
          </Grid>

          {/* Weekly Activity */}
          <Grid item xs={12}>
            <div className="dashboard-card">
              <div className="card-content">
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Weekly Activity Overview
                </Typography>
                <Chart
                  options={activityData.options}
                  series={activityData.series}
                  type="bar"
                  height={350}
                />
              </div>
            </div>
          </Grid>

          {/* Key Metrics */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <div className="dashboard-card" style={{ textAlign: 'center' }}>
                  <div className="card-content">
                    <Typography variant="h4" sx={{ color: '#95E1D3', fontWeight: 'bold' }}>
                      {loading ? '…' : (stats?.total_users ?? 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Users
                    </Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <div className="dashboard-card" style={{ textAlign: 'center' }}>
                  <div className="card-content">
                    <Typography variant="h4" sx={{ color: '#D6F7AD', fontWeight: 'bold' }}>
                      {loading ? '…' : (stats?.verified_users ?? 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Verified Users
                    </Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <div className="dashboard-card" style={{ textAlign: 'center' }}>
                  <div className="card-content">
                    <Typography variant="h4" sx={{ color: '#FCE38A', fontWeight: 'bold' }}>
                      {loading ? '…' : (stats?.roles?.students ?? 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Students
                    </Typography>
                  </div>
                </div>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <div className="dashboard-card" style={{ textAlign: 'center' }}>
                  <div className="card-content">
                    <Typography variant="h4" sx={{ color: '#F38181', fontWeight: 'bold' }}>
                      {loading ? '…' : (stats?.roles?.lecturers ?? 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Lecturers
                    </Typography>
                  </div>
                </div>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default SystemAnalytics;
