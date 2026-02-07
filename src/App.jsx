import { useEffect } from "react";
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
import { Box, CircularProgress, Typography } from "@mui/material";
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { AdminProvider } from "./contexts/AdminContext";

export default function App() {
  const [user, loading] = useAuthState(auth);

  // When user logs in, check if they're suspended
  useEffect(() => {
    if (user) {
      const checkUserStatus = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.status === "suspended") {
            await signOut(auth);
            alert("Your account has been suspended. Please contact support.");
            window.location.href = "/login";
          }
        }
      };
      checkUserStatus();
    }
  }, [user]);

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
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Router>
    </AdminProvider>
  );
}
