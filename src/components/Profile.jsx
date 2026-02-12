import React, { useState } from "react";
import {
  Avatar,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import { AccountCircle as AccountCircleIcon } from "@mui/icons-material";
import ProfileEditDialog from "./ProfileEditDialog";

// UI Avatars service - free, no API key needed
const getUIAvatarUrl = (name, size = 200) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&size=${size}&background=1976d2&color=fff&bold=true&length=2`;
};

export default function Profile({ userData, onUpdate, isOffline }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleProfileClick = () => {
    setEditDialogOpen(true);
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

  // Determine avatar source
  const getAvatarSrc = () => {
    // If user has custom avatar URL, use it
    if (userData?.avatarUrl) {
      return userData.avatarUrl;
    }
    // Otherwise use UI Avatars
    return getUIAvatarUrl(userData?.name || "User");
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Clickable Profile Avatar */}
        <Tooltip title="Edit Profile">
          <IconButton
            onClick={handleProfileClick}
            size="small"
            sx={{
              p: 0.5,
              border: "2px solid",
              borderColor: isOffline ? "warning.main" : "primary.main",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: isOffline ? "warning.dark" : "primary.dark",
                transform: "scale(1.05)",
                backgroundColor: "rgba(25, 118, 210, 0.04)",
              },
            }}
          >
            <Avatar
              src={getAvatarSrc()}
              sx={{
                width: 44,
                height: 44,
                bgcolor: getAvatarColor(),
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {!userData?.avatarUrl && getUserInitials()}
            </Avatar>
          </IconButton>
        </Tooltip>

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
              sx={{ cursor: "pointer" }}
              onClick={handleProfileClick}
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
