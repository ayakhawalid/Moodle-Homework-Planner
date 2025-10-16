import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = '#1976d2', 
  trend = null, 
  subtitle = null,
  backgroundColor = 'rgba(255, 255, 255, 0.6)'
}) => {
  const getTrendIcon = () => {
    if (trend === null) return null;
    return trend > 0 ? 
      <TrendingUp sx={{ fontSize: 16, color: '#4caf50' }} /> : 
      <TrendingDown sx={{ fontSize: 16, color: '#f44336' }} />;
  };

  const getTrendColor = () => {
    if (trend === null) return 'textSecondary';
    return trend > 0 ? '#4caf50' : '#f44336';
  };

  return (
    <Card 
      sx={{ 
        height: '100%', 
        borderRadius: '16px', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        background: backgroundColor,
        backdropFilter: 'blur(10px)',
        border: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography 
              variant="subtitle2" 
              sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'black' }}
              gutterBottom
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                color: color, 
                fontWeight: 'bold',
                fontSize: { xs: '1.5rem', sm: '2rem' },
                lineHeight: 1.2
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography 
                variant="body2" 
                sx={{ mt: 0.5, fontSize: '0.75rem', color: 'black' }}
              >
                {subtitle}
              </Typography>
            )}
            {trend !== null && (
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon()}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: getTrendColor(), 
                    ml: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: color, opacity: 0.7, ml: 1 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
