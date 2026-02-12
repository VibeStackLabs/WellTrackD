import React, { useState } from "react";
import {
  Avatar,
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  Edit as EditIcon,
  Logout as LogoutIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import ProfileEditDialog from "./ProfileEditDialog";

export default function Profile({ userData, onUpdate, isOffline }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    handleMenuClose();
    setEditDialogOpen(true);
  };

  const handleLogout = async () => {
    setMenuLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setMenuLoading(false);
      handleMenuClose();
    }
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
  };

  const handleProfileUpdate = (updatedData) => {
    if (onUpdate) {
      onUpdate(updatedData);
    }
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
      "#1976d2", // blue
      "#2e7d32", // green
      "#ed6c02", // orange
      "#9c27b0", // purple
      "#d32f2f", // red
      "#0288d1", // light blue
      "#7b1fa2", // deep purple
      "#c2185b", // pink
    ];

    const hash = (userData?.uid || userData?.username || "")
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return colors[hash % colors.length];
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* Avatar/Profile Button */}
        <IconButton
          onClick={handleMenuOpen}
          size="small"
          sx={{
            p: 0.5,
            border: "2px solid",
            borderColor: isOffline ? "warning.main" : "primary.main",
            transition: "all 0.2s",
            "&:hover": {
              borderColor: isOffline ? "warning.dark" : "primary.dark",
              backgroundColor: "rgba(25, 118, 210, 0.04)",
            },
          }}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: getAvatarColor(),
              fontSize: "1.1rem",
              fontWeight: 600,
            }}
          >
            {getUserInitials()}
          </Avatar>
        </IconButton>

        {/* Welcome Text with Name */}
        <Box sx={{ display: { xs: "none", sm: "block" } }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.2 }}
          >
            Welcome back,
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              color="primary.main"
            >
              {userData?.name || "User"}
            </Typography>
            {isOffline && (
              <Chip
                label="Offline"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 20 }}
              />
            )}
          </Box>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 260,
              borderRadius: 2,
              overflow: "visible",
              "&:before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "translateY(-50%) rotate(45deg)",
                zIndex: 0,
              },
            },
          }}
        >
          {/* User Info Header */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: getAvatarColor(),
                  fontSize: "1.2rem",
                  fontWeight: 600,
                }}
              >
                {getUserInitials()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {userData?.name || "User"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  @{userData?.username || "username"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Menu Items */}
          <MenuItem onClick={handleEditProfile}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Edit Profile"
              secondary="Update name, username, or password"
            />
          </MenuItem>

          <Divider sx={{ my: 0.5 }} />

          <MenuItem onClick={handleLogout} disabled={menuLoading}>
            <ListItemIcon>
              {menuLoading ? (
                <CircularProgress size={20} />
              ) : (
                <LogoutIcon fontSize="small" color="error" />
              )}
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              secondary="Sign out of your account"
              primaryTypographyProps={{ color: "error" }}
            />
          </MenuItem>
        </Menu>
      </Box>

      {/* Profile Edit Dialog */}
      <ProfileEditDialog
        open={editDialogOpen}
        onClose={handleDialogClose}
        userData={userData}
        userId={userData?.uid}
        onUpdate={handleProfileUpdate}
        isOffline={isOffline}
      />
    </>
  );
}
