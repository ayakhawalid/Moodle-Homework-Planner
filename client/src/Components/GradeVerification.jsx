import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
  Paper,
  Chip
} from '@mui/material';
import { PhotoCamera, CheckCircle, Error, Warning } from '@mui/icons-material';

const GradeVerification = ({ homeworkId, onVerificationComplete }) => {
  const [screenshot, setScreenshot] = useState(null);
  const [claimedGrade, setClaimedGrade] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScreenshotUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setScreenshot(file);
      setError(null);
      setVerificationResult(null);
    }
  };

  const handleVerifyGrade = async () => {
    if (!screenshot || !claimedGrade) {
      setError('Please upload a screenshot and enter your claimed grade');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.studentSubmission.verifyGrade(
        homeworkId,
        claimedGrade,
        screenshot
      );

      setVerificationResult(response.data);
      
      if (response.data.success && onVerificationComplete) {
        onVerificationComplete(response.data);
      }
    } catch (err) {
      console.error('Grade verification error:', err);
      setError(err.response?.data?.error || 'Failed to verify grade');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!verificationResult) return null;
    
    if (verificationResult.isMatch) {
      return <CheckCircle color="success" />;
    } else {
      return <Error color="error" />;
    }
  };

  const getStatusColor = () => {
    if (!verificationResult) return 'default';
    
    if (verificationResult.isMatch) {
      return 'success';
    } else {
      return 'error';
    }
  };

  return (
    <Card elevation={3} sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Grade Verification
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload a screenshot of your grade from Moodle to verify your claimed grade.
        </Typography>

        {/* Claimed Grade Input */}
        <TextField
          fullWidth
          label="Your Claimed Grade"
          type="number"
          value={claimedGrade}
          onChange={(e) => setClaimedGrade(e.target.value)}
          placeholder="Enter your grade (e.g., 85)"
          sx={{ mb: 2 }}
          inputProps={{ min: 0, max: 100 }}
        />

        {/* Screenshot Upload */}
        <Box sx={{ mb: 2 }}>
          <input
            accept="image/*"
            style={{ display: 'none' }}
            id="screenshot-upload"
            type="file"
            onChange={handleScreenshotUpload}
          />
          <label htmlFor="screenshot-upload">
            <Button
              variant="outlined"
              component="span"
              startIcon={<PhotoCamera />}
              fullWidth
            >
              {screenshot ? `Uploaded: ${screenshot.name}` : 'Upload Screenshot'}
            </Button>
          </label>
        </Box>

        {/* Verify Button */}
        <Button
          variant="contained"
          onClick={handleVerifyGrade}
          disabled={!screenshot || !claimedGrade || loading}
          fullWidth
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Verify Grade'}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {getStatusIcon()}
              <Typography variant="h6">
                Verification Result
              </Typography>
            </Box>

            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <Chip
                label={`Claimed: ${verificationResult.claimedGrade}`}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`Extracted: ${verificationResult.extractedGrade}`}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={`Confidence: ${Math.round(verificationResult.confidence * 100)}%`}
                color="info"
                variant="outlined"
              />
            </Box>

            <Alert severity={getStatusColor()} sx={{ mb: 2 }}>
              {verificationResult.message}
            </Alert>

            {verificationResult.extractedTotal && (
              <Typography variant="body2" color="text.secondary">
                Total Points: {verificationResult.extractedTotal} | 
                Percentage: {verificationResult.extractedPercentage}%
              </Typography>
            )}

            {verificationResult.rawText && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Extracted Text: {verificationResult.rawText.substring(0, 200)}...
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeVerification;
