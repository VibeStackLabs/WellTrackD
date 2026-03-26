import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Divider,
  LinearProgress,
  Tooltip,
  Paper,
  Chip,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import EggIcon from "@mui/icons-material/Egg";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import InsightsIcon from "@mui/icons-material/Insights";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PersonIcon from "@mui/icons-material/Person";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import { useTheme } from "../contexts/ThemeContext";

// Activity level options with descriptions
const ACTIVITY_LEVELS = {
  sedentary: {
    label: "Sedentary",
    description: "Little or no exercise, desk job",
    multiplier: 1.2,
    icon: "🛋️",
  },
  light: {
    label: "Lightly Active",
    description: "Light exercise 1-3 days/week",
    multiplier: 1.375,
    icon: "🚶",
  },
  moderate: {
    label: "Moderately Active",
    description: "Moderate exercise 3-5 days/week",
    multiplier: 1.55,
    icon: "🏃",
  },
  active: {
    label: "Very Active",
    description: "Hard exercise 6-7 days/week",
    multiplier: 1.725,
    icon: "💪",
  },
  veryActive: {
    label: "Extremely Active",
    description: "Very hard exercise, physical job, athlete",
    multiplier: 1.9,
    icon: "🏋️",
  },
};

const NutritionRecommendations = ({ bmi, weight, height, workouts = [] }) => {
  const { mode } = useTheme();
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [anchorEl, setAnchorEl] = useState(null);

  // Function to get BMI category and recommendations
  const getBMICategory = (bmiValue) => {
    if (!bmiValue || bmiValue <= 0) return null;
    if (bmiValue < 18.5) return "underweight";
    if (bmiValue >= 18.5 && bmiValue < 25) return "normal";
    if (bmiValue >= 25 && bmiValue < 30) return "overweight";
    return "obese";
  };

  // Calculate ideal weight range (BMI 18.5-24.9)
  const getIdealWeightRange = (heightInCm) => {
    if (!heightInCm || heightInCm <= 0) return null;

    const heightInMeters = heightInCm / 100;
    const minWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxWeight = 24.9 * (heightInMeters * heightInMeters);

    return {
      min: minWeight.toFixed(1),
      max: maxWeight.toFixed(1),
    };
  };

  // Calculate weekly workout breakdown
  const getWeeklyWorkoutBreakdown = () => {
    if (!workouts || workouts.length === 0) return null;

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const daysToMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const weeklyWorkouts = workouts.filter((workout) => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
    });

    if (weeklyWorkouts.length === 0) return null;

    const strengthCount = weeklyWorkouts.filter(
      (w) => w.workoutType === "strength" && w.type !== "rest",
    ).length;
    const cardioCount = weeklyWorkouts.filter(
      (w) => w.workoutType === "cardio",
    ).length;
    const restCount = weeklyWorkouts.filter((w) => w.type === "rest").length;

    const totalCalories = weeklyWorkouts.reduce(
      (sum, w) => sum + (w.calories || 0),
      0,
    );
    const totalDuration = weeklyWorkouts
      .filter((w) => w.workoutType === "cardio")
      .reduce((sum, w) => sum + (w.duration || 0), 0);

    // Get most frequent exercise
    const exerciseFrequency = {};
    weeklyWorkouts.forEach((workout) => {
      if (workout.workoutType === "strength" && workout.exercise) {
        exerciseFrequency[workout.exercise] =
          (exerciseFrequency[workout.exercise] || 0) + 1;
      }
    });

    const topExercises = Object.entries(exerciseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      strengthCount,
      cardioCount,
      restCount,
      totalWorkouts: weeklyWorkouts.length,
      totalCalories: Math.round(totalCalories),
      totalDuration: Math.round(totalDuration),
      topExercises,
      weeklyGoal:
        weeklyWorkouts.length >= 3
          ? "✅ On track"
          : "⚠️ Aim for 3-5 workouts/week",
    };
  };

  // Get daily water intake recommendation (in ml)
  const getWaterIntake = (weight, bmiCategory) => {
    if (!weight) return "Enter weight first";

    // Base recommendation: 30-40 ml per kg of body weight
    let baseWater = weight * 35; // 35 ml per kg

    // Adjust based on BMI category
    if (bmiCategory === "underweight") {
      baseWater = weight * 40; // More water for underweight
    } else if (bmiCategory === "overweight" || bmiCategory === "obese") {
      baseWater = weight * 33; // Slightly less for overweight
    }

    // Add extra based on activity level
    const activityMultipliers = {
      sedentary: 0,
      light: 300,
      moderate: 500,
      active: 800,
      veryActive: 1200,
    };

    baseWater += activityMultipliers[activityLevel] || 0;

    return Math.round(baseWater);
  };

  // Get daily calorie deficit recommendation
  const getCalorieDeficit = (bmiCategory) => {
    let deficit = "";
    let description = "";
    let recommendedCalories = "";

    switch (bmiCategory) {
      case "underweight":
        deficit = "+300 to +500";
        description = "Calorie surplus needed for healthy weight gain";
        recommendedCalories = "Increase by 300-500 kcal/day";
        break;
      case "normal":
        deficit = "0";
        description = "Maintenance calories - no deficit needed";
        recommendedCalories = "Maintain current intake";
        break;
      case "overweight":
        deficit = "-300 to -500";
        description = "Mild deficit for gradual, sustainable weight loss";
        recommendedCalories = "Reduce by 300-500 kcal/day";
        break;
      case "obese":
        deficit = "-500 to -700";
        description = "Moderate deficit for healthy weight loss";
        recommendedCalories = "Reduce by 500-700 kcal/day";
        break;
      default:
        deficit = "0";
        description = "Calculate BMI for recommendations";
        recommendedCalories = "—";
    }

    return {
      deficit,
      recommendedCalories,
      description,
    };
  };

  // Get daily protein intake recommendation (in grams)
  const getProteinIntake = (weight, bmiCategory) => {
    if (!weight) return "Enter weight first";

    // Base protein recommendation (g per kg of body weight)
    let proteinPerKg = 1.2; // Average for general population

    // Adjust based on BMI category
    if (bmiCategory === "underweight") {
      proteinPerKg = 1.5; // Higher protein for muscle gain
    } else if (bmiCategory === "overweight" || bmiCategory === "obese") {
      proteinPerKg = 1.6; // Higher protein for weight loss to preserve muscle
    }

    // Adjust based on activity level
    const activityMultipliers = {
      sedentary: -0.2,
      light: 0,
      moderate: 0.3,
      active: 0.5,
      veryActive: 0.7,
    };

    proteinPerKg += activityMultipliers[activityLevel] || 0;
    proteinPerKg = Math.max(0.8, Math.min(2.2, proteinPerKg)); // Cap between 0.8-2.2 g/kg

    const proteinGrams = Math.round(weight * proteinPerKg);
    return {
      grams: proteinGrams,
      perKg: proteinPerKg.toFixed(1),
      range: `${Math.round(weight * (proteinPerKg - 0.3))}-${Math.round(weight * (proteinPerKg + 0.3))} g`,
    };
  };

  const bmiCategory = getBMICategory(bmi);
  const waterIntake = getWaterIntake(weight, bmiCategory);
  const calorieRecommendation = getCalorieDeficit(bmiCategory);
  const proteinRecommendation = getProteinIntake(weight, bmiCategory);
  const idealWeightRange = getIdealWeightRange(height);
  const weeklyBreakdown = getWeeklyWorkoutBreakdown();

  // Helper function to get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case "underweight":
        return "#FF9800";
      case "normal":
        return "#4CAF50";
      case "overweight":
        return "#FFC107";
      case "obese":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getCategoryText = (category) => {
    switch (category) {
      case "underweight":
        return "Underweight";
      case "normal":
        return "Normal Weight";
      case "overweight":
        return "Overweight";
      case "obese":
        return "Obese";
      default:
        return "Unknown";
    }
  };

  const getCategoryAdvice = (category) => {
    switch (category) {
      case "underweight":
        return "Focus on nutrient-dense foods and strength training to build healthy mass";
      case "normal":
        return "Great job! Maintain healthy habits with balanced nutrition and regular exercise";
      case "overweight":
        return "Focus on creating a sustainable calorie deficit through diet and increased activity";
      case "obese":
        return "Consider consulting a healthcare provider for personalized weight management plan";
      default:
        return "Track your BMI regularly to monitor progress";
    }
  };

  // Format water intake in liters for display
  const formatWaterIntake = (ml) => {
    if (typeof ml === "string") return ml;
    const liters = ml / 1000;
    return `${liters.toFixed(1)} L (${ml} ml)`;
  };

  const handleActivityLevelChange = (level) => {
    setActivityLevel(level);
    setAnchorEl(null);
    // Optionally save to localStorage
    localStorage.setItem("userActivityLevel", level);
  };

  // Load saved activity level on mount
  React.useEffect(() => {
    const savedLevel = localStorage.getItem("userActivityLevel");
    if (savedLevel && ACTIVITY_LEVELS[savedLevel]) {
      setActivityLevel(savedLevel);
    }
  }, []);

  if (!bmi || !weight) {
    return (
      <Card variant="outlined" sx={{ mt: 3, p: 2 }}>
        <CardContent>
          <Typography variant="body1" color="text.secondary" align="center">
            📊 Enter your weight and height in the BMI section above to see
            personalized health insights
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mt: 3,
        overflow: "visible",
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <InsightsIcon color="primary" />
            Health Insights for {getCategoryText(bmiCategory)}
          </Typography>
          <Chip
            label={`BMI: ${bmi}`}
            size="small"
            sx={{
              backgroundColor: getCategoryColor(bmiCategory),
              color: "white",
              fontWeight: "bold",
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {getCategoryAdvice(bmiCategory)}
        </Typography>

        {/* Activity Level Selector */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: mode === "light" ? "#F5F5F5" : "#2d2d2d",
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PersonIcon color="action" />
              <Typography variant="body2" fontWeight="bold">
                Activity Level:
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                endIcon={<ExpandMoreIcon />}
                sx={{ textTransform: "none", minWidth: 140 }}
              >
                {ACTIVITY_LEVELS[activityLevel].icon}{" "}
                {ACTIVITY_LEVELS[activityLevel].label}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {ACTIVITY_LEVELS[activityLevel].description}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            PaperProps={{
              sx: { maxWidth: 300 },
            }}
          >
            {Object.entries(ACTIVITY_LEVELS).map(([key, level]) => (
              <MenuItem
                key={key}
                onClick={() => handleActivityLevelChange(key)}
                selected={activityLevel === key}
                sx={{
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 0.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2">{level.icon}</Typography>
                  <Typography
                    variant="body2"
                    fontWeight={activityLevel === key ? "bold" : "normal"}
                  >
                    {level.label}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {level.description}
                </Typography>
              </MenuItem>
            ))}
          </Menu>
        </Paper>

        <Grid container spacing={3}>
          {/* Water Intake Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: mode === "light" ? "#E3F2FD" : "#1a2a3a",
                borderRadius: 2,
                height: "100%",
              }}
            >
              <WaterDropIcon
                sx={{ fontSize: 40, color: "#2196F3", mb: 1, pt: 1 }}
              />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Recommended Daily Water
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                {formatWaterIntake(waterIntake)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                💧 Based on {ACTIVITY_LEVELS[activityLevel].label.toLowerCase()}{" "}
                activity
              </Typography>
            </Paper>
          </Grid>

          {/* Calorie Recommendation Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: mode === "light" ? "#FFF3E0" : "#2a241a",
                borderRadius: 2,
                height: "100%",
              }}
            >
              <LocalFireDepartmentIcon
                sx={{ fontSize: 40, color: "#d32f2f", mb: 1, pt: 1 }}
              />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Calorie Recommendation
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                {calorieRecommendation.deficit}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {calorieRecommendation.recommendedCalories}
              </Typography>
              <Tooltip title={calorieRecommendation.description} arrow>
                <Typography
                  variant="caption"
                  color="info.main"
                  sx={{ mt: 1, display: "block" }}
                >
                  ℹ️ {calorieRecommendation.description}
                </Typography>
              </Tooltip>
            </Paper>
          </Grid>

          {/* Protein Intake Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 1,
                textAlign: "center",
                backgroundColor: mode === "light" ? "#E8F5E9" : "#1a2a1a",
                borderRadius: 2,
                height: "100%",
              }}
            >
              <EggIcon sx={{ fontSize: 40, color: "#4CAF50", mb: 1, pt: 1 }} />
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Recommended Daily Protein
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
                {typeof proteinRecommendation.grams === "number"
                  ? `${proteinRecommendation.grams} g`
                  : proteinRecommendation.grams}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {proteinRecommendation.perKg} g/kg body weight
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                📊 Range: {proteinRecommendation.range}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Ideal Weight Range */}
        {idealWeightRange && (
          <>
            <Divider sx={{ pt: 2, my: 3 }} />
            <Box>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <TrendingUpIcon color="info" fontSize="small" />
                Ideal Weight Range for Your Height
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: mode === "light" ? "#F5F5F5" : "#2d2d2d",
                  borderRadius: 2,
                  mt: 1,
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body1" align="center">
                      <strong>{idealWeightRange.min} kg</strong> to{" "}
                      <strong>{idealWeightRange.max} kg</strong>
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="center"
                      display="block"
                    >
                      (Based on BMI 18.5-24.9)
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Box sx={{ position: "relative", pt: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          ((weight - idealWeightRange.min) /
                            (idealWeightRange.max - idealWeightRange.min)) *
                          100
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                        color={
                          weight < idealWeightRange.min
                            ? "warning"
                            : weight > idealWeightRange.max
                              ? "error"
                              : "success"
                        }
                      />
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mt: 0.5,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {idealWeightRange.min} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Current: {weight} kg
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {idealWeightRange.max} kg
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 1, textAlign: "center" }}
                >
                  {weight < idealWeightRange.min
                    ? "📈 You're below the ideal weight range. Focus on nutrient-rich foods to gain healthy weight."
                    : weight > idealWeightRange.max
                      ? "📉 You're above the ideal weight range. Focus on balanced nutrition and regular activity."
                      : "✅ You're within the ideal weight range! Maintain your healthy habits."}
                </Typography>
              </Paper>
            </Box>
          </>
        )}

        {/* Weekly Workout Breakdown */}
        {weeklyBreakdown ? (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography
                variant="subtitle2"
                gutterBottom
                sx={{
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <EmojiEventsIcon color="warning" fontSize="small" />
                Weekly Activity Summary
              </Typography>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      backgroundColor: mode === "light" ? "#E8EAF6" : "#1e2a3a",
                    }}
                  >
                    <FitnessCenterIcon fontSize="small" color="primary" />
                    <Typography variant="h6">
                      {weeklyBreakdown.strengthCount}
                    </Typography>
                    <Typography variant="caption">Strength</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      backgroundColor: mode === "light" ? "#E8EAF6" : "#1e2a3a",
                    }}
                  >
                    <DirectionsRunIcon fontSize="small" color="secondary" />
                    <Typography variant="h6">
                      {weeklyBreakdown.cardioCount}
                    </Typography>
                    <Typography variant="caption">Cardio</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      backgroundColor: mode === "light" ? "#E8EAF6" : "#1e2a3a",
                    }}
                  >
                    <SportsKabaddiIcon fontSize="small" color="info" />
                    <Typography variant="h6">
                      {weeklyBreakdown.totalWorkouts}
                    </Typography>
                    <Typography variant="caption">Total Workouts</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      textAlign: "center",
                      backgroundColor: mode === "light" ? "#E8EAF6" : "#1e2a3a",
                    }}
                  >
                    <LocalFireDepartmentIcon fontSize="small" color="error" />
                    <Typography variant="h6">
                      {weeklyBreakdown.totalCalories}
                    </Typography>
                    <Typography variant="caption">Calories Burned</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {weeklyBreakdown.topExercises.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="subtitle2"
                    gutterBottom
                    sx={{
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <LocalFireDepartmentIcon color="error" fontSize="small" />
                    Most Frequent Exercises This Week:
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {weeklyBreakdown.topExercises.map((exercise, idx) => (
                      <Chip
                        key={idx}
                        label={`${exercise.name} (${exercise.count}x)`}
                        size="small"
                        variant="outlined"
                        icon={<FitnessCenterIcon fontSize="small" />}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 1 }}>
                <Chip
                  label={weeklyBreakdown.weeklyGoal}
                  size="small"
                  color={
                    weeklyBreakdown.totalWorkouts >= 3 ? "success" : "warning"
                  }
                  variant="outlined"
                />
              </Box>

              {weeklyBreakdown.totalDuration > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 1 }}
                >
                  ⏱️ Total cardio duration this week:{" "}
                  {weeklyBreakdown.totalDuration} minutes
                </Typography>
              )}
            </Box>
          </>
        ) : workouts.length > 0 ? (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ my: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                📝 No workouts logged this week. Start logging to see your
                weekly summary!
              </Typography>
            </Box>
          </>
        ) : null}

        {/* BMI-Specific Tips */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <TipsAndUpdatesIcon color="warning" fontSize="small" />
            Quick Tips for {getCategoryText(bmiCategory)}
          </Typography>
          <Grid container spacing={1}>
            {bmiCategory === "underweight" && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    • 🍚 Eat calorie-dense foods (nuts, avocados, whole grains)
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography
                    variant="body2"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    • 💪 Focus on strength training 2-3x/week to build muscle
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🥚 Increase protein to 1.5-2.0 g/kg body weight
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🍽️ Eat 5-6 smaller meals throughout the day
                  </Typography>
                </Grid>
              </>
            )}

            {bmiCategory === "normal" && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • ✅ Maintain current healthy habits
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🏃‍♂️ 150 min/week moderate exercise recommended
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🥗 Balance macros: 40% carbs, 30% protein, 30% fat
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 💧 Continue drinking adequate water daily
                  </Typography>
                </Grid>
              </>
            )}

            {bmiCategory === "overweight" && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🚶 Start with 30 min daily walking
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🥦 Focus on high-fiber vegetables and lean proteins
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🍽️ Practice portion control and mindful eating
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 💪 Add resistance training 2-3 times per week
                  </Typography>
                </Grid>
              </>
            )}

            {bmiCategory === "obese" && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🩺 Consult healthcare provider before starting new program
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🚶 Start with low-impact activities (walking, swimming)
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 🥗 Aim for sustainable 500-700 calorie deficit
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    • 📱 Track food intake to increase awareness
                  </Typography>
                </Grid>
              </>
            )}
          </Grid>
        </Box>

        {/* Disclaimer */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            mt: 2,
            pt: 2,
            borderTop: `1px solid ${mode === "light" ? "#eee" : "#333"}`,
          }}
        >
          ⚠️ These are general recommendations for informational purposes only.
          Individual needs may vary. Consult a healthcare professional or
          registered dietitian for personalized medical advice.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default NutritionRecommendations;
