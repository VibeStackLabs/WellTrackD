import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../contexts/AdminContext";
import {
  getAllUsers,
  deleteUser,
  updateUser,
  getSystemStats,
  logAdminAction,
  sendPasswordReset,
  toggleUserStatus,
} from "../utils/adminFunctions";
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  TablePagination,
  Snackbar,
  Avatar,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AlertTitle,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  BarChart as BarChartIcon,
  Security as SecurityIcon,
  Logout as LogoutIcon,
  Email as EmailIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  LockReset as LockResetIcon,
  Visibility as VisibilityIcon,
  CalendarToday as CalendarTodayIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";

function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, adminLoading, adminData, hasPermission } = useAdmin();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedTab, setSelectedTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [openSuspendDialog, setOpenSuspendDialog] = useState(false);
  const [suspendUser, setSuspendUser] = useState(null);

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  // Load data
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        getAllUsers(),
        getSystemStats(),
      ]);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading admin data:", error);
      showSnackbar("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and status
  useEffect(() => {
    let result = users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    setFilteredUsers(result);
    setPage(0); // Reset to first page when filtering
  }, [searchTerm, statusFilter, users]);

  const handleSuspendClick = (user) => {
    setSuspendUser(user);
    setOpenSuspendDialog(true);
  };

  const confirmSuspendUser = async () => {
    if (!suspendUser) return;
    await handleToggleStatus(suspendUser);
    setOpenSuspendDialog(false);
    setSuspendUser(null);
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      // Log action (client-side only)
      logAdminAction(adminData?.uid, "DELETE_USER", selectedUser.id, {
        userEmail: selectedUser.email,
        userName: selectedUser.name,
        timestamp: new Date().toISOString(),
      });

      const result = await deleteUser(selectedUser.id);

      if (result.success) {
        // Update local state
        setUsers(users.filter((user) => user.id !== selectedUser.id));
        showSnackbar(`User ${selectedUser.email} deleted successfully`);
      } else {
        showSnackbar(
          `Failed to delete user: ${result.error?.message || "Unknown error"}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showSnackbar("Error deleting user", "error");
    } finally {
      setOpenDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      status: user.status || "active",
      role: user.role || "user",
    });
    setOpenDialog(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      // Prepare updates
      const updates = {
        name: editForm.name,
        username: editForm.username,
        status: editForm.status,
        role: editForm.role,
        updatedAt: new Date().toISOString(),
      };

      // Log action (client-side only)
      logAdminAction(adminData?.uid, "UPDATE_USER", selectedUser.id, {
        changes: updates,
        previousData: {
          name: selectedUser.name,
          username: selectedUser.username,
          status: selectedUser.status,
          role: selectedUser.role,
        },
      });

      const success = await updateUser(selectedUser.id, updates);

      if (success) {
        // Update local state
        setUsers(
          users.map((user) =>
            user.id === selectedUser.id ? { ...user, ...updates } : user,
          ),
        );
        setOpenDialog(false);
        showSnackbar("User updated successfully");
      } else {
        showSnackbar("Failed to update user", "error");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      showSnackbar("Failed to update user", "error");
    }
  };

  const handleResetPasswordClick = (user) => {
    setSelectedUser(user);
    setResetEmail(user.email);
    setOpenResetDialog(true);
  };

  const handleSendPasswordReset = async () => {
    if (!resetEmail) return;

    setResetLoading(true);
    try {
      const result = await sendPasswordReset(resetEmail);

      if (result.success) {
        showSnackbar(result.message);

        // Log action (client-side only)
        logAdminAction(
          adminData?.uid,
          "RESET_PASSWORD",
          selectedUser?.id || "unknown",
          { email: resetEmail, timestamp: new Date().toISOString() },
        );
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      console.error("Error sending password reset:", error);
      showSnackbar("Failed to send password reset email", "error");
    } finally {
      setResetLoading(false);
      setOpenResetDialog(false);
      setSelectedUser(null);
      setResetEmail("");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      // Show loading state
      showSnackbar(`Updating user status...`, "info");

      const currentStatus = user.status || "active";
      const result = await toggleUserStatus(user.id, currentStatus);

      if (result.success) {
        // Update local state immediately
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  status: result.newStatus,
                  updatedAt: new Date().toISOString(),
                }
              : u,
          ),
        );

        // Update filtered users as well
        setFilteredUsers((prevFiltered) =>
          prevFiltered.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  status: result.newStatus,
                  updatedAt: new Date().toISOString(),
                }
              : u,
          ),
        );

        // Log action (client-side only)
        logAdminAction(adminData?.uid, "TOGGLE_USER_STATUS", user.id, {
          previousStatus: currentStatus,
          newStatus: result.newStatus,
          timestamp: new Date().toISOString(),
          userEmail: user.email,
          userName: user.name,
        });

        showSnackbar(
          `User ${user.email} has been ${result.newStatus === "active" ? "activated" : "suspended"}`,
          "success",
        );
      } else {
        showSnackbar(
          `Failed to update user status: ${result.error?.message || "Unknown error"}`,
          "error",
        );
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      showSnackbar(`Error: ${error.message}`, "error");
    }
  };

  const handleLogout = () => {
    navigate("/dashboard");
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const getUserStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "suspended":
        return "error";
      case "pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getUserStatusIcon = (status) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon fontSize="small" />;
      case "suspended":
        return <BlockIcon fontSize="small" />;
      default:
        return null;
    }
  };

  if (adminLoading || loading) {
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
          Loading Admin Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          {/* Left side */}
          <Grid>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SecurityIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Typography variant="h4" fontWeight={700}>
                Admin Dashboard
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage users and system settings • Logged in as{" "}
              <Box component="span" sx={{ fontWeight: 500 }}>
                {adminData?.email}
              </Box>
            </Typography>
          </Grid>

          {/* Right side buttons */}
          <Grid>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadData}
                disabled={loading}
              >
                Refresh
              </Button>

              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Back to App
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h4">{stats.totalUsers || 0}</Typography>
                  <Typography variant="caption" color="success.main">
                    +{stats.newUsersLast7Days || 0} this week
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 40, color: "primary.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Active Users
                  </Typography>
                  <Typography variant="h4">{stats.activeUsers || 0}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last 30 days
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: "success.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Server Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={stats.serverStatus || "Unknown"}
                      color={
                        stats.serverStatus === "online" ? "success" : "error"
                      }
                      size="small"
                      icon={
                        stats.serverStatus === "online" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                    />
                  </Box>
                </Box>
                <BarChartIcon sx={{ fontSize: 40, color: "warning.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Admin Permissions
                  </Typography>
                  <Typography variant="h6">
                    {hasPermission("all") ? "Full Access" : "Limited Access"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {adminData?.permissions?.length || 0} permissions
                  </Typography>
                </Box>
                <SecurityIcon sx={{ fontSize: 40, color: "info.main" }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="User Management" icon={<PersonIcon />} />
          <Tab label="System Logs" icon={<BarChartIcon />} />
          <Tab label="Settings" icon={<SecurityIcon />} />
        </Tabs>
      </Paper>

      {/* User Management Tab */}
      {selectedTab === 0 && (
        <Paper sx={{ p: 3 }}>
          {/* Filters */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <TextField
              label="Search users..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 300 }}
              InputProps={{
                startAdornment: (
                  <PersonIcon sx={{ mr: 1, color: "text.secondary" }} />
                ),
              }}
            />

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="text.secondary">
                Showing {filteredUsers.length} of {users.length} users
              </Typography>
            </Box>
          </Box>

          {filteredUsers.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <PersonIcon
                sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No users found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm
                  ? "Try a different search term"
                  : "No users in the system"}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>User</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Joined</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUsers
                      .slice(
                        page * rowsPerPage,
                        page * rowsPerPage + rowsPerPage,
                      )
                      .map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Avatar sx={{ bgcolor: "primary.main" }}>
                                {user.name?.charAt(0) ||
                                  user.email?.charAt(0) ||
                                  "U"}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.name || "No Name"}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  ID: {user.id.substring(0, 8)}...
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.username ? (
                              <Chip label={`@${user.username}`} size="small" />
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Chip
                                label={user.status || "active"}
                                size="small"
                                color={getUserStatusColor(user.status)}
                                icon={getUserStatusIcon(user.status)}
                                variant={
                                  user.status === "suspended"
                                    ? "filled"
                                    : "outlined"
                                }
                              />
                              {user.status === "suspended" &&
                                user.suspendedAt && (
                                  <Tooltip
                                    title={`Suspended on ${formatDate(user.suspendedAt)}`}
                                  >
                                    <CalendarTodayIcon
                                      fontSize="small"
                                      color="error"
                                    />
                                  </Tooltip>
                                )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <CalendarTodayIcon
                                fontSize="small"
                                color="action"
                              />
                              <Typography variant="body2">
                                {formatDate(user.createdAt)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 1,
                              }}
                            >
                              <Tooltip title="Edit User">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditClick(user)}
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Send Password Reset">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResetPasswordClick(user)}
                                  color="warning"
                                >
                                  <LockResetIcon />
                                </IconButton>
                              </Tooltip>

                              <Tooltip
                                title={
                                  user.status === "active"
                                    ? "Suspend User"
                                    : "Activate User"
                                }
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    if (user.status === "active") {
                                      handleSuspendClick(user);
                                    } else {
                                      handleToggleStatus(user);
                                    }
                                  }}
                                  color={
                                    user.status === "active"
                                      ? "warning"
                                      : "success"
                                  }
                                >
                                  {user.status === "active" ? (
                                    <BlockIcon />
                                  ) : (
                                    <CheckCircleIcon />
                                  )}
                                </IconButton>
                              </Tooltip>

                              <Tooltip title="Delete User">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(user)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
              />
            </>
          )}
        </Paper>
      )}

      {/* System Logs Tab - Placeholder for now */}
      {selectedTab === 1 && (
        <Paper sx={{ p: 3, textAlign: "center", py: 8 }}>
          <BarChartIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            System Logs
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Audit logs will be displayed here
          </Typography>
        </Paper>
      )}

      {/* Settings Tab - Placeholder for now */}
      {selectedTab === 2 && (
        <Paper sx={{ p: 3, textAlign: "center", py: 8 }}>
          <SecurityIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            System configuration will be available here
          </Typography>
        </Paper>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User: {selectedUser?.email}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Full Name"
              fullWidth
              value={editForm.name || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
            <TextField
              label="Username"
              fullWidth
              value={editForm.username || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, username: e.target.value })
              }
              helperText="Without @ symbol"
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={editForm.email || ""}
              disabled
              helperText="Email cannot be changed"
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editForm.status || "active"}
                label="Status"
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editForm.role || "user"}
                label="Role"
                onChange={(e) =>
                  setEditForm({ ...editForm, role: e.target.value })
                }
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="moderator">Moderator</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="outlined">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone!
          </Alert>
          <Typography>
            Are you sure you want to delete user{" "}
            <strong>{selectedUser?.email}</strong>?
          </Typography>
          {selectedUser?.name && (
            <Typography variant="body2" color="text" sx={{ mt: 1 }}>
              Name: {selectedUser.name}
            </Typography>
          )}
          <Typography variant="body2" color="text">
            User ID: {selectedUser?.id}
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            This will permanently delete all user data including workouts, BMI
            entries, and profile.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteUser}
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)}>
        <DialogTitle>Send Password Reset</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              This will send a password reset email to the user. They will be
              able to set a new password.
            </Alert>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled
              helperText="User will receive a password reset link at this email"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenResetDialog(false)}
            disabled={resetLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendPasswordReset}
            variant="contained"
            color="primary"
            startIcon={<EmailIcon />}
            disabled={resetLoading || !resetEmail}
          >
            {resetLoading ? "Sending..." : "Send Reset Email"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspend Confirmation Dialog */}
      <Dialog
        open={openSuspendDialog}
        onClose={() => setOpenSuspendDialog(false)}
      >
        <DialogTitle>Suspend User</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            Suspended users will not be able to access the application.
          </Alert>
          <Typography>
            Are you sure you want to suspend user{" "}
            <strong>{suspendUser?.email}</strong>?
          </Typography>
          {suspendUser?.name && (
            <Typography variant="body2" color="text" sx={{ mt: 1 }}>
              Name: {suspendUser.name}
            </Typography>
          )}
          <Typography variant="body2" color="text" sx={{ mt: 2 }}>
            <strong>Effects of suspension:</strong>
          </Typography>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2">User cannot login</Typography>
            </li>
            <li>
              <Typography variant="body2">
                Existing sessions are terminated
              </Typography>
            </li>
            <li>
              <Typography variant="body2">Data is preserved</Typography>
            </li>
            <li>
              <Typography variant="body2">
                Can be reactivated anytime
              </Typography>
            </li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSuspendDialog(false)}>Cancel</Button>
          <Button
            onClick={confirmSuspendUser}
            variant="outlined"
            color="warning"
            startIcon={<BlockIcon />}
          >
            Suspend User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default AdminDashboard;
