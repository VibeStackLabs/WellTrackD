import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Button,
  LinearProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  SpeedDial,
  SpeedDialAction,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import ScaleIcon from "@mui/icons-material/Scale";
import BarChartIcon from "@mui/icons-material/BarChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Predefined exercises with MET factors
const EXERCISES = [
  { name: "Bench Press", met: 0.1 },
  { name: "Squat", met: 0.12 },
  { name: "Deadlift", met: 0.11 },
  { name: "Push Ups", met: 0.08 },
  { name: "Pull Ups", met: 0.09 },
];

export default function Dashboard() {
  const userId = auth.currentUser.uid;

  // FAB State
  const [fabOpen, setFabOpen] = useState(false);

  // BMI States
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");

  // Workout States
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [workoutWeight, setWorkoutWeight] = useState("");
  const [workoutUnit, setWorkoutUnit] = useState("kg");

  const [data, setData] = useState([]);
  const [openBMI, setOpenBMI] = useState(false);
  const [openWorkout, setOpenWorkout] = useState(false);

  // Fetch data
  const fetchData = async () => {
    const snapshot = await getDocs(collection(db, "users", userId, "workouts"));
    const sortedData = snapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    setData(sortedData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate BMI
  const calculateBMI = () => {
    if (!weight) return 0;
    let w = Number(weight);
    if (weightUnit === "lbs") w *= 0.453592; // lbs → kg
    let hM = 0;
    if (heightUnit === "cm" && heightCm) hM = Number(heightCm) / 100;
    else if (heightUnit === "ft/in" && (heightFt || heightIn))
      hM = (Number(heightFt) * 12 + Number(heightIn)) * 0.0254;

    if (hM === 0) return null; // BMI not calculated if no height
    return (w / (hM * hM)).toFixed(1);
  };

  // Add / Update BMI Entry
  const addBMIEntry = async () => {
    const bmi = calculateBMI();
    if (!weight) return alert("Enter a weight");

    await addDoc(collection(db, "users", userId, "workouts"), {
      weight: Number(weightUnit === "lbs" ? weight * 0.453592 : weight),
      height:
        heightUnit === "cm"
          ? heightCm
            ? Number(heightCm)
            : null
          : heightFt || heightIn
            ? (Number(heightFt) * 12 + Number(heightIn)) * 2.54
            : null,
      bmi: bmi ? Number(bmi) : null,
      date: new Date().toISOString().split("T")[0], // add date
    });
    setWeight("");
    setHeightCm("");
    setHeightFt("");
    setHeightIn("");
    setWeightUnit("kg");
    setHeightUnit("cm");
    setOpenBMI(false);
    fetchData();
  };

  // Calculate calories for workout
  const calculateCalories = () => {
    if (!exercise || !sets || !reps || !workoutWeight) return 0;
    let w = Number(workoutWeight);
    if (workoutUnit === "lbs") w *= 0.453592; // convert lbs to kg
    const MET = 0.1; // default for any user-defined exercise
    return (w * Number(sets) * Number(reps) * MET).toFixed(1);
  };

  // Add workout entry
  const addWorkoutEntry = async () => {
    if (!exercise || !sets || !reps || !workoutWeight)
      return alert("Fill all fields");
    const calories = calculateCalories();
    const latestEntry = data[data.length - 1] || {};
    await addDoc(collection(db, "users", userId, "workouts"), {
      exercise,
      sets: Number(sets),
      reps: Number(reps),
      weight:
        workoutUnit === "lbs"
          ? Number(workoutWeight) * 0.453592
          : Number(workoutWeight),
      calories: Number(calories),
      bmi: latestEntry.bmi || null,
      weight: latestEntry.weight || null,
      height: latestEntry.height || null,
      date: new Date().toISOString().split("T")[0],
    });
    setExercise("");
    setSets("");
    setReps("");
    setWorkoutWeight("");
    setWorkoutUnit("kg");
    setOpenWorkout(false);
    fetchData();
  };

  const latestEntry = data[data.length - 1] || {};
  const totalWorkouts = data.length;
  const weeklyWorkouts = data.filter(
    (d) => new Date(d.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;
  const monthlyWorkouts = data.filter(
    (d) => new Date(d.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  ).length;

  const actions = [
    {
      icon: <ScaleIcon />,
      name: "Add/Update BMI",
      onClick: () => setOpenBMI(true),
    },
    {
      icon: <FitnessCenterIcon />,
      name: "Add Today's Workout",
      onClick: () => setOpenWorkout(true),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" fontWeight="bold">
          Workout Tracker
        </Typography>
        <Button variant="contained" color="error" onClick={() => signOut(auth)}>
          Logout
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={2}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <ScaleIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Latest Weight
              </Typography>
              <Typography variant="h6" color="primary">
                {latestEntry.weight?.toFixed(1) || "--"} kg
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <BarChartIcon color="success" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Latest BMI
              </Typography>
              <Typography variant="h6" color="success.main">
                {latestEntry.bmi || "--"}
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={2}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <FitnessCenterIcon color="secondary" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Total Workouts
              </Typography>
              <Typography variant="h6" color="secondary">
                {totalWorkouts}
              </Typography>
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Weekly Workouts
            </Typography>
            <Typography variant="h6" color="info.main">
              {weeklyWorkouts}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(weeklyWorkouts / 7) * 100}
              sx={{ height: 10, borderRadius: 5, mt: 1 }}
            />
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Monthly Workouts
            </Typography>
            <Typography variant="h6" color="warning.main">
              {monthlyWorkouts}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(monthlyWorkouts / 30) * 100}
              sx={{ height: 10, borderRadius: 5, mt: 1 }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Chart */}
      <Card variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Weight & BMI Progress
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#1976d2"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="bmi"
              stroke="#2e7d32"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Workout Table */}
      <Card variant="outlined" sx={{ p: 3, mb: 10 }}>
        <Typography variant="h6" mb={2}>
          Workout History
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Exercise</TableCell>
                <TableCell>Sets</TableCell>
                <TableCell>Reps</TableCell>
                <TableCell>Weight (kg)</TableCell>
                <TableCell>Calories</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .slice()
                .reverse()
                .map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.exercise || "--"}</TableCell>
                    <TableCell>{row.sets || "--"}</TableCell>
                    <TableCell>{row.reps || "--"}</TableCell>
                    <TableCell>{row.weight?.toFixed(1) || "--"}</TableCell>
                    <TableCell>{row.calories || "--"}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* FAB */}
      <SpeedDial
        ariaLabel="Add Entry"
        sx={{ position: "fixed", bottom: 30, right: 30 }}
        icon={<AddIcon />}
        open={fabOpen}
        onClick={() => setFabOpen((prev) => !prev)}
        onOpen={() => {}}
        onClose={() => setFabOpen(false)}
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            onClick={() => {
              setFabOpen(false);
              action.onClick();
            }}
          />
        ))}
      </SpeedDial>

      {/* BMI Dialog */}
      <Dialog open={openBMI} onClose={() => setOpenBMI(false)}>
        <DialogTitle>Add / Update BMI</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Unit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              sx={{ width: 100 }}
            >
              <MenuItem value="kg">kg</MenuItem>
              <MenuItem value="lbs">lbs</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            {heightUnit === "cm" ? (
              <TextField
                label="Height (cm)"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                fullWidth
              />
            ) : (
              <>
                <TextField
                  label="Feet"
                  type="number"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  sx={{ width: 100 }}
                />
                <TextField
                  label="Inches"
                  type="number"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  sx={{ width: 100 }}
                />
              </>
            )}
            <TextField
              select
              label="Unit"
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value)}
              sx={{ width: 100 }}
            >
              <MenuItem value="cm">cm</MenuItem>
              <MenuItem value="ft/in">ft/in</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBMI(false)}>Cancel</Button>
          <Button variant="contained" onClick={addBMIEntry}>
            Add / Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workout Dialog */}
      <Dialog open={openWorkout} onClose={() => setOpenWorkout(false)}>
        <DialogTitle>Add Today's Workout</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
        >
          <TextField
            label="Exercise Name"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Sets"
              type="number"
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              fullWidth
            />
            <TextField
              label="Reps"
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              fullWidth
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Weight"
              type="number"
              value={workoutWeight}
              onChange={(e) => setWorkoutWeight(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Unit"
              value={workoutUnit}
              onChange={(e) => setWorkoutUnit(e.target.value)}
              sx={{ width: 100 }}
            >
              <MenuItem value="kg">kg</MenuItem>
              <MenuItem value="lbs">lbs</MenuItem>
            </TextField>
          </Box>
          <TextField
            label="Calories"
            value={calculateCalories()}
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenWorkout(false)}>Cancel</Button>
          <Button variant="contained" onClick={addWorkoutEntry}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
