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

const SystemAnalytics = () => {
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
      colors: ['#1976d2'],
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
    series: [892, 45, 10],
    options: {
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Students', 'Lecturers', 'Admins'],
      colors: ['#4caf50', '#ff9800', '#f44336'],
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
      colors: ['#1976d2', '#4caf50'],
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

  return (
    <DashboardLayout userRole="admin">
      <Box p={3}>
        <Box mb={3}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
            System Analytics
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Comprehensive analytics and insights about your platform
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* User Growth Chart */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                User Growth Over Time
              </Typography>
              <Chart
                options={userGrowthData.options}
                series={userGrowthData.series}
                type="area"
                height={350}
              />
            </Paper>
          </Grid>

          {/* Role Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                User Role Distribution
              </Typography>
              <Chart
                options={roleDistributionData.options}
                series={roleDistributionData.series}
                type="donut"
                height={350}
              />
            </Paper>
          </Grid>

          {/* Weekly Activity */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Weekly Activity Overview
              </Typography>
              <Chart
                options={activityData.options}
                series={activityData.series}
                type="bar"
                height={350}
              />
            </Paper>
          </Grid>

          {/* Key Metrics */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                      98.5%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      System Uptime
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                      2.3s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Response Time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                      156
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Sessions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                      0
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Critical Issues
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
};

export default SystemAnalytics;
