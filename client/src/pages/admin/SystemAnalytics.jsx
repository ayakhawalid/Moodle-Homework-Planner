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

const SystemAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const [userGrowthData, setUserGrowthData] = useState({
    series: [{
      name: 'Users',
      data: [] // Will be populated from backend
    }],
    options: {
      chart: {
        type: 'area',
        height: 350,
        width: '100%',
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800
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
        categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          style: {
            colors: '#666',
            fontSize: '12px',
            fontFamily: 'Arial, sans-serif'
          },
          rotate: -45,
          rotateAlways: false
        }
      },
      yaxis: {
        title: {
          text: 'Number of Users'
        },
        labels: {
          style: {
            colors: '#666',
            fontSize: '12px'
          }
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: 300
          },
          xaxis: {
            labels: {
              rotate: -90,
              style: {
                fontSize: '10px'
              }
            }
          }
        }
      }]
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
      name: 'New Users',
      data: [0, 0, 0, 0, 0, 0, 0]
    }],
    options: {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: false
        }
      },
      colors: ['#95E1D3'],
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
          console.log('Fetching analytics overview...');
          const overview = await apiService.analytics.getOverview();
          console.log('Analytics overview received:', overview);
          
          if (overview?.userGrowth?.labels && overview?.userGrowth?.counts) {
            // Use cumulative counts from backend if available, otherwise calculate from monthly counts
            const displayCounts = overview.userGrowth.cumulativeCounts || 
              (() => {
                let runningTotal = 0;
                return overview.userGrowth.counts.map(count => {
                  runningTotal += count;
                  return runningTotal;
                });
              })();
            
            console.log('Backend labels:', overview.userGrowth.labels);
            console.log('Backend counts (new users per month):', overview.userGrowth.counts);
            console.log('Cumulative counts (total users):', displayCounts);
            
            // Ensure we have valid data arrays
            if (displayCounts && displayCounts.length > 0 && overview.userGrowth.labels.length > 0) {
              setUserGrowthData(prev => ({
                ...prev,
                options: { 
                  ...prev.options, 
                  xaxis: { 
                    categories: overview.userGrowth.labels, // Use backend labels directly
                    labels: {
                      style: {
                        colors: '#666',
                        fontSize: '12px',
                        fontFamily: 'Arial, sans-serif'
                      },
                      rotate: -45,
                      rotateAlways: false
                    }
                  }
                },
                series: [{ name: 'Total Users', data: displayCounts }]
              }));
            } else {
              console.warn('Invalid user growth data received:', { labels: overview.userGrowth.labels, counts: displayCounts });
            }
          } else {
            console.warn('User growth data missing in overview:', overview);
          }
          
          if (overview?.weeklyActivity?.labels) {
            setActivityData(prev => ({
              ...prev,
              options: { 
                ...prev.options, 
                xaxis: { 
                  ...prev.options.xaxis, 
                  categories: overview.weeklyActivity.labels 
                } 
              },
              series: [
                { name: 'New Users', data: overview.weeklyActivity.newUsers || [] }
              ]
            }));
          }
        } catch (e) {
          console.error('Analytics overview fetch failed:', e);
          console.error('Error details:', {
            message: e?.message,
            response: e?.response?.data,
            status: e?.response?.status
          });
          setError(`Failed to load analytics: ${e?.message || 'Unknown error'}`);
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
      <div className="white-page-background">
        <Box>

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
                <Box sx={{ width: '100%', overflow: 'hidden' }}>
                  <Chart
                    options={userGrowthData.options}
                    series={userGrowthData.series}
                    type="area"
                    height={350}
                    width="100%"
                  />
                </Box>
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
                  New User Registrations (Last 7 Days)
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
      </div>
    </DashboardLayout>
  );
};

export default SystemAnalytics;
