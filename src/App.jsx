import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  Box,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { AdminProvider } from "./contexts/AdminContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Google OAuth client ID
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID";

export default function App() {
  const [user, loading] = useAuthState(auth);

  // Suspended dialog state
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);
  const [suspendedMessage, setSuspendedMessage] = useState("");

  // When user logs in, check if they're suspended
  useEffect(() => {
    if (user) {
      const checkUserStatus = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.status === "suspended") {
            setSuspendedMessage(
              "Your account has been suspended. Please contact support.",
            );
            setSuspendedDialogOpen(true);
          }
        }
      };
      checkUserStatus();
    }
  }, [user]);

  const handleSuspendedDialogClose = async () => {
    setSuspendedDialogOpen(false);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
    window.location.href = "/login";
  };

  if (loading)
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading WellTrackD...
        </Typography>
      </Box>
    );

  return (
    <>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AdminProvider>
          <Router>
            <Routes>
              <Route
                path="/signup"
                element={!user ? <Signup /> : <Navigate to="/dashboard" />}
              />
              <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={user ? <Dashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin"
                element={user ? <AdminDashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="*"
                element={<Navigate to={user ? "/dashboard" : "/login"} />}
              />
            </Routes>
          </Router>
        </AdminProvider>

        {/* Suspended Account Dialog */}
        <Dialog
          open={suspendedDialogOpen}
          onClose={handleSuspendedDialogClose}
          aria-labelledby="suspended-dialog-title"
          aria-describedby="suspended-dialog-description"
        >
          <DialogTitle id="suspended-dialog-title">
            Account Suspended
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="suspended-dialog-description">
              {suspendedMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleSuspendedDialogClose} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </GoogleOAuthProvider>
    </>
  );
}
