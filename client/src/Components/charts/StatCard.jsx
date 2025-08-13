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
  backgroundColor = 'rgba(255, 255, 255, 0.9)'
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
        borderRadius: 2, 
        boxShadow: 3,
        background: backgroundColor,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography 
              variant="subtitle2" 
              color="textSecondary" 
              gutterBottom
              sx={{ fontSize: '0.875rem', fontWeight: 500 }}
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
                color="textSecondary" 
                sx={{ mt: 0.5, fontSize: '0.75rem' }}
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
