import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider,
  InputAdornment,
  DialogContentText,
  Alert,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "@mui/material/Menu";
import { db } from "../firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function WorkoutPlans({ userId, onAddToToday }) {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customPlanName, setCustomPlanName] = useState("");
  const [exercises, setExercises] = useState([
    {
      id: 1,
      name: "",
      sets: "",
      reps: "",
      weight: "",
      weightUnit: "kg",
    },
  ]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedPlanForMenu, setSelectedPlanForMenu] = useState(null);

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [successSnackbarOpen, setSuccessSnackbarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load plans from Firestore
  useEffect(() => {
    if (!userId) return;

    const loadPlans = async () => {
      setLoading(true);
      try {
        const plansCollection = collection(db, "users", userId, "workoutPlans");
        const snapshot = await getDocs(plansCollection);

        const loadedPlans = [];
        snapshot.forEach((doc) => {
          loadedPlans.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setPlans(loadedPlans);
      } catch (error) {
        console.error("Error loading workout plans:", error);
        const savedPlans = localStorage.getItem(`workoutPlans_${userId}`);
        if (savedPlans) {
          setPlans(JSON.parse(savedPlans));
        }
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [userId]);

  const handleAddExercise = () => {
    const newId =
      exercises.length > 0 ? Math.max(...exercises.map((e) => e.id)) + 1 : 1;
    setExercises([
      ...exercises,
      {
        id: newId,
        name: "",
        sets: "",
        reps: "",
        weight: "",
        weightUnit: "kg",
      },
    ]);
  };

  const handleExerciseChange = (index, field, value) => {
    const newExercises = [...exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setExercises(newExercises);
  };

  const handleRemoveExercise = (index) => {
    if (exercises.length > 1) {
      const newExercises = exercises.filter((_, i) => i !== index);
      setExercises(newExercises);
    }
  };

  const saveCustomPlan = async () => {
    if (!customPlanName.trim() || !userId) return;

    // Validate exercises
    const hasValidExercises = exercises.some((ex) => ex.name.trim() !== "");

    if (!hasValidExercises) {
      setValidationMessage("Please add at least one valid exercise");
      setValidationDialogOpen(true);
      return;
    }

    setSaving(true);
    try {
      const planId = editingPlan
        ? editingPlan.id
        : `PLAN_${Date.now()}_${customPlanName.replace(/[^a-zA-Z0-9]/g, "_")}`;

      const planDoc = doc(db, "users", userId, "workoutPlans", planId);
      await setDoc(planDoc, {
        name: customPlanName,
        exercises: exercises,
        createdAt: editingPlan ? editingPlan.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (editingPlan) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === planId
              ? { ...p, name: customPlanName, exercises: exercises }
              : p,
          ),
        );
      } else {
        const newPlan = {
          id: planId,
          name: customPlanName,
          exercises: exercises,
          createdAt: new Date(),
        };
        setPlans((prev) => [...prev, newPlan]);
      }

      resetForm();
      setSelectedPlanId(planId);
      setSuccessMessage(
        `Workout plan ${editingPlan ? "updated" : "saved"} successfully!`,
      );
      setSuccessSnackbarOpen(true);
    } catch (error) {
      console.error("Error saving workout plan:", error);
      setErrorMessage(
        `Failed to ${editingPlan ? "update" : "save"} workout plan. Please try again.`,
      );
      setErrorSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomPlanName("");
    setExercises([
      {
        id: 1,
        name: "",
        sets: "",
        reps: "",
        weight: "",
        weightUnit: "kg",
      },
    ]);
    setOpenDialog(false);
    setOpenEditDialog(false);
    setEditingPlan(null);
  };

  const openEditPlanDialog = (plan) => {
    setEditingPlan(plan);
    setCustomPlanName(plan.name);
    setExercises(plan.exercises || []);
    setOpenEditDialog(true);
  };

  const confirmDeletePlan = (planId) => {
    const planToDelete = plans.find((p) => p.id === planId);
    if (!planToDelete) return;

    setPlanToDelete(planToDelete);
    setDeleteDialogOpen(true);
  };

  const deletePlan = async () => {
    if (!planToDelete || !userId) return;

    try {
      const planDoc = doc(db, "users", userId, "workoutPlans", planToDelete.id);
      await deleteDoc(planDoc);

      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));

      if (selectedPlanId === planToDelete.id) {
        setSelectedPlanId("");
      }

      setSuccessMessage("Workout plan deleted successfully!");
      setSuccessSnackbarOpen(true);
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      setErrorMessage("Failed to delete workout plan. Please try again.");
      setErrorSnackbarOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const addToTodayWorkout = () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (selectedPlan && selectedPlan.exercises) {
      onAddToToday(selectedPlan.exercises);
    }
  };

  const handleMenuOpen = (event, plan) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedPlanForMenu(plan);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedPlanForMenu(null);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const renderExerciseCard = (exercise, index) => {
    return (
      <Box
        key={exercise.id || index}
        sx={{
          p: 1.5,
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          backgroundColor: "#fafafa",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <FitnessCenterIcon
            fontSize="small"
            sx={{ mr: 1, color: "primary.main" }}
          />
          <Typography variant="body2" fontWeight="bold">
            {exercise.name}
          </Typography>
          <Chip
            label="Strength"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 20, fontSize: "0.7rem", ml: 1 }}
          />
        </Box>
        <Grid container spacing={1}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Sets
            </Typography>
            <Typography variant="body2">{exercise.sets || 3}</Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Reps
            </Typography>
            <Typography variant="body2">{exercise.reps || 8}</Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              Weight
            </Typography>
            <Typography variant="body2">
              {exercise.weight
                ? `${exercise.weight} ${exercise.weightUnit || "kg"}`
                : "Weight Not Set"}
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderExerciseForm = (exercise, index) => {
    return (
      <Box
        key={exercise.id || index}
        sx={{
          p: 2,
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          backgroundColor: "#f0f7ff",
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="subtitle2">Exercise #{index + 1}</Typography>
          {exercises.length > 1 && (
            <IconButton
              size="small"
              onClick={() => handleRemoveExercise(index)}
              disabled={saving}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Exercise Name"
              fullWidth
              value={exercise.name}
              onChange={(e) =>
                handleExerciseChange(index, "name", e.target.value)
              }
              size="small"
              disabled={saving}
              placeholder="e.g., Bench Press, Squats, Pull-ups"
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Sets"
              type="number"
              fullWidth
              value={exercise.sets}
              onChange={(e) =>
                handleExerciseChange(
                  index,
                  "sets",
                  parseInt(e.target.value) || 0,
                )
              }
              size="small"
              disabled={saving}
              inputProps={{ min: 0, max: 10 }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Reps"
              type="number"
              fullWidth
              value={exercise.reps}
              onChange={(e) =>
                handleExerciseChange(
                  index,
                  "reps",
                  parseInt(e.target.value) || 0,
                )
              }
              size="small"
              disabled={saving}
              inputProps={{ min: 0, max: 50 }}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <TextField
              label="Weight"
              type="number"
              fullWidth
              value={exercise.weight}
              onChange={(e) =>
                handleExerciseChange(index, "weight", e.target.value)
              }
              size="small"
              disabled={saving}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Select
                      value={exercise.weightUnit || "kg"}
                      onChange={(e) =>
                        handleExerciseChange(
                          index,
                          "weightUnit",
                          e.target.value,
                        )
                      }
                      size="small"
                      variant="standard"
                      sx={{ width: 60 }}
                    >
                      <MenuItem value="kg">kg</MenuItem>
                      <MenuItem value="lbs">lbs</MenuItem>
                    </Select>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Workout Plans</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setOpenDialog(true);
          }}
          disabled={saving}
        >
          Create New Plan
        </Button>
      </Box>

      {/* Plan Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Workout Plan</InputLabel>
        <Select
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          label="Select Workout Plan"
        >
          <MenuItem value="">-- Select a plan --</MenuItem>
          {plans.map((plan) => (
            <MenuItem key={plan.id} value={plan.id}>
              {plan.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Selected Plan Details */}
      {selectedPlan && selectedPlan.exercises && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" color="primary">
                  {selectedPlan.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedPlan.exercises.length} exercise
                  {selectedPlan.exercises.length !== 1 ? "s" : ""}
                  {selectedPlan.exercises.length > 0 && (
                    <>
                      {" "}
                      •{" "}
                      {selectedPlan.exercises.reduce(
                        (sum, e) => sum + (e.sets || 0),
                        0,
                      )}{" "}
                      sets
                    </>
                  )}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => openEditPlanDialog(selectedPlan)}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => confirmDeletePlan(selectedPlan.id)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Exercises List */}
            <Grid container spacing={1}>
              {selectedPlan.exercises.map((exercise, index) => (
                <Grid size={{ xs: 12 }} key={exercise.id || index}>
                  {renderExerciseCard(exercise, index)}
                </Grid>
              ))}
            </Grid>

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              onClick={addToTodayWorkout}
              startIcon={<ContentCopyIcon />}
              disabled={saving}
            >
              Add to Today's Workout
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Plans Grid */}
      {plans.length > 0 && (
        <>
          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Your Plans
          </Typography>
          <Grid container spacing={2}>
            {plans.map((plan) => {
              const totalSets = plan.exercises?.reduce(
                (sum, e) => sum + (e.sets || 0),
                0,
              );

              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plan.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: "pointer",
                      border:
                        selectedPlanId === plan.id
                          ? "2px solid #1976d2"
                          : "1px solid #e0e0e0",
                      height: "100%",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "#1976d2",
                        boxShadow: 1,
                      },
                    }}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          gutterBottom
                        >
                          {plan.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, plan);
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                        <Chip
                          icon={<FitnessCenterIcon />}
                          label={`${plan.exercises?.length || 0} exercises`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        paragraph
                      >
                        Total sets: {totalSets || 0}
                        {plan.exercises?.[0]?.reps &&
                          ` × ${plan.exercises[0].reps} reps`}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Chip
                          label={
                            selectedPlanId === plan.id ? "Selected" : "Select"
                          }
                          size="small"
                          color={
                            selectedPlanId === plan.id ? "primary" : "default"
                          }
                          variant={
                            selectedPlanId === plan.id ? "filled" : "outlined"
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(
                            plan.createdAt?.toDate?.() || plan.createdAt,
                          ).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* No Plans Message */}
      {plans.length === 0 && (
        <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <FitnessCenterIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
          />
          <Typography variant="h6" gutterBottom>
            No Workout Plans Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create your first workout plan to save time logging exercises
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setOpenDialog(true);
            }}
          >
            Create Your First Plan
          </Button>
        </Card>
      )}

      {/* Plan Actions Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedPlanForMenu) {
              setSelectedPlanId(selectedPlanForMenu.id);
            }
            handleMenuClose();
          }}
        >
          Select Plan
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlanForMenu) {
              openEditPlanDialog(selectedPlanForMenu);
            }
            handleMenuClose();
          }}
        >
          Edit Plan
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlanForMenu) {
              confirmDeletePlan(selectedPlanForMenu.id);
            }
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          Delete Plan
        </MenuItem>
      </Menu>

      {/* Create/Edit Plan Dialog */}
      <Dialog
        open={openDialog || openEditDialog}
        onClose={() => !saving && resetForm()}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPlan ? "Edit Workout Plan" : "Create Workout Plan"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Plan Name"
            fullWidth
            value={customPlanName}
            onChange={(e) => setCustomPlanName(e.target.value)}
            margin="normal"
            placeholder="e.g., Full Body, Push Day, Upper Body"
            disabled={saving}
            autoFocus
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
            Exercises
          </Typography>

          {exercises.map((exercise, index) =>
            renderExerciseForm(exercise, index),
          )}

          <Button
            startIcon={<AddIcon />}
            onClick={handleAddExercise}
            sx={{ mt: 1 }}
            disabled={saving}
          >
            Add Another Exercise
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={resetForm} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveCustomPlan}
            disabled={
              !customPlanName.trim() ||
              exercises.every((ex) => !ex.name.trim()) ||
              saving
            }
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : editingPlan ? (
              "Save Changes"
            ) : (
              "Create Plan"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Workout Plan</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{planToDelete?.name}" workout plan?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deletePlan} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Validation Error Dialog */}
      <Dialog
        open={validationDialogOpen}
        onClose={() => setValidationDialogOpen(false)}
      >
        <DialogTitle>Validation Error</DialogTitle>
        <DialogContent>
          <DialogContentText>{validationMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)} autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSuccessSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={errorSnackbarOpen}
        autoHideDuration={4000}
        onClose={() => setErrorSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setErrorSnackbarOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
