import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  Upgrade as UpgradeIcon,
  BugReport as BugReportIcon,
  Security as SecurityIcon,
  Build as BuildIcon,
  Telegram as TelegramIcon,
  NewReleases as NewReleasesIcon,
  TaskAlt as TaskAltIcon,
} from "@mui/icons-material";
import { getPublishedChangelog } from "../utils/changelogFunctions";

const ChangelogDialog = ({ open, onClose }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadChangelog();
    }
  }, [open]);

  const loadChangelog = async () => {
    setLoading(true);
    try {
      const changelogEntries = await getPublishedChangelog();
      setEntries(changelogEntries);
    } catch (error) {
      console.error("Error loading changelog:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "feature":
        return <UpgradeIcon fontSize="small" />;
      case "bugfix":
        return <BugReportIcon fontSize="small" />;
      case "security":
        return <SecurityIcon fontSize="small" />;
      case "improvement":
      default:
        return <BuildIcon fontSize="small" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "feature":
        return "success";
      case "bugfix":
        return "warning";
      case "security":
        return "error";
      case "improvement":
      default:
        return "info";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleContactSupport = () => {
    onClose();
    window.open("https://t.me/Reignz3", "_blank");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NewReleasesIcon color="success" />
            <Typography variant="h6" component="span">
              What's New
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Latest updates and improvements
        </Typography>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <Typography>Loading updates...</Typography>
          </Box>
        ) : entries.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <NewReleasesIcon
              sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No updates yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later for new features and improvements!
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {entries.map((entry, index) => (
              <Paper
                key={entry.id}
                variant="outlined"
                sx={{
                  p: 2,
                  borderLeft: `4px solid ${
                    entry.type === "feature"
                      ? "#4caf50"
                      : entry.type === "bugfix"
                        ? "#ff9800"
                        : entry.type === "security"
                          ? "#f44336"
                          : "#2196f3"
                  }`,
                  backgroundColor: index === 0 ? "#f8f9fa" : "transparent",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip
                      label={entry.version}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={entry.type}
                      size="small"
                      variant="outlined"
                      icon={getTypeIcon(entry.type)}
                      color={getTypeColor(entry.type)}
                      sx={{ textTransform: "capitalize" }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(entry.date)}
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle1"
                  fontWeight="medium"
                  gutterBottom
                >
                  {entry.title}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: "pre-line" }}
                >
                  {entry.description}
                </Typography>

                {index === 0 && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed #e0e0e0" }}>
                    <Typography variant="caption" color="text.secondary">
                      🔥 Latest update
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Box>
        )}

        {/* Version History Link */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            You're using WellTrackD • All updates are logged here
          </Typography>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          startIcon={<TelegramIcon />}
          onClick={handleContactSupport}
          variant="outlined"
          color="primary"
        >
          Contact Support
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          color="success"
          startIcon={<TaskAltIcon />}
        >
          Got it!
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangelogDialog;
