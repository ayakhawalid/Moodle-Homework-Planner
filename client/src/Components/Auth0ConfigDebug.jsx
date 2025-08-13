import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Alert,
  Chip,
  Divider
} from '@mui/material';

const Auth0ConfigDebug = () => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Auth0 Configuration Debug
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Environment Variables
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Domain:</Typography>
            <Chip 
              label={domain || 'Not set'} 
              color={domain ? 'success' : 'error'} 
              variant="outlined" 
              sx={{ mb: 1 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Client ID:</Typography>
            <Chip 
              label={clientId || 'Not set'} 
              color={clientId ? 'success' : 'error'} 
              variant="outlined" 
              sx={{ mb: 1 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Redirect URI:</Typography>
            <Chip 
              label={redirectUri || 'Not set'} 
              color={redirectUri ? 'success' : 'error'} 
              variant="outlined" 
              sx={{ mb: 1 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Audience:</Typography>
            <Chip 
              label={audience || 'Not set (optional)'} 
              color="info" 
              variant="outlined" 
              sx={{ mb: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          <strong>If you're getting "Callback URL mismatch" error:</strong>
        </Typography>
        <Typography variant="body2">
          Make sure these URLs are configured in your Auth0 Dashboard → Applications → [Your App] → Settings:
        </Typography>
      </Alert>

      <Card sx={{ bgcolor: '#f8f9fa' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Required Auth0 Application Settings
          </Typography>
          
          <Typography variant="subtitle2" gutterBottom>
            Allowed Callback URLs:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, p: 1, bgcolor: '#e9ecef', borderRadius: 1 }}>
            {redirectUri || 'http://localhost:5174/callback'}
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Allowed Logout URLs:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, p: 1, bgcolor: '#e9ecef', borderRadius: 1 }}>
            {window.location.origin}
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            Allowed Web Origins:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2, p: 1, bgcolor: '#e9ecef', borderRadius: 1 }}>
            {window.location.origin}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="body2" color="textSecondary">
            Copy these URLs exactly as shown above and paste them into your Auth0 Dashboard application settings.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Auth0ConfigDebug;
