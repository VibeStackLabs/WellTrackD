import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from "@mui/material";
import { FitnessCenter, Google } from "@mui/icons-material";
import { useGoogleLogin } from "@react-oauth/google";
import googleFitService from "../../services/googleFitService";

const steps = ["Connect Google Account", "Grant Permissions", "Sync Data"];

export default function GoogleFitAuth({ open, onClose, onSuccess }) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useGoogleLogin({
    scope: [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.activity.write",
      "https://www.googleapis.com/auth/fitness.location.read",
      "https://www.googleapis.com/auth/fitness.body.read",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    onSuccess: async (tokenResponse) => {
      setActiveStep(1);
      setLoading(true);

      try {
        // Store the access token
        googleFitService.setAccessToken(
          tokenResponse.access_token,
          tokenResponse.expires_in,
        );

        setActiveStep(2);

        // Fetch user profile from Google
        let userProfile = null;
        try {
          const profileResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            },
          );

          if (profileResponse.ok) {
            userProfile = await profileResponse.json();
          }
        } catch (profileError) {
          console.warn("Could not fetch user profile:", profileError);
        }

        // Fetch initial data to verify connection
        await googleFitService.getTodaySteps();

        // Call onSuccess with profile if available
        onSuccess(
          userProfile
            ? {
                connected: true,
                lastSync: new Date().toISOString(),
                scopes: tokenResponse.scope?.split(" ") || [],
                profile: {
                  email: userProfile.email,
                  name: userProfile.name,
                  picture: userProfile.picture,
                },
              }
            : {
                connected: true,
                lastSync: new Date().toISOString(),
                scopes: tokenResponse.scope?.split(" ") || [],
              },
        );

        onClose();
      } catch (err) {
        setError("Failed to sync data from Google Fit");
        console.error("Google Fit sync error:", err);
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      setError("Failed to connect to Google. Please try again.");
      setLoading(false);
      console.error("Google Login Error:", error);
    },
  });

  const handleConnect = () => {
    setLoading(true);
    setError(null);
    login();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FitnessCenter color="primary" />
          <Typography variant="h6">Connect Google Fit</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
          >
            <Google sx={{ fontSize: 48, color: "#4285F4" }} />
            <Typography variant="body1" textAlign="center">
              Connect your Google account to sync your real step data from
              Google Fit. We'll access your activity data for the last 30 days.
            </Typography>

            <Box sx={{ width: "100%", mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                What we'll access:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Daily step count (read/write)</li>
                <li>Distance traveled</li>
                <li>Calories burned</li>
                <li>Heart points</li>
                <li>Basic profile information</li>
                <li>Activity sessions</li>
              </ul>
            </Box>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Google />}
        >
          {loading ? "Connecting..." : "Connect Google Fit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
