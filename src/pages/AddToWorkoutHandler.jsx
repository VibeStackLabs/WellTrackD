import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";

export default function AddToWorkoutHandler({
  open,
  onClose,
  exercises,
  onConfirm,
}) {
  const [selectedExercises, setSelectedExercises] = useState([]);

  // Reset selection when exercises change
  React.useEffect(() => {
    // Select all exercises by default
    setSelectedExercises(exercises.map((_, index) => index));
  }, [exercises]);

  const handleToggle = (index) => {
    const currentIndex = selectedExercises.indexOf(index);
    const newSelected = [...selectedExercises];

    if (currentIndex === -1) {
      newSelected.push(index);
    } else {
      newSelected.splice(currentIndex, 1);
    }

    setSelectedExercises(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedExercises.length === exercises.length) {
      // If all are selected, deselect all
      setSelectedExercises([]);
    } else {
      // Select all
      setSelectedExercises(exercises.map((_, index) => index));
    }
  };

  const handleAddSelected = () => {
    if (selectedExercises.length === 0) return;

    // Sort selected indices to maintain order
    const sortedSelected = [...selectedExercises].sort((a, b) => a - b);

    // Get selected exercises in the correct order
    const selected = sortedSelected.map((index) => exercises[index]);

    // Send all selected exercises at once
    onConfirm(selected);
    onClose();
  };

  // Helper function to render exercise details
  const renderExerciseDetails = (exercise) => {
    if (typeof exercise === "string") {
      return exercise;
    }

    // Handle exercise object format
    if (exercise.name) {
      const parts = [];
      parts.push(exercise.name);
      if (exercise.sets && exercise.reps)
        parts.push(`${exercise.sets}×${exercise.reps}`);
      if (exercise.weight)
        parts.push(`${exercise.weight} ${exercise.weightUnit || "kg"}`);
      return parts.join(" • ");
    }

    // Fallback
    return exercise.exercise || exercise.name || "Exercise";
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom>
              Add Exercises to Today's Workout
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {exercises.length} strength exercise
                {exercises.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Box>
          <Button size="small" onClick={handleSelectAll} variant="outlined">
            {selectedExercises.length === exercises.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Divider sx={{ mb: 2 }} />

        <List sx={{ maxHeight: 400, overflow: "auto" }}>
          {exercises.map((exercise, index) => {
            const exerciseDetails = renderExerciseDetails(exercise);
            const isSelected = selectedExercises.includes(index);

            return (
              <ListItem
                key={index}
                dense
                button
                onClick={() => handleToggle(index)}
                sx={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 1,
                  mb: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <FitnessCenterIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography
                        variant="body2"
                        fontWeight={isSelected ? "bold" : "normal"}
                      >
                        {exerciseDetails}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    typeof exercise === "object" &&
                    exercise.sets &&
                    exercise.reps && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="primary.main">
                          {exercise.sets} sets × {exercise.reps} reps
                        </Typography>
                      </Box>
                    )
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  #{index + 1}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="outlined"
          onClick={handleAddSelected}
          disabled={selectedExercises.length === 0}
        >
          Add {selectedExercises.length} Exercise
          {selectedExercises.length !== 1 ? "s" : ""}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
