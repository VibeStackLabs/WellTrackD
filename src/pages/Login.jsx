import { useState, useMemo, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
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
} from "@mui/material";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // store user-friendly error
  const [open, setOpen] = useState(false); // dialog open state
  const [showMessage, setShowMessage] = useState(false); // for fade-in

  const navigate = useNavigate();

  // Pick a random message **once per page load** using useMemo
  const randomMessage = useMemo(() => {
    const messages = [
      "Welcome back! Let’s crush your fitness goals today! 💪",
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
      let friendlyMessage;

      // Map Firebase errors to user-friendly messages
      switch (err.code) {
        case "auth/invalid-email":
          friendlyMessage = "Enter a valid email address.";
          break;
        case "auth/user-disabled":
          friendlyMessage = "This account has been disabled.";
          break;
        case "auth/user-not-found":
          friendlyMessage = "No account found with this email.";
          break;
        case "auth/wrong-password":
          friendlyMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-credential":
          friendlyMessage = "Invalid login credentials.";
          break;
        default:
          friendlyMessage = "An unexpected error occurred. Please try again.";
          break;
      }

      setError(friendlyMessage);
      setOpen(true); // open dialog on error
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6", // same as dashboard bg
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 3, p: 4, boxShadow: 8 }}>
          <CardContent>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Login
            </Typography>

            {/* Motivational text with fade */}
            <Fade in={showMessage} timeout={800}>
              <Typography variant="body1" sx={{ mb: 3, color: "gray" }}>
                {randomMessage}
              </Typography>
            </Fade>

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 1, borderRadius: 2 }}
                onClick={handleLogin}
              >
                Login
              </Button>
            </Box>

            <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
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
    </Box>
  );
}
