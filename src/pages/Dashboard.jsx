import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
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
  Menu,
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
import { format, parseISO } from "date-fns";
import CountUp from "react-countup";

export default function Dashboard() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile State
  const [profile, setProfile] = useState(null);

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

  // Data states
  const [workouts, setWorkouts] = useState([]);
  const [bmiEntries, setBmiEntries] = useState([]);
  const [openBMI, setOpenBMI] = useState(false);
  const [openWorkout, setOpenWorkout] = useState(false);

  // Listen to auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsub();
  }, []);

  // Fetch Profile
  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const p = snap.data();
        setProfile(p);

        if (p.heightUnit === "cm") {
          setHeightCm(p.heightCm || "");
          setHeightUnit("cm");
        } else if (p.heightUnit === "ft/in") {
          setHeightFt(p.heightFt || "");
          setHeightIn(p.heightIn || "");
          setHeightUnit("ft/in");
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Fetch Data
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Workouts
      const workoutSnap = await getDocs(
        collection(db, "users", userId, "workouts"),
      );
      const workoutData = workoutSnap.docs
        .map((doc) => doc.data())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setWorkouts(workoutData);

      // BMI
      const bmiSnap = await getDocs(
        collection(db, "users", userId, "bodyMetrics"),
      );
      const bmiData = bmiSnap.docs
        .map((doc) => doc.data())
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setBmiEntries(bmiData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
    fetchData();
  }, [userId]);

  // --- BMI ---
  const calculateBMI = () => {
    if (!weight) return null;
    let w = Number(weight);
    if (weightUnit === "lbs") w *= 0.453592;
    let hM = 0;
    if (heightUnit === "cm" && heightCm) hM = Number(heightCm) / 100;
    else if (heightUnit === "ft/in" && (heightFt || heightIn))
      hM = (Number(heightFt) * 12 + Number(heightIn)) * 0.0254;
    if (hM === 0) return null;
    return (w / (hM * hM)).toFixed(1);
  };

  const clearBMIForm = () => {
    setWeight("");
    setWeightUnit("kg");
  };

  const addBMIEntry = async () => {
    if (!userId) return alert("User not loaded yet.");
    const bmi = calculateBMI();
    if (!weight) return alert("Enter a weight");
    if (bmi === null) return alert("Enter a valid height");

    try {
      await addDoc(collection(db, "users", userId, "bodyMetrics"), {
        bodyweight:
          weightUnit === "lbs" ? Number(weight) * 0.453592 : Number(weight),
        height:
          heightUnit === "cm"
            ? Number(heightCm) || null
            : (Number(heightFt) * 12 + Number(heightIn)) * 2.54 || null,
        bmi: Number(bmi),
        createdAt: serverTimestamp(),
        date: new Date().toISOString().split("T")[0],
      });

      // Save height permanently
      if (heightUnit === "cm" && heightCm) {
        await setDoc(
          doc(db, "users", userId),
          { heightUnit: "cm", heightCm },
          { merge: true },
        );
      } else if (heightUnit === "ft/in" && (heightFt || heightIn)) {
        await setDoc(
          doc(db, "users", userId),
          { heightUnit: "ft/in", heightFt, heightIn },
          { merge: true },
        );
      }

      clearBMIForm();
      setOpenBMI(false);
      fetchData();
    } catch (err) {
      console.error("Error adding BMI:", err);
    }
  };

  // --- Workout ---
  const calculateCalories = () => {
    const w = Number(workoutWeight);
    const s = Number(sets);
    const r = Number(reps);
    if (!w || !s || !r) return 0;
    const weightKg = workoutUnit === "lbs" ? w * 0.453592 : w;
    const MET = 0.1; // placeholder
    return (weightKg * s * r * MET).toFixed(1);
  };

  const clearWorkoutForm = () => {
    setExercise("");
    setSets("");
    setReps("");
    setWorkoutWeight("");
    setWorkoutUnit("kg");
  };

  const addWorkoutEntry = async () => {
    if (!userId) return alert("User not loaded yet.");
    if (!exercise || !sets || !reps || !workoutWeight)
      return alert("Fill all fields");

    try {
      const calories = calculateCalories();
      await addDoc(collection(db, "users", userId, "workouts"), {
        exercise,
        sets: Number(sets),
        reps: Number(reps),
        weight:
          workoutUnit === "lbs"
            ? Number(workoutWeight) * 0.453592
            : Number(workoutWeight),
        calories: Number(calories),
        date: new Date().toISOString().split("T")[0],
      });

      clearWorkoutForm();
      setOpenWorkout(false);
      fetchData();
    } catch (err) {
      console.error("Error adding workout:", err);
    }
  };

  // --- Summary Calculations ---
  const latestBMIEntry =
    bmiEntries.length > 0
      ? bmiEntries.reduce((latest, entry) => {
          return entry.createdAt?.toMillis() > latest.createdAt?.toMillis()
            ? entry
            : latest;
        })
      : {};

  const getBMIStatus = (bmi) => {
    if (!bmi) return "--";
    if (bmi < 18.5) return "Underweight";
    if (bmi >= 18.5 && bmi < 25) return "Normal";
    if (bmi >= 25 && bmi < 30) return "Overweight";
    return "Obese";
  };

  const latestBMIStatus = getBMIStatus(latestBMIEntry.bmi);

  const getBMIColor = (bmi) => {
    if (!bmi) return "text.secondary";
    if (bmi < 18.5) return "warning.main"; // Underweight
    if (bmi < 25) return "success.main"; // Normal
    if (bmi < 30) return "warning.main"; // Overweight
    return "error.main"; // Obese
  };

  // Consistency (workout streak)
  const sortedWorkouts = workouts
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let streak = 0;
  let yesterday = new Date();
  yesterday.setHours(0, 0, 0, 0);
  for (let i = sortedWorkouts.length - 1; i >= 0; i--) {
    const workoutDate = new Date(sortedWorkouts[i].date);
    workoutDate.setHours(0, 0, 0, 0);
    if (
      workoutDate.getTime() === yesterday.getTime() ||
      (streak === 0 && workoutDate.getTime() <= yesterday.getTime())
    ) {
      streak++;
      yesterday.setDate(yesterday.getDate() - 1);
    } else break;
  }

  // Calories Burned
  const [calorieFilter, setCalorieFilter] = useState("week"); // "week" or "month"
  const [anchorEl, setAnchorEl] = useState(null);

  const getCaloriesBurned = () => {
    const now = new Date();
    let startDate;

    if (calorieFilter === "week") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7,
      );
    } else if (calorieFilter === "month") {
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 30,
      );
    }

    return workouts
      .filter((d) => new Date(d.date) >= startDate)
      .reduce((sum, w) => sum + (w.calories || 0), 0);
  };

  const caloriesBurned = getCaloriesBurned();

  function CalorieDropdown({ value, onChange }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => setAnchorEl(event.currentTarget);
    const handleClose = (val) => {
      if (val) onChange(val);
      setAnchorEl(null);
    };

    return (
      <>
        <Button
          variant="text"
          onClick={handleClick}
          sx={{
            textTransform: "none",
            color: "success.main",
            fontWeight: "bold",
          }}
        >
          {value === "week" ? "This Week" : "This Month"}
        </Button>
        <Menu anchorEl={anchorEl} open={open} onClose={() => handleClose(null)}>
          <MenuItem onClick={() => handleClose("week")}>This Week</MenuItem>
          <MenuItem onClick={() => handleClose("month")}>This Month</MenuItem>
        </Menu>
      </>
    );
  }

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

  // Merge data for chart
  const chartData = [...bmiEntries, ...workouts].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4" fontWeight="bold">
          Welcome, {profile?.name || "User"}
        </Typography>
        <Button variant="contained" color="error" onClick={() => signOut(auth)}>
          Logout
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <ScaleIcon color="primary" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Latest Body Weight
              </Typography>
              <Typography variant="h6" color="primary">
                {latestBMIEntry.bodyweight != null ? (
                  <>
                    <CountUp
                      key={latestBMIEntry.bodyweight}
                      end={Number(latestBMIEntry.bodyweight)}
                      duration={0.5}
                      decimals={1}
                    />{" "}
                    kg
                  </>
                ) : (
                  "-- kg"
                )}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
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
                {latestBMIEntry.bmi != null ? (
                  <CountUp
                    end={Number(latestBMIEntry.bmi)}
                    duration={0.5}
                    decimals={1}
                  />
                ) : (
                  "--"
                )}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <BarChartIcon color="success" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                BMI Status
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: getBMIColor(latestBMIEntry.bmi) }}
              >
                {latestBMIStatus}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <FitnessCenterIcon color="secondary" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Consistency
              </Typography>
              <Typography variant="h6" color="secondary">
                <CountUp end={streak} duration={0.5} />{" "}
                {streak === 1 ? "day" : "days"}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: 2,
              gap: 2,
            }}
          >
            {/* Icon */}
            <BarChartIcon color="success" fontSize="large" />

            {/* Text content */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {/* Title */}
              <Typography variant="body2" color="text.secondary">
                Calories Burned
              </Typography>

              {/* Dropdown + value on same line */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="text"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    textTransform: "none",
                    color: "success.main",
                    fontWeight: 600,
                    p: 0,
                    minWidth: "auto",
                  }}
                >
                  {calorieFilter === "week" ? "This Week" : "This Month"}
                </Button>

                <Typography variant="h6" color="success.main">
                  <CountUp
                    end={caloriesBurned}
                    duration={0.8}
                    separator=","
                    decimals={0}
                  />
                </Typography>
              </Box>
            </Box>

            {/* Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setCalorieFilter("week");
                  setAnchorEl(null);
                }}
              >
                This Week
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setCalorieFilter("month");
                  setAnchorEl(null);
                }}
              >
                This Month
              </MenuItem>
            </Menu>
          </Card>
        </Grid>
      </Grid>

      {/* Chart */}
      <Card variant="outlined" sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" mb={2}>
          Weight & BMI Progress
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={bmiEntries
              .slice()
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((entry) => ({
                date: entry.date,
                weight: entry.bodyweight,
                bmi: entry.bmi,
              }))}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(parseISO(date), "d-MM-yy")}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="#1976d2"
              domain={["dataMin - 5", "dataMax + 5"]}
              label={{
                value: "Weight (kg)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#2e7d32"
              domain={["dataMin - 2", "dataMax + 2"]}
              label={{ value: "BMI", angle: 90, position: "insideRight" }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === "weight"
                  ? [`${value.toFixed(1)} kg`, "Weight"]
                  : [value, "BMI"]
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight"
              stroke="#1976d2"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bmi"
              stroke="#2e7d32"
              strokeWidth={2}
              dot={{ r: 4 }}
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
              {workouts
                .slice()
                .reverse()
                .map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      {format(parseISO(row.date), "dd-MM-yyyy")}
                    </TableCell>
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
        disabled={!userId}
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
      <Dialog
        open={openBMI}
        onClose={() => {
          setOpenBMI(false);
          clearBMIForm();
        }}
      >
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
          <Button
            onClick={() => {
              setOpenBMI(false);
              clearBMIForm();
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={addBMIEntry}>
            Add / Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Workout Dialog */}
      <Dialog
        open={openWorkout}
        onClose={() => {
          setOpenWorkout(false);
          clearWorkoutForm();
        }}
      >
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
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenWorkout(false);
              clearWorkoutForm();
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={addWorkoutEntry}>
            Add Workout
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
