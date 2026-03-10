import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  InputAdornment,
  Chip,
  Paper,
  Avatar,
} from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  VisibilityOutlined,
  VisibilityOffOutlined,
  Person as PersonIcon,
  Lock as LockIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { db, auth } from "../firebase";
import { getAuthErrorMessage } from "../utils/authErrors";
import { useTheme } from "../contexts/ThemeContext";

export default function ProfileEditDialog({
  open,
  onClose,
  userData,
  userId,
  onUpdate,
  isOffline,
}) {
  // Form states
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Username validation states
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // "profile" or "password"

  // Get current color theme
  const { mode } = useTheme();

  // UI Avatars service - free, no API key needed
  const getUIAvatarUrl = (name, size = 200) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&size=${size}&background=1976d2&color=fff&bold=true&length=2`;
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (userData?.name) {
      return userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  // Generate consistent color based on username or uid
  const getAvatarColor = () => {
    const colors = [
      "#1976d2",
      "#2e7d32",
      "#ed6c02",
      "#9c27b0",
      "#d32f2f",
      "#0288d1",
      "#7b1fa2",
      "#c2185b",
    ];

    const hash = (userId || userData?.username || "")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  };

  // Initialize form with user data
  useEffect(() => {
    if (open && userData) {
      setName(userData.name || "");
      setUsername(userData.username || "");
      setOriginalUsername(userData.username || "");
      setAvatarUrl(userData.avatarUrl || "");
      setUsernameTouched(false);
      setUsernameAvailable(null);
      setUsernameError("");

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setSuccess("");
    }
  }, [open, userData]);

  // Validate username locally
  const validateUsername = (name) => {
    if (!name) return "Username is required";
    if (!/^[a-z0-9_]+$/.test(name))
      return "Only lowercase letters, numbers, _ allowed";
    if (name.length < 3) return "Username too short (min 3 chars)";
    if (name.length > 15) return "Username too long (max 15 chars)";
    return "";
  };

  // Check username availability
  useEffect(() => {
    if (!open) return;

    const cleanUsername = username.toLowerCase().replace(/\s/g, "");

    // Skip if username is same as original
    if (cleanUsername === originalUsername) {
      setUsernameAvailable(true);
      setUsernameError("");
      return;
    }

    const errorMsg = validateUsername(cleanUsername);
    setUsernameError(errorMsg);

    if (errorMsg || !cleanUsername) {
      setUsernameAvailable(null);
      return;
    }

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
    }, 500);

    return () => clearTimeout(timer);
  }, [username, originalUsername, open]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.replace(/\s/g, "").toLowerCase();
    setUsername(value);
    setUsernameTouched(true);
  };

  const handleUpdateProfile = async () => {
    if (!userId) {
      setError("User not found");
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const cleanUsername = username.toLowerCase().replace(/\s/g, "");
    const usernameErrorMsg = validateUsername(cleanUsername);

    if (usernameErrorMsg) {
      setError(usernameErrorMsg);
      return;
    }

    // Check if username is available (if changed)
    if (cleanUsername !== originalUsername && usernameAvailable !== true) {
      setError("Username is not available");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update user document first
      const userRef = doc(db, "users", userId);
      const updates = {
        name: name.trim(),
        username: cleanUsername,
        avatarUrl: avatarUrl?.trim() || null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updates);

      // If username changed, update usernames collection
      if (cleanUsername !== originalUsername) {
        try {
          // Create new username document
          const newUsernameRef = doc(db, "usernames", cleanUsername);
          await setDoc(newUsernameRef, {
            uid: userId,
            createdAt: serverTimestamp(),
          });

          // Delete old username document if it exists
          if (originalUsername) {
            const oldUsernameRef = doc(db, "usernames", originalUsername);
            await deleteDoc(oldUsernameRef);
          }
        } catch (usernameErr) {
          console.error("Error updating username collection:", usernameErr);
          // If username update fails, still consider profile update successful
          // as the user document was updated
        }
      }

      setSuccess("Profile updated successfully!");

      // Notify parent component
      if (onUpdate) {
        onUpdate({
          ...userData,
          name: name.trim(),
          username: cleanUsername,
          avatarUrl: avatarUrl || null,
          updatedAt: new Date(),
        });
      }

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!auth.currentUser) {
      setError("You must be logged in to change password");
      return;
    }

    // Validate passwords
    if (!currentPassword) {
      setError("Current password is required");
      return;
    }

    if (!newPassword) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setSuccess("Password updated successfully!");

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Switch back to profile tab after success
      setTimeout(() => {
        setActiveTab("profile");
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error updating password:", err);
      setError(getAuthErrorMessage(err, "password-change"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: 500,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="span" fontWeight="bold">
          Edit Profile
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ py: 2 }}>
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You're offline. Profile changes cannot be saved until you're back
            online.
          </Alert>
        )}

        {/* Tab Selection */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Button
            variant={activeTab === "profile" ? "contained" : "outlined"}
            onClick={() => setActiveTab("profile")}
            startIcon={<PersonIcon />}
            sx={{ flex: 1 }}
            disabled={loading}
          >
            Profile Info
          </Button>
          <Button
            variant={activeTab === "password" ? "contained" : "outlined"}
            onClick={() => setActiveTab("password")}
            startIcon={<LockIcon />}
            sx={{ flex: 1 }}
            disabled={loading}
          >
            Password
          </Button>
        </Box>

        {/* Error/Success Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Avatar Section */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 1 }}>
              <Avatar
                src={avatarUrl || getUIAvatarUrl(name)}
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: getAvatarColor(),
                  fontSize: "2rem",
                  fontWeight: 600,
                  border: "3px solid",
                  borderColor: "primary.main",
                }}
              >
                {!avatarUrl && getUserInitials()}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Profile Picture
                </Typography>
                <TextField
                  label="Image URL"
                  placeholder="https://example.com/your-photo.jpg"
                  value={avatarUrl || ""}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={loading || isOffline}
                  helperText="Enter any image URL or leave empty for auto-generated avatar"
                  FormHelperTextProps={{
                    sx: {
                      ml: "4px",
                    },
                  }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => {
                      // Use UI Avatars
                      setAvatarUrl("");
                    }}
                    disabled={loading || isOffline || !avatarUrl}
                    startIcon={<CloseIcon />}
                  >
                    Reset to Initials
                  </Button>
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Email (read-only) */}
            <TextField
              label="Email"
              value={userData?.email || ""}
              fullWidth
              disabled
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
              }}
              helperText="Email cannot be changed"
              FormHelperTextProps={{
                sx: {
                  ml: "4px",
                },
              }}
            />

            {/* Full Name */}
            <TextField
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              disabled={loading || isOffline}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Username */}
            <Box>
              <TextField
                label="Username"
                value={username}
                onChange={handleUsernameChange}
                fullWidth
                required
                disabled={loading || isOffline}
                error={
                  usernameTouched &&
                  (!!usernameError || usernameAvailable === false)
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body2" color="text.secondary">
                        @
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                helperText={
                  checkingUsername ? (
                    <Box
                      component="span"
                      display="flex"
                      alignItems="center"
                      gap={1}
                    >
                      {" "}
                      {/* Add component="span" */}
                      <CircularProgress size={16} /> Checking availability...
                    </Box>
                  ) : usernameTouched && usernameError ? (
                    usernameError
                  ) : username !== originalUsername &&
                    usernameAvailable === true ? (
                    "Username available ✅"
                  ) : username !== originalUsername &&
                    usernameAvailable === false ? (
                    "Username already taken ❌"
                  ) : username === originalUsername ? (
                    "Current username"
                  ) : (
                    "Only lowercase letters, numbers, and underscores"
                  )
                }
                FormHelperTextProps={{
                  sx: {
                    ml: "4px",
                  },
                }}
              />
            </Box>

            {/* Account Info */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: mode === "light" ? "#faf5e7" : "#333333",
                color: mode === "light" ? "#333333" : "#faf5e7",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="caption"
                display="block"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
              >
                Member since:{" "}
                {userData?.createdAt?.toDate?.()
                  ? new Date(userData.createdAt.toDate()).toLocaleDateString(
                      [],
                      {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                      },
                    )
                  : userData?.createdAt
                    ? new Date(userData.createdAt).toLocaleDateString([], {
                        month: "long",
                        day: "2-digit",
                        year: "numeric",
                      })
                    : "N/A"}
              </Typography>
              <Typography
                variant="caption"
                display="block"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
              >
                User ID: {userId}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Password Tab */}
        {activeTab === "password" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Enter your current password to set a new one
            </Alert>

            {/* Current Password */}
            <TextField
              label="Current Password"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              disabled={loading || isOffline}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      edge="end"
                      size="small"
                    >
                      {showCurrentPassword ? (
                        <VisibilityOffOutlined />
                      ) : (
                        <VisibilityOutlined />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* New Password */}
            <TextField
              label="New Password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              disabled={loading || isOffline}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                      size="small"
                    >
                      {showNewPassword ? (
                        <VisibilityOffOutlined />
                      ) : (
                        <VisibilityOutlined />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Must be at least 6 characters"
              FormHelperTextProps={{
                sx: {
                  ml: "4px",
                },
              }}
            />

            {/* Confirm New Password */}
            <TextField
              label="Confirm New Password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              disabled={loading || isOffline}
              error={confirmPassword && newPassword !== confirmPassword}
              helperText={
                confirmPassword && newPassword !== confirmPassword
                  ? "Passwords do not match"
                  : ""
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      edge="end"
                      size="small"
                    >
                      {showConfirmPassword ? (
                        <VisibilityOffOutlined />
                      ) : (
                        <VisibilityOutlined />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.6, py: 2 }}>
        <Button
          onClick={onClose}
          disabled={loading}
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

        {activeTab === "profile" ? (
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            disabled={
              loading ||
              isOffline ||
              !name.trim() ||
              checkingUsername ||
              !!usernameError ||
              usernameAvailable === false ||
              (username !== originalUsername && usernameAvailable !== true)
            }
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdatePassword}
            disabled={
              loading ||
              isOffline ||
              !currentPassword ||
              !newPassword ||
              newPassword !== confirmPassword ||
              newPassword.length < 6
            }
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
