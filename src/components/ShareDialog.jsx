import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  Alert,
  Snackbar,
  Divider,
  Chip,
} from "@mui/material";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import TelegramIcon from "@mui/icons-material/Telegram";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme } from "../contexts/ThemeContext";

export default function ShareDialog({
  open,
  onClose,
  title,
  content,
  shareData,
  type,
}) {
  const [copied, setCopied] = React.useState(false);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const { mode } = useTheme();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setSnackbarOpen(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = (platform) => {
    let url = "";
    const encodedText = encodeURIComponent(content);
    const encodedTitle = encodeURIComponent(title);

    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodedText}`;
        break;
      case "telegram":
        url = `https://t.me/share/url?url=${encodedTitle}&text=${encodedText}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedTitle}&quote=${encodedText}`;
        break;
      default:
        return;
    }

    window.open(url, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content,
        });
        onClose();
      } catch (err) {
        console.log("Share cancelled:", err);
      }
    }
  };

  const getShareIcon = (platform) => {
    const iconStyle = { fontSize: 28 };
    const iconProps = {
      sx: {
        ...iconStyle,
        color:
          platform === "whatsapp"
            ? "#25D366"
            : platform === "telegram"
              ? "#0088cc"
              : platform === "twitter"
                ? "#1DA1F2"
                : platform === "facebook"
                  ? "#4267B2"
                  : "inherit",
      },
    };

    switch (platform) {
      case "whatsapp":
        return <WhatsAppIcon {...iconProps} />;
      case "telegram":
        return <TelegramIcon {...iconProps} />;
      case "twitter":
        return <TwitterIcon {...iconProps} />;
      case "facebook":
        return <FacebookIcon {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
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
          <Box display="flex" alignItems="center" gap={1}>
            <ShareIcon color="primary" />
            <Typography variant="h6">Share {type}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* Share Preview */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: mode === "light" ? "#f5f5f5" : "#333",
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              {content}
            </Typography>
          </Box>

          {/* Share Buttons Grid */}
          <Typography variant="subtitle2" gutterBottom color="text.secondary">
            Share via
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: 2,
              mb: 3,
            }}
          >
            {["whatsapp", "telegram", "twitter", "facebook"].map((platform) => (
              <Button
                key={platform}
                variant="outlined"
                onClick={() => handleShare(platform)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  py: 1.5,
                  borderColor: "divider",
                  "&:hover": {
                    borderColor:
                      platform === "whatsapp"
                        ? "#25D366"
                        : platform === "telegram"
                          ? "#0088cc"
                          : platform === "twitter"
                            ? "#1DA1F2"
                            : platform === "facebook"
                              ? "#4267B2"
                              : "primary.main",
                    bgcolor:
                      mode === "light"
                        ? "rgba(0,0,0,0.02)"
                        : "rgba(255,255,255,0.02)",
                  },
                }}
              >
                {getShareIcon(platform)}
                <Typography
                  variant="caption"
                  sx={{ textTransform: "capitalize" }}
                >
                  {platform}
                </Typography>
              </Button>
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Copy Link */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              size="small"
              value={content}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              multiline
              maxRows={3}
            />
            <Button
              variant="contained"
              onClick={handleCopy}
              startIcon={<ContentCopyIcon />}
              sx={{
                minWidth: 100,
                bgcolor: copied ? "success.main" : "primary.main",
                "&:hover": {
                  bgcolor: copied ? "success.dark" : "primary.dark",
                },
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
          </Box>

          {/* Native Share (if available) */}
          {navigator.share && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Button
                variant="contained"
                onClick={handleNativeShare}
                startIcon={<ShareIcon />}
              >
                Use native share
              </Button>
            </Box>
          )}

          {/* Data Summary */}
          {shareData && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                gutterBottom
              >
                Summary
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {Object.entries(shareData).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
