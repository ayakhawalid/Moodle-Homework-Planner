import React from 'react';
import Chart from 'react-apexcharts';
import { Typography, Box } from '@mui/material';

const ProgressChart = ({ title, data, type = 'line', height = 300, color = '#1976d2' }) => {
  // Format study time - show minutes if less than 1 hour, otherwise show hours
  const formatStudyTime = (hours) => {
    if (!hours || hours === 0) return '0 min';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)}h`;
  };

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
      },
      labels: {
        formatter: function(value) {
          return formatStudyTime(value);
        }
      }
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: function(value) {
          return formatStudyTime(value);
        }
      }
    }
  };

  const series = [{
    name: data.seriesName || 'Data',
    data: data.values || []
  }];

  return (
    <div>
      <Box>
        <Chart
          options={chartOptions}
          series={series}
          type={type}
          height={height}
        />
      </Box>
    </div>
  );
};

export default ProgressChart;
