import { useState, useMemo, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fade,
  Alert,
  Snackbar,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { IconButton } from "@mui/material";
import { getAuthErrorMessage } from "../utils/authErrors";
import { useTheme } from "../contexts/ThemeContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); // store user-friendly error
  const [open, setOpen] = useState(false); // dialog open state
  const [showMessage, setShowMessage] = useState(false); // for fade-in
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false); // forgot password dialog
  const [resetEmail, setResetEmail] = useState(""); // email for password reset
  const [resetSent, setResetSent] = useState(false); // reset email sent state
  const [snackbarOpen, setSnackbarOpen] = useState(false); // snackbar for success message
  const [snackbarMessage, setSnackbarMessage] = useState(""); // snackbar message

  // Get current color theme
  const { mode } = useTheme();

  const navigate = useNavigate();

  // Pick a random message **once per page load** using useMemo
  const randomMessage = useMemo(() => {
    const messages = [
      "Let’s crush your fitness goals today! 💪",
      "Track, train, transform—your progress awaits!",
      "Every workout counts. Log in and keep going!",
      "Consistency is key. Let’s get moving! 🏋️",
      "Your journey continues here. Let’s do this!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  // Trigger fade-in after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 200); // slight delay
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/dashboard");
    } catch (err) {
      const friendlyMessage = getAuthErrorMessage(err, "login");
      setError(friendlyMessage);
      setOpen(true); // open dialog on error
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setError("Please enter your email address.");
      setOpen(true);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
      setSnackbarMessage(
        `Password reset email sent to ${resetEmail}. Check your inbox!`,
      );
      setSnackbarOpen(true);

      // Close the dialog after 2 seconds
      setTimeout(() => {
        setForgotPasswordOpen(false);
        setResetSent(false);
        setResetEmail("");
      }, 2000);
    } catch (err) {
      const friendlyMessage = getAuthErrorMessage(err, "reset-password");
      setError(friendlyMessage);
      setOpen(true);
    }
  };

  const handleClose = () => setOpen(false);
  const handleForgotPasswordClose = () => {
    setForgotPasswordOpen(false);
    setResetSent(false);
    setResetEmail("");
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "center",
        pt: { xs: 6, sm: 2 },
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center" mb={3}>
          <img
            src="/favicon.svg"
            alt="WellTrackD Logo"
            style={{ height: 50 }}
          />

          <Typography
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" },
              color: "text.primary",
            }}
          >
            WellTrackD
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, p: { xs: 3, sm: 5 }, boxShadow: 10 }}>
          <CardContent>
            <Typography
              variant="h4"
              fontWeight="bold"
              gutterBottom
              color="primary"
              sx={{ fontSize: { xs: "1.8rem", sm: "2rem" } }}
            >
              Welcome Back!
            </Typography>

            {/* Motivational text with fade */}
            <Fade in={showMessage} timeout={800}>
              <Typography variant="body1" sx={{ mb: 3, color: "text.primary" }}>
                {randomMessage}
              </Typography>
            </Fade>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: { xs: 1.8, sm: 2.2 },
              }}
            >
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      color="primary"
                      sx={{ minWidth: "auto", p: 0.5 }}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon />
                      ) : (
                        <VisibilityOutlinedIcon />
                      )}
                    </IconButton>
                  ),
                }}
              />
              <Box sx={{ textAlign: "right" }}>
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  sx={{
                    textTransform: "none",
                    color: "error.main",
                  }}
                  onClick={() => setForgotPasswordOpen(true)}
                >
                  Forgot password?
                </Button>
              </Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{ borderRadius: 3 }}
                onClick={handleLogin}
              >
                Start Tracking
              </Button>
            </Box>

            <Typography
              variant="body2"
              sx={{
                mt: 3,
                textAlign: "center",
                color: "text.primary",
              }}
            >
              Don't have an account?{" "}
              <Link
                to="/signup"
                style={{ textDecoration: "none", color: "#4f46e5" }}
              >
                Signup
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>

      {/* Dialog Box for Error */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{error}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={handleForgotPasswordClose}>
        <DialogTitle>Reset Your Password</DialogTitle>
        <DialogContent>
          {!resetSent ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Enter your email address and we'll send you a link to reset your
                password. We'll only send the link if the email exists in our
                database.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                sx={{ mb: 1 }}
              />
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography color="success.main" sx={{ mb: 2 }}>
                ✓ Reset email sent successfully!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Check your inbox for the password reset link. The link will
                expire after a short time.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!resetSent ? (
            <>
              <Button
                onClick={handleForgotPasswordClose}
                variant="contained"
                sx={{
                  bgcolor: mode === "light" ? "#f9f6ee" : "#333333",
                  color: mode === "light" ? "#333333" : "#f9f6ee",
                  "&:hover": {
                    bgcolor: mode === "light" ? "#f6e4d2" : "#444444",
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleForgotPassword}
                variant="contained"
                disabled={!resetEmail}
              >
                Send Reset Link
              </Button>
            </>
          ) : (
            <Button onClick={handleForgotPasswordClose} variant="contained">
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
