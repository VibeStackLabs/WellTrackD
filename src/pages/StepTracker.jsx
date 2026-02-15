import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Button,
  Grid,
  Paper,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  DirectionsWalk,
  Sync,
  Google,
  EmojiEvents,
  Timeline,
  Logout,
  MoreVert,
  CheckCircle,
  Error as ErrorIcon,
  AccountCircle,
} from "@mui/icons-material";
import { format, subDays, eachDayOfInterval } from "date-fns";
import StepChart from "../components/StepTracker/StepChart";
import GoogleFitAuth from "../components/StepTracker/GoogleFitAuth";
import googleFitService from "../services/googleFitService";
import CountUp from "react-countup";

export default function StepTracker({ userId }) {
  const [stepData, setStepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [googleFitDialogOpen, setGoogleFitDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("week");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [anchorEl, setAnchorEl] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalSteps: 0,
    averageSteps: 0,
    bestDay: null,
    goalAchieved: 0,
    totalDistance: 0,
    totalCalories: 0,
  });

  // Check for existing token on mount and get user profile
  useEffect(() => {
    const hasToken = googleFitService.loadTokenFromStorage();
    if (hasToken) {
      setGoogleFitConnected(true);
      loadUserProfile();
      loadStepData();
    } else {
      setLoading(false);
    }

    // Load last sync time from localStorage
    const savedLastSync = localStorage.getItem("googleFitLastSync");
    if (savedLastSync) {
      setLastSyncTime(new Date(savedLastSync));
    }

    // Load user profile from localStorage
    const savedProfile = localStorage.getItem("googleFitUserProfile");
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      // Fetch user info from Google's people API or from token
      const profile = await googleFitService.getUserProfile();
      setUserProfile(profile);
      localStorage.setItem("googleFitUserProfile", JSON.stringify(profile));
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadStepData = async () => {
    setLoading(true);
    setSyncError(null);

    try {
      if (!googleFitService.isTokenValid()) {
        setGoogleFitConnected(false);
        setStepData([]);
        return;
      }

      // Calculate date range based on timeRange
      const endDate = new Date();
      const startDate = subDays(
        endDate,
        timeRange === "week" ? 6 : timeRange === "month" ? 29 : 89,
      );

      console.log("Fetching step data from", startDate, "to", endDate);

      // Fetch real data from Google Fit
      const steps = await googleFitService.getStepData(startDate, endDate);
      console.log("Steps data received:", steps);

      // Create a complete date range with all days
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      // Create a map of existing step data by date
      const stepsByDate = {};
      steps.forEach((step) => {
        stepsByDate[step.date] = step;
      });

      // Fill in missing dates with zero steps
      const mergedData = dateRange.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        if (stepsByDate[dateStr]) {
          return stepsByDate[dateStr];
        } else {
          return {
            date: dateStr,
            steps: 0,
            distance: "0.00",
            calories: 0,
            goal: 10000,
            source: "google-fit",
          };
        }
      });

      setStepData(mergedData);
      calculateStats(mergedData);

      // Cache in localStorage as backup
      localStorage.setItem(`steps_${userId}`, JSON.stringify(mergedData));

      // Update last sync time
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem("googleFitLastSync", now.toISOString());

      setSnackbarMessage(
        `Synced ${mergedData.filter((d) => d.steps > 0).length} days of step data`,
      );
      setSnackbarSeverity("success");
    } catch (error) {
      console.error("Error loading step data:", error);
      setSyncError(error.message);

      // Try to load from cache as fallback
      const cached = localStorage.getItem(`steps_${userId}`);
      if (cached) {
        setStepData(JSON.parse(cached));
        setSnackbarMessage("Loaded cached data (offline mode)");
        setSnackbarSeverity("warning");
      } else {
        setSnackbarMessage("Failed to load data from Google Fit");
        setSnackbarSeverity("error");
      }
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  const handleDisconnectGoogleFit = () => {
    // Clear all Google Fit related data
    googleFitService.clearToken();
    localStorage.removeItem("googleFitToken");
    localStorage.removeItem("googleFitTokenExpiry");
    localStorage.removeItem("googleFitLastSync");
    localStorage.removeItem("googleFitUserProfile");

    // Clear step data from state and localStorage
    setStepData([]);
    localStorage.removeItem(`steps_${userId}`);

    // Update state
    setGoogleFitConnected(false);
    setLastSyncTime(null);
    setUserProfile(null);
    setDisconnectDialogOpen(false);

    // Show success message
    setSnackbarMessage("Disconnected from Google Fit successfully");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

  const calculateStats = (data, range = timeRange) => {
    const filteredData = getFilteredData(data, range);

    const totalSteps = filteredData.reduce((sum, day) => sum + day.steps, 0);
    const averageSteps =
      filteredData.length > 0
        ? Math.round(totalSteps / filteredData.length)
        : 0;
    const bestDay = filteredData.reduce(
      (best, day) => (day.steps > (best?.steps || 0) ? day : best),
      null,
    );
    const goalAchieved = filteredData.filter(
      (day) => day.steps >= (day.goal || 10000),
    ).length;
    const totalDistance = filteredData.reduce(
      (sum, day) => sum + parseFloat(day.distance || 0),
      0,
    );
    const totalCalories = filteredData.reduce(
      (sum, day) => sum + (day.calories || 0),
      0,
    );

    setStats({
      totalSteps,
      averageSteps,
      bestDay,
      goalAchieved,
      totalDistance: totalDistance.toFixed(2),
      totalCalories,
    });
  };

  const getFilteredData = (data, range) => {
    const today = new Date();
    let days = 7;

    switch (range) {
      case "week":
        days = 7;
        break;
      case "month":
        days = 30;
        break;
      case "3months":
        days = 90;
        break;
      default:
        days = 7;
    }

    const cutoff = subDays(today, days - 1);
    return data.filter((day) => new Date(day.date) >= cutoff);
  };

  const handleSyncGoogleFit = async () => {
    setSyncLoading(true);
    await loadStepData();
    setSyncLoading(false);
  };

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange) {
      setTimeRange(newRange);
      calculateStats(stepData, newRange);
    }
  };

  const handleGoogleFitSuccess = (profile) => {
    setGoogleFitConnected(true);
    if (profile) {
      setUserProfile(profile);
      localStorage.setItem("googleFitUserProfile", JSON.stringify(profile));
    }
    loadStepData();
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const todaySteps =
    stepData.find((day) => {
      const today = format(new Date(), "yyyy-MM-dd");
      return day.date === today;
    })?.steps || 0;

  const todayGoal = 10000; // Default goal
  const progressPercent = Math.min((todaySteps / todayGoal) * 100, 100);

  // Get user's email/name from profile
  const getUserDisplay = () => {
    if (userProfile?.email) {
      return userProfile.email;
    }
    if (userProfile?.name) {
      return userProfile.name;
    }
    return "Google Account";
  };

  // Get user's avatar/initials
  const getUserAvatar = () => {
    if (userProfile?.picture) {
      return (
        <Avatar
          src={userProfile.picture}
          sx={{ width: 24, height: 24 }}
          imgProps={{ referrerPolicy: "no-referrer" }}
        />
      );
    }
    // Fallback to initials if no picture
    const initial =
      userProfile?.name?.charAt(0).toUpperCase() ||
      userProfile?.email?.charAt(0).toUpperCase() ||
      "G";
    return (
      <Avatar sx={{ width: 24, height: 24, bgcolor: "#4285F4" }}>
        {initial}
      </Avatar>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!googleFitConnected) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Google sx={{ fontSize: 64, color: "#4285F4", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Connect to Google Fit
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Connect your Google account to sync your real step data from Google
            Fit. We'll access your activity history and keep it updated.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Google />}
            onClick={() => setGoogleFitDialogOpen(true)}
          >
            Connect Google Fit
          </Button>
        </Card>

        <GoogleFitAuth
          open={googleFitDialogOpen}
          onClose={() => setGoogleFitDialogOpen(false)}
          onSuccess={handleGoogleFitSuccess}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with account info and menu */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <DirectionsWalk sx={{ fontSize: 40, color: "primary.main" }} />
          <Box>
            <Typography variant="h5">Step Tracker</Typography>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <CheckCircle color="success" sx={{ fontSize: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  Connected as
                </Typography>
                <Chip
                  size="small"
                  avatar={getUserAvatar()}
                  label={getUserDisplay()}
                  variant="outlined"
                  sx={{ ml: 0.5 }}
                />
              </Box>
              {lastSyncTime && (
                <Typography variant="caption" color="text.secondary">
                  Last sync: {format(lastSyncTime, "hh:mm a")}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          <Button
            variant="outlined"
            startIcon={syncLoading ? <CircularProgress size={20} /> : <Sync />}
            onClick={handleSyncGoogleFit}
            disabled={syncLoading}
          >
            {syncLoading ? "Syncing..." : "Sync Now"}
          </Button>

          <IconButton onClick={handleMenuOpen} size="small">
            <MoreVert />
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem>
              <ListItemIcon>
                {userProfile?.picture ? (
                  <Avatar
                    src={userProfile.picture}
                    sx={{ width: 24, height: 24 }}
                    imgProps={{ referrerPolicy: "no-referrer" }}
                  />
                ) : (
                  <AccountCircle fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={getUserDisplay()}
                secondary="Connected account"
              />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                handleMenuClose();
                setDisconnectDialogOpen(true);
              }}
            >
              <ListItemIcon>
                <Logout fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText primary="Disconnect Google Fit" />
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Sync Error Alert */}
      {syncError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setSyncError(null)}
        >
          Sync Error: {syncError}. Using cached data.
        </Alert>
      )}

      {/* Today's Progress Card */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <Box textAlign="center">
                <Typography variant="h3" color="primary">
                  <CountUp end={todaySteps} duration={1} separator="," />
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Steps Today
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box textAlign="center">
                <Box sx={{ position: "relative", display: "inline-flex" }}>
                  <CircularProgress
                    variant="determinate"
                    value={progressPercent}
                    size={80}
                    thickness={4}
                    sx={{
                      color:
                        progressPercent >= 100
                          ? "success.main"
                          : "primary.main",
                    }}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >
                      {Math.round(progressPercent)}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  of {todayGoal.toLocaleString()} goal
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box display="flex" justifyContent="space-around">
                <Box textAlign="center">
                  <Typography variant="h6" color="success.main">
                    {(todaySteps * 0.000762).toFixed(2)} km
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distance
                  </Typography>
                </Box>
                <Box textAlign="center">
                  <Typography variant="h6" color="warning.main">
                    {Math.round(todaySteps * 0.04)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Calories
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Total Steps ({timeRange})
            </Typography>
            <Typography variant="h6">
              <CountUp end={stats.totalSteps} duration={1} separator="," />
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Daily Average
            </Typography>
            <Typography variant="h6">
              <CountUp end={stats.averageSteps} duration={1} separator="," />
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Goal Achieved
            </Typography>
            <Typography variant="h6">
              {stats.goalAchieved}/{getFilteredData(stepData, timeRange).length}{" "}
              days
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Total Distance
            </Typography>
            <Typography variant="h6">
              <CountUp
                end={parseFloat(stats.totalDistance)}
                duration={1}
                decimals={1}
              />{" "}
              km
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Chart Section */}
      <Card variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
          >
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="3months">3 Months</ToggleButton>
          </ToggleButtonGroup>

          <Box display="flex" gap={1} alignItems="center">
            <Chip
              icon={<Google />}
              label="Live Google Fit Data"
              color="primary"
              variant="outlined"
              size="small"
            />
            {stepData.filter((d) => d.steps > 0).length === 0 && (
              <Chip
                icon={<ErrorIcon />}
                label="No step data found"
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>

        <StepChart
          data={getFilteredData(stepData, timeRange)}
          days={timeRange === "week" ? 7 : timeRange === "month" ? 30 : 90}
        />

        {stepData.filter((d) => d.steps > 0).length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No step data found for this period. Make sure you have activity data
            in your Google Fit account.
          </Alert>
        )}
      </Card>

      {/* Recent Entries */}
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          {getFilteredData(stepData, timeRange)
            .slice(0, 10)
            .map((entry, index) => (
              <React.Fragment key={entry.date}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor:
                          entry.steps >= entry.goal
                            ? "success.main"
                            : entry.steps > 0
                              ? "primary.main"
                              : "grey.400",
                      }}
                    >
                      {entry.steps >= entry.goal ? (
                        <EmojiEvents />
                      ) : entry.steps > 0 ? (
                        <DirectionsWalk />
                      ) : (
                        <Timeline />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1">
                          {format(new Date(entry.date), "dd MMM yyyy")}
                        </Typography>
                        {entry.steps === 0 && (
                          <Chip
                            label="No data"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      entry.steps > 0 ? (
                        <>
                          <Box
                            component="span"
                            sx={{ display: "inline-flex", gap: 2, mt: 0.5 }}
                          >
                            <Typography component="span" variant="body2">
                              Steps: {entry.steps.toLocaleString()}
                            </Typography>
                            <Typography
                              component="span"
                              variant="body2"
                              color="success.main"
                            >
                              {entry.distance} km
                            </Typography>
                            <Typography
                              component="span"
                              variant="body2"
                              color="warning.main"
                            >
                              {entry.calories} cal
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No step data recorded
                        </Typography>
                      )
                    }
                    secondaryTypographyProps={{
                      component: "div",
                    }}
                  />
                  <Chip
                    label="Google Fit"
                    size="small"
                    icon={<Google />}
                    color="primary"
                    variant="outlined"
                  />
                </ListItem>
              </React.Fragment>
            ))}
        </List>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        aria-labelledby="disconnect-dialog-title"
        aria-describedby="disconnect-dialog-description"
      >
        <DialogTitle id="disconnect-dialog-title">
          <Box display="flex" alignItems="center" gap={1}>
            <Logout color="error" />
            <Typography variant="h6">Disconnect Google Fit?</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="disconnect-dialog-description">
            Are you sure you want to disconnect{" "}
            <strong>{getUserDisplay()}</strong> from Google Fit? This will:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2">
              Remove all synced step data from this app
            </Typography>
            <Typography component="li" variant="body2">
              Stop automatic sync with Google Fit
            </Typography>
            <Typography component="li" variant="body2">
              You can reconnect anytime to restore your data
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDisconnectDialogOpen(false)}
            color="primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisconnectGoogleFit}
            color="error"
            variant="contained"
            startIcon={<Logout />}
          >
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Google Fit Auth Dialog */}
      <GoogleFitAuth
        open={googleFitDialogOpen}
        onClose={() => setGoogleFitDialogOpen(false)}
        onSuccess={handleGoogleFitSuccess}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity={snackbarSeverity}
          onClose={() => setSnackbarOpen(false)}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
