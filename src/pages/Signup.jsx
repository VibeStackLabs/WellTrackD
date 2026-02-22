import { useState, useEffect, useMemo } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate, Link } from "react-router-dom";
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fade,
} from "@mui/material";
import {
  VisibilityOutlined as VisibilityOutlinedIcon,
  VisibilityOffOutlined as VisibilityOffOutlinedIcon,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { getAuthErrorMessage } from "../utils/authErrors";

export default function Signup() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false); // track manual edits
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const [showMessage, setShowMessage] = useState(false); // For fade-in

  const navigate = useNavigate();

  // --- Validate username locally ---
  const validateUsername = (name) => {
    if (!name) return "Username is required";
    if (!/^[a-z0-9_]+$/.test(name))
      return "Only lowercase letters, numbers, _ allowed";
    if (name.length < 3) return "Username too short (min 3 chars)";
    if (name.length > 15) return "Username too long (max 15 chars)";
    return "";
  };

  // --- Auto-generate username from full name if not manually edited ---
  useEffect(() => {
    if (!usernameTouched) {
      const generatedUsername = name
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      setUsername(generatedUsername);
    }
  }, [name, usernameTouched]);

  // --- Check username availability in real-time ---
  useEffect(() => {
    const cleanUsername = username.toLowerCase().replace(/\s/g, "");
    setUsernameError(validateUsername(cleanUsername));
    setUsernameAvailable(null);

    if (usernameError || !cleanUsername) return; // skip Firestore if invalid

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const usernameRef = doc(db, "usernames", cleanUsername);
        const usernameSnap = await getDoc(usernameRef);
        setUsernameAvailable(!usernameSnap.exists());
      } catch (err) {
        console.error("Error checking username:", err);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500); // debounce 500ms

    return () => clearTimeout(timer);
  }, [username, usernameError]);

  // Random motivational messages picked only once per page load
  const randomMessage = useMemo(() => {
    const messages = [
      "Start your fitness journey today! 🏋️",
      "Join the movement—track, train, transform!",
      "Every journey starts with a single step. Sign up now!",
      "Your progress starts here! Let’s do this 💪",
      "Make every workout count!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  // Trigger fade-in after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setShowMessage(true), 200); // slight delay
    return () => clearTimeout(timer);
  }, []);

  const handleSignup = async () => {
    const cleanUsername = username.toLowerCase().replace(/\s/g, "");
    const errorMsg = validateUsername(cleanUsername);

    if (!name || !username || !email || !password) {
      setError("Please fill all fields");
      setOpen(true);
      return;
    }

    if (errorMsg) {
      setError(errorMsg);
      setOpen(true);
      return;
    }

    if (usernameAvailable === false) {
      setError("Username already taken");
      setOpen(true);
      return;
    }

    try {
      setLoading(true);

      // Create Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Store user profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        username: cleanUsername,
        email,
        createdAt: serverTimestamp(),
      });

      // Reserve username
      await setDoc(doc(db, "usernames", cleanUsername), {
        uid: user.uid,
      });

      navigate("/dashboard");
    } catch (err) {
      const friendlyMessage = getAuthErrorMessage(err, "signup");
      setError(friendlyMessage);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setOpen(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center" mb={3}>
          <Link to="/">
            <img
              src="/favicon.svg"
              alt="WellTrackD Logo"
              style={{ height: 50 }}
            />
          </Link>

          <Typography
            sx={{
              fontWeight: 700,
              letterSpacing: 0.5,
              fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" },
            }}
          >
            WellTrackD
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, p: 5, boxShadow: 10 }}>
          <CardContent>
            <Typography
              variant="h4"
              fontWeight="bold"
              gutterBottom
              color="primary"
            >
              Create Your Account
            </Typography>

            {/* Motivational text with fade */}
            <Fade in={showMessage} timeout={800}>
              <Typography variant="body1" sx={{ mb: 3, color: "#555" }}>
                {randomMessage}
              </Typography>
            </Fade>

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Full Name"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.replace(/\s/g, "").toLowerCase());
                  setUsernameTouched(true); // user has typed
                }}
                helperText={
                  checkingUsername ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <CircularProgress size={16} /> Checking...
                    </Box>
                  ) : usernameTouched && usernameError ? (
                    usernameError
                  ) : usernameAvailable === true ? (
                    "Username available ✅"
                  ) : usernameAvailable === false ? (
                    "Username already taken ❌"
                  ) : (
                    ""
                  )
                }
                error={
                  usernameTouched &&
                  (!!usernameError || usernameAvailable === false)
                }
              />

              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <TextField
                label="Password"
                type={showPassword ? "text" : "password"} // Toggle type
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

              <Button
                variant="outlined"
                size="large"
                fullWidth
                sx={{ mt: 1, borderRadius: 3 }}
                onClick={handleSignup}
                disabled={
                  loading ||
                  checkingUsername ||
                  !!usernameError ||
                  usernameAvailable === false
                }
              >
                {loading ? "Creating Account..." : "Get Started"}
              </Button>
            </Box>

            <Typography
              variant="body2"
              sx={{ mt: 3, textAlign: "center", color: "#555" }}
            >
              Already have an account?{" "}
              <Link
                to="/login"
                style={{ textDecoration: "none", color: "#4f46e5" }}
              >
                Login
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Container>

      {/* Dialog Box for Errors */}
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
