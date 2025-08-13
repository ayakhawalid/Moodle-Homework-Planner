import React from 'react';
import Chart from 'react-apexcharts';
import { Card, CardContent, Typography, Box } from '@mui/material';

const ProgressChart = ({ title, data, type = 'line', height = 300, color = '#1976d2' }) => {
  const chartOptions = {
    chart: {
      type: type,
      height: height,
      toolbar: {
        show: false
      },
      sparkline: {
        enabled: false
      }
    },
    colors: [color],
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
      categories: data.categories || []
    },
    yaxis: {
      title: {
        text: data.yAxisTitle || ''
      }
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'light'
    }
  };

  const series = [{
    name: data.seriesName || 'Data',
    data: data.values || []
  }];

  return (
    <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
          {title}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Chart
            options={chartOptions}
            series={series}
            type={type}
            height={height}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProgressChart;
