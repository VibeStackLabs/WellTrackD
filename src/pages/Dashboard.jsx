import React from "react";
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
  query,
  orderBy,
  updateDoc,
  deleteDoc,
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
  ButtonGroup,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import ScaleIcon from "@mui/icons-material/Scale";
import BarChartIcon from "@mui/icons-material/BarChart";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
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
  const [chartFilter, setChartFilter] = useState("week");

  // Workout States
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState([{ setNumber: 1, reps: "", weight: "" }]);
  const [workoutUnit, setWorkoutUnit] = useState("kg");
  const [workoutFilter, setWorkoutFilter] = useState("today");
  const [workoutDate, setWorkoutDate] = useState("");

  // Workout Types states
  const [workoutType, setWorkoutType] = useState("strength"); // "strength" or "cardio"
  const [cardioType, setCardioType] = useState("treadmill"); // Updated cardio types
  const [duration, setDuration] = useState(""); // in minutes
  const [distance, setDistance] = useState(""); // in km or miles
  const [distanceUnit, setDistanceUnit] = useState("km"); // "km" or "miles"
  const [intensity, setIntensity] = useState("moderate"); // "light", "moderate", "vigorous"
  const [speed, setSpeed] = useState(""); // optional - speed in km/h or mph
  const [incline, setIncline] = useState(""); // optional - incline for treadmill
  const [resistance, setResistance] = useState(""); // optional - resistance level
  const [isDistanceEdited, setIsDistanceEdited] = useState(false); // State to track if user manually edited distance

  // Edit and Delete States
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Snackbar and Alert States
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState(null);

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
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setWorkouts(workoutData);

      // BMI
      const bmiQuery = query(
        collection(db, "users", userId, "bodyMetrics"),
        orderBy("createdAt", "asc"),
      );

      const bmiSnap = await getDocs(bmiQuery);

      const bmiData = bmiSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const getFilteredChartData = () => {
    const now = new Date();
    let startDate;

    switch (chartFilter) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3months":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        // "all" - return all data
        return bmiEntries
          .slice()
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((entry) => ({
            date: entry.createdAt?.toDate?.() || new Date(entry.date),
            weight: entry.bodyweight,
            bmi: entry.bmi,
          }));
    }

    return bmiEntries
      .filter((entry) => {
        const entryDate = entry.createdAt?.toDate?.() || new Date(entry.date);
        return entryDate >= startDate;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((entry) => ({
        date: entry.createdAt?.toDate?.() || new Date(entry.date),
        weight: entry.bodyweight,
        bmi: entry.bmi,
      }));
  };

  // --- Workout ---
  const clearWorkoutForm = () => {
    setExercise("");
    setSets([{ setNumber: 1, reps: "", weight: "" }]);
    setWorkoutUnit("kg");
    setWorkoutDate("");
    setWorkoutType("strength");
    setCardioType("treadmill");
    setDuration("");
    setDistance("");
    setDistanceUnit("km");
    setIntensity("moderate");
    setSpeed("");
    setIncline("");
    setResistance("");
    setIsDistanceEdited(false); // Reset the edit flag
  };

  const clearIrrelevantCardioFields = (equipmentType) => {
    if (equipmentType !== "treadmill") {
      setDuration("");
      setIncline("");
    }
    if (!["treadmill", "cycle", "airbike"].includes(equipmentType)) {
      setDuration("");
      setSpeed("");
    }
    if (
      !["crosstrainer", "cycle", "airbike", "stairmaster", "rowing"].includes(
        equipmentType,
      )
    ) {
      setDuration("");
      setResistance("");
    }
  };

  const addSet = () => {
    setSets((prev) => [
      ...prev,
      { setNumber: prev.length + 1, reps: "", weight: "" },
    ]);
  };

  const removeSet = (index) => {
    if (sets.length === 1) return; // Keep at least one set
    const newSets = sets.filter((_, i) => i !== index);
    // Re-number sets
    setSets(
      newSets.map((set, idx) => ({
        ...set,
        setNumber: idx + 1,
      })),
    );
  };

  const updateSet = (index, field, value) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const calculateCardioCalories = () => {
    if (!duration || Number(duration) <= 0) return 0;

    // Parse values with decimals
    const dur = parseFloat(duration) || 0;
    const spd = parseFloat(speed) || 0;
    const inc = parseFloat(incline) || 0;
    const res = parseFloat(resistance) || 0;

    // Get user weight or use default
    const userWeight = latestBMIEntry?.bodyweight || 70;

    // Base MET values for different equipment
    let baseMET = 0;

    // More accurate intensity multipliers
    const intensityMultiplier =
      {
        light: 0.7,
        moderate: 1.0,
        vigorous: 1.4,
        max: 1.7,
      }[intensity] || 1.0;

    switch (cardioType) {
      case "treadmill":
        // More accurate treadmill MET calculation
        if (spd <= 0) {
          // If no speed, use intensity-based MET
          baseMET = 4.0; // Base walking MET
        } else if (spd < 4.0) {
          baseMET = 3.0 + (spd - 2.5) * 1.0; // 3-4.5 MET for walking 2.5-4 mph
        } else if (spd < 5.0) {
          baseMET = 4.5 + (spd - 4.0) * 2.0; // 4.5-6.5 MET for brisk walking
        } else if (spd < 7.0) {
          baseMET = 6.5 + (spd - 5.0) * 1.5; // 6.5-8.5 MET for jogging
        } else {
          baseMET = 8.5 + (spd - 7.0) * 1.0; // 8.5+ MET for running
        }

        // Adjust for incline: 0.1 MET per % incline
        if (inc > 0) {
          baseMET += inc * 0.1;
        }
        break;

      case "cycle":
        // Stationary bike with more granular calculation
        baseMET = 3.5; // Base
        if (spd > 0) {
          // MET increases with speed
          baseMET += spd * 0.3;
        }
        if (res > 0) {
          // Resistance adds to MET
          baseMET += res * 0.5;
        }
        break;

      case "crosstrainer":
        baseMET = 4.0 + res * 0.4;
        if (spd > 0) {
          baseMET += spd * 0.2;
        }
        break;

      case "airbike":
        baseMET = 5.0 + res * 0.6 + spd * 0.4;
        break;

      case "stairmaster":
        baseMET = 6.0 + res * 0.5;
        break;

      case "rowing":
        baseMET = 4.5 + res * 0.6 + spd * 0.3;
        break;

      default:
        baseMET = 5.0; // Generic cardio
    }

    // Apply intensity multiplier
    baseMET *= intensityMultiplier;

    // Ensure MET is reasonable (3-20 range)
    baseMET = Math.max(3, Math.min(baseMET, 20));

    // Calories = MET × weight (kg) × duration (hours)
    const calories = baseMET * userWeight * (dur / 60);

    return Math.round(calories);
  };

  const calculateAutoDistance = () => {
    const durNum = parseFloat(duration);
    const spdNum = parseFloat(speed);
    const incNum = parseFloat(incline) || 0;

    if (!durNum || durNum <= 0 || !spdNum || spdNum <= 0) return "";

    // Basic distance = Speed × Time (in hours)
    const durHours = durNum / 60;
    let dist = spdNum * durHours;

    // Adjust for incline: Incline increases effective distance
    // Formula: Actual distance = Flat distance × (1 + incline_factor)
    if (cardioType === "treadmill" && incNum > 0) {
      // For treadmill: 1% incline adds approximately 0.5-1% to effective distance
      // Using 0.8% per % incline as a reasonable estimate
      const inclineFactor = 1 + incNum * 0.008;
      dist *= inclineFactor;
    }

    // Round to 2 decimal places
    return Math.round(dist * 100) / 100;
  };

  useEffect(() => {
    if (workoutType === "cardio" && speed && duration) {
      const calculatedDist = calculateAutoDistance();
      if (calculatedDist && !isDistanceEdited) {
        setDistance(calculatedDist.toString());
      }
    } else if (workoutType === "cardio" && (!speed || !duration)) {
      // Clear distance if speed or duration is cleared
      if (!isDistanceEdited) {
        setDistance("");
      }
    }
  }, [speed, duration, incline, cardioType, workoutType, isDistanceEdited]);

  useEffect(() => {
    if (workoutType === "strength") {
      setIsDistanceEdited(false);
      setDistance("");
    }
  }, [workoutType]);

  const getCardioExerciseName = (cardioType) => {
    const exerciseMap = {
      treadmill: "Treadmill",
      crosstrainer: "Cross Trainer (Elliptical)",
      cycle: "Stationary Cycle",
      airbike: "Air Bike",
      stairmaster: "Stair Master",
      rowing: "Rowing Machine",
    };
    return exerciseMap[cardioType] || "Cardio";
  };

  const calculateTotalCalories = () => {
    if (workoutType === "cardio") {
      return calculateCardioCalories();
    }

    // Original strength training calculation
    return sets
      .reduce((total, set) => {
        const weightKg =
          workoutUnit === "lbs"
            ? Number(set.weight) * 0.453592
            : Number(set.weight);
        const calories = weightKg * Number(set.reps) * 0.1; // MET factor
        return total + (isNaN(calories) ? 0 : calories);
      }, 0)
      .toFixed(1);
  };

  const saveWorkout = async () => {
    if (!userId) return;

    // Validate based on workout type
    if (workoutType === "strength") {
      if (!exercise) {
        alert("Please enter an exercise name");
        return;
      }
      const hasEmptySets = sets.some((set) => !set.reps || !set.weight);
      if (hasEmptySets) {
        alert("Please fill in reps and weight for all sets");
        return;
      }
    } else if (workoutType === "cardio") {
      // For cardio, exercise should be auto-filled but validate anyway
      if (!exercise || exercise.trim() === "") {
        // Auto-fill if empty
        setExercise(getCardioExerciseName(cardioType));
      }

      if (!duration || Number(duration) <= 0) {
        alert("Please enter a valid duration (in minutes)");
        return;
      }

      // Auto-calculate distance if not provided but speed is
      if (!distance && speed && Number(speed) > 0) {
        const autoDist = calculateAutoDistance();
        if (autoDist) {
          setDistance(autoDist.toString());
          setIsDistanceEdited(false);
        }
      }
    }

    // Determine the date
    let selectedDate;
    if (editingWorkout) {
      // Keep the original date when editing
      selectedDate = editingWorkout.date;
    } else {
      // Use selected date or today
      selectedDate = workoutDate || new Date().toISOString().split("T")[0];
    }

    // Validate date - no future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);

    if (selectedDateObj > today) {
      alert(
        "Cannot add workouts for future dates. Please select today or a past date.",
      );
      return;
    }

    // Also validate date is not too far in the past (optional)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    if (selectedDateObj < oneYearAgo) {
      alert("Cannot add workouts older than 1 year.");
      return;
    }

    // Create payload based on workout type
    let payload;

    if (workoutType === "strength") {
      payload = {
        workoutType: "strength",
        exercise,
        sets: sets.map((set) => ({
          setNumber: set.setNumber,
          reps: Number(set.reps),
          weight:
            workoutUnit === "lbs"
              ? Number(set.weight) * 0.453592
              : Number(set.weight),
        })),
        totalReps: sets.reduce((sum, set) => sum + Number(set.reps || 0), 0),
        totalWeight: sets.reduce((sum, set) => {
          const weight =
            workoutUnit === "lbs"
              ? Number(set.weight) * 0.453592
              : Number(set.weight);
          return sum + (weight || 0);
        }, 0),
        calories: Number(calculateTotalCalories()),
        date: selectedDate,
        createdAt: serverTimestamp(),
      };
    } else {
      const cardioPayload = {
        workoutType: "cardio",
        exercise,
        cardioType,
        duration: Number(duration),
        distance: distance ? Number(distance) : null,
        distanceUnit,
        intensity,
        calories: Number(calculateTotalCalories()),
        date: selectedDate,
        createdAt: serverTimestamp(),
      };

      // Add cardio-specific fields only for relevant equipment
      if (
        cardioType === "treadmill" ||
        cardioType === "cycle" ||
        cardioType === "airbike"
      ) {
        cardioPayload.speed = speed ? Number(speed) : null;
      }

      if (cardioType === "treadmill") {
        cardioPayload.incline = incline ? Number(incline) : null;
        // Treadmill should NOT have resistance
        cardioPayload.resistance = null;
      }

      // Resistance only for specific machines (NOT treadmill)
      if (
        cardioType === "crosstrainer" ||
        cardioType === "cycle" ||
        cardioType === "airbike" ||
        cardioType === "stairmaster" ||
        cardioType === "rowing"
      ) {
        cardioPayload.resistance = resistance ? Number(resistance) : null;
      }

      // Clear fields that don't apply to the current equipment
      if (cardioType !== "treadmill") {
        cardioPayload.incline = null;
      }

      if (!["treadmill", "cycle", "airbike"].includes(cardioType)) {
        cardioPayload.speed = null;
      }

      if (
        !["crosstrainer", "cycle", "airbike", "stairmaster", "rowing"].includes(
          cardioType,
        )
      ) {
        cardioPayload.resistance = null;
      }

      payload = cardioPayload;
    }

    // OPTIMISTIC UPDATE
    if (editingWorkout) {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === editingWorkout.id ? { ...w, ...payload } : w,
        ),
      );
    } else {
      setWorkouts((prev) => [...prev, { id: "temp", ...payload }]);
    }

    try {
      if (editingWorkout) {
        await updateDoc(
          doc(db, "users", userId, "workouts", editingWorkout.id),
          payload,
        );
      } else {
        const docRef = await addDoc(
          collection(db, "users", userId, "workouts"),
          payload,
        );

        // Replace temp ID with real one
        setWorkouts((prev) =>
          prev.map((w) =>
            w.id === "temp" ? { id: docRef.id, ...payload } : w,
          ),
        );
      }

      clearWorkoutForm();
      setEditingWorkout(null);
      setOpenWorkout(false);
    } catch (err) {
      console.error("Save failed:", err);
      fetchData(); // restore from server
    }
  };

  const confirmDeleteWorkout = async () => {
    if (!userId || !deleteTarget) return;

    // Optimistic UI
    setWorkouts((prev) => prev.filter((w) => w.id !== deleteTarget.id));

    const deleted = deleteTarget;
    setDeleteTarget(null);

    try {
      await deleteDoc(doc(db, "users", userId, "workouts", deleted.id));
    } catch (err) {
      console.error("Delete failed, reverting:", err);
      setWorkouts((prev) => [...prev, deleted]); // rollback
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted || !userId) return;

    const { id, ...data } = lastDeleted;

    await setDoc(doc(db, "users", userId, "workouts", id), data);
    setLastDeleted(null);
    setSnackbarOpen(false);
    fetchData();
  };

  const openEditWorkout = (row) => {
    setEditingWorkout(row);

    if (row.workoutType === "cardio") {
      setWorkoutType("cardio");
      setCardioType(row.cardioType || "treadmill");
      setExercise(row.exercise || getCardioExerciseName(row.cardioType));
      setDuration(row.duration?.toString() || "");
      setDistance(row.distance?.toString() || "");
      setDistanceUnit(row.distanceUnit || "km");
      setIntensity(row.intensity || "moderate");

      // Only set speed for relevant equipment
      if (
        row.cardioType === "treadmill" ||
        row.cardioType === "cycle" ||
        row.cardioType === "airbike"
      ) {
        setSpeed(row.speed?.toString() || "");
      } else {
        setSpeed("");
      }

      // Only set incline for treadmill
      if (row.cardioType === "treadmill") {
        setIncline(row.incline?.toString() || "");
      } else {
        setIncline("");
      }

      // Only set resistance for relevant equipment (NOT treadmill)
      if (
        row.cardioType === "crosstrainer" ||
        row.cardioType === "cycle" ||
        row.cardioType === "airbike" ||
        row.cardioType === "stairmaster" ||
        row.cardioType === "rowing"
      ) {
        setResistance(row.resistance?.toString() || "");
      } else {
        setResistance("");
      }
    } else {
      // Handle both old and new data formats
      if (row.sets && row.sets.length > 0) {
        // New format with multiple sets
        setSets(row.sets);
      } else {
        // Old format - convert to new format
        setSets([
          {
            setNumber: 1,
            reps: row.reps || "",
            weight: row.weight || "",
          },
        ]);
      }
      setWorkoutType("strength");
      setWorkoutUnit("kg");
    }

    setOpenWorkout(true);
  };

  const isToday = (date) => {
    const d = new Date(date);
    const t = new Date();
    d.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    return d.getTime() === t.getTime();
  };

  // Filtered workouts
  const getFilteredWorkouts = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      workoutDate.setHours(0, 0, 0, 0);

      if (workoutFilter === "today") {
        return workoutDate.getTime() === now.getTime();
      }

      if (workoutFilter === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return workoutDate >= weekAgo;
      }

      if (workoutFilter === "month") {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        return workoutDate >= monthAgo;
      }

      return true;
    });
  };

  const getWorkoutsByWeekday = () => {
    const filtered = getFilteredWorkouts();

    if (!["today", "week", "month"].includes(workoutFilter)) {
      return { All: filtered };
    }

    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Initialize grouped object
    const grouped = {};
    days.forEach((day) => (grouped[day] = []));

    filtered.forEach((w) => {
      const parseLocalDate = (dateStr) => new Date(dateStr + "T00:00:00");
      const d = parseLocalDate(w.date);
      grouped[days[d.getDay()]].push(w);
    });

    return grouped;
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expectedDate = new Date(today);

  // Check if there's a workout today
  const hasWorkoutToday = sortedWorkouts.some((w) => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  // If no workout today, start from yesterday
  if (!hasWorkoutToday) {
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  for (let i = sortedWorkouts.length - 1; i >= 0; i--) {
    const workoutDate = new Date(sortedWorkouts[i].date);
    workoutDate.setHours(0, 0, 0, 0);

    if (workoutDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (workoutDate.getTime() < expectedDate.getTime()) {
      break;
    }
  }

  const shouldShowStreakReminder = () => {
    if (streak < 1) return false;

    const now = new Date();
    const hour = now.getHours();

    if (hour < 18) return false; // before 6 PM

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workedOutToday = workouts.some((w) => {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    return !workedOutToday;
  };

  const showStreakReminder = shouldShowStreakReminder();

  // Calories burned filter
  const [calorieFilter, setCalorieFilter] = useState("week"); // "week" or "month"
  const [anchorEl, setAnchorEl] = useState(null);

  // Calories Burned calculation
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

  const actions = [
    {
      icon: <ScaleIcon />,
      name: "Add/Update BMI",
      onClick: () => setOpenBMI(true),
    },
    {
      icon: <FitnessCenterIcon />,
      name: "Add Workout",
      onClick: () => setOpenWorkout(true),
    },
  ];

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

      {/* Streak Reminder */}
      {showStreakReminder && (
        <Card
          sx={{
            mb: 3,
            borderLeft: "6px solid",
            borderColor: "warning.main",
            backgroundColor: "warning.light",
          }}
        >
          <CardContent>
            <Typography fontWeight="bold">
              🔔 Don't lose your streak!
            </Typography>
            <Typography variant="body2">
              You haven't logged a workout today. Log one before midnight to
              keep your streak alive 🔥
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, sm: 2.3 }}>
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

        <Grid size={{ xs: 12, sm: 1.8 }}>
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

        <Grid size={{ xs: 12, sm: 2.2 }}>
          <Card
            variant="outlined"
            sx={{ display: "flex", alignItems: "center", p: 2, gap: 1 }}
          >
            <BarChartIcon
              sx={{ color: getBMIColor(latestBMIEntry.bmi) }}
              fontSize="large"
            />
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

        <Grid size={{ xs: 12, sm: 2 }}>
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

        <Grid size={{ xs: 12, sm: 3 }}>
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
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6">Weight & BMI Progress</Typography>

          {/* Chart Filter Buttons */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant={chartFilter === "week" ? "contained" : "outlined"}
              onClick={() => setChartFilter("week")}
            >
              Last 7 days
            </Button>
            <Button
              size="small"
              variant={chartFilter === "month" ? "contained" : "outlined"}
              onClick={() => setChartFilter("month")}
            >
              Last 30 days
            </Button>
            <Button
              size="small"
              variant={chartFilter === "3months" ? "contained" : "outlined"}
              onClick={() => setChartFilter("3months")}
            >
              Last 90 days
            </Button>
            <Button
              size="small"
              variant={chartFilter === "all" ? "contained" : "outlined"}
              onClick={() => setChartFilter("all")}
            >
              All time
            </Button>
          </Box>
        </Box>

        {/* Statistics Summary */}
        {getFilteredChartData().length > 0 && (
          <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Starting Weight
              </Typography>
              <Typography variant="h6" color="primary">
                {getFilteredChartData()[0]?.weight?.toFixed(1) || "--"} kg
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Weight
              </Typography>
              <Typography variant="h6" color="primary">
                {getFilteredChartData()[
                  getFilteredChartData().length - 1
                ]?.weight?.toFixed(1) || "--"}{" "}
                kg
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Change
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color:
                    getFilteredChartData()[0]?.weight <
                    getFilteredChartData()[getFilteredChartData().length - 1]
                      ?.weight
                      ? "error.main"
                      : "success.main",
                }}
              >
                {getFilteredChartData().length > 1
                  ? `${(getFilteredChartData()[getFilteredChartData().length - 1]?.weight - getFilteredChartData()[0]?.weight).toFixed(1)} kg`
                  : "-- kg"}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Show message if no data for selected period */}
        {getFilteredChartData().length === 0 ? (
          <Box
            sx={{
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary">
              {chartFilter === "all"
                ? "No BMI data available. Add your first BMI entry!"
                : `No BMI data available for the selected period (${chartFilter}).`}
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={getFilteredChartData()}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(new Date(date), "d-MM-yy")}
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
                    ? [`${Number(value).toFixed(1)} kg`, "Weight"]
                    : [Number(value).toFixed(1), "BMI"]
                }
                labelFormatter={(label) =>
                  format(new Date(label), "dd-MM-yyyy")
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="weight"
                stroke="#1976d2"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Weight"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bmi"
                stroke="#2e7d32"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="BMI"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Workout Table */}
      <Card variant="outlined" sx={{ p: 3, mb: 10 }}>
        <Typography variant="h6" mb={2}>
          Workout History
        </Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Button
            variant={workoutFilter === "today" ? "contained" : "outlined"}
            onClick={() => setWorkoutFilter("today")}
          >
            Today
          </Button>

          <Button
            variant={workoutFilter === "week" ? "contained" : "outlined"}
            onClick={() => setWorkoutFilter("week")}
          >
            This Week
          </Button>

          <Button
            variant={workoutFilter === "month" ? "contained" : "outlined"}
            onClick={() => setWorkoutFilter("month")}
          >
            This Month
          </Button>

          <Button
            variant={workoutFilter === "all" ? "contained" : "outlined"}
            onClick={() => setWorkoutFilter("all")}
          >
            All
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Exercise</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Total Reps</TableCell>
                <TableCell>Total Weight (kg)</TableCell>
                <TableCell>Calories</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* No workouts found message */}
              {getFilteredWorkouts().length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No workouts found for this period 💤
                  </TableCell>
                </TableRow>
              )}

              {Object.entries(getWorkoutsByWeekday()).map(
                ([day, workouts]) =>
                  workouts.length > 0 && (
                    <React.Fragment key={day}>
                      {/* Day header row */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "#f0f0f0",
                          }}
                        >
                          {day}
                        </TableCell>
                      </TableRow>

                      {/* Workout rows */}
                      {getFilteredWorkouts().map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            {format(parseISO(row.date), "dd-MM-yyyy")}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2">
                                {row.exercise || "--"}
                              </Typography>
                              {row.workoutType === "cardio"}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {row.workoutType === "strength" ? (
                              row.sets ? (
                                <Box>
                                  <Typography variant="body2">
                                    {row.sets.length} sets
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {row.sets.map((set, idx) => (
                                      <span key={idx}>
                                        {set.reps}×{set.weight?.toFixed(1)}
                                        {idx < row.sets.length - 1 ? ", " : ""}
                                      </span>
                                    ))}
                                  </Typography>
                                </Box>
                              ) : (
                                "--"
                              )
                            ) : (
                              <Box>
                                <Typography variant="body2">
                                  {row.duration} min
                                  {/* Show speed only for relevant equipment */}
                                  {row.speed &&
                                    (row.cardioType === "treadmill" ||
                                      row.cardioType === "cycle" ||
                                      row.cardioType === "airbike") &&
                                    ` • ${row.speed} ${row.cardioType === "treadmill" ? "km/h" : "RPM"}`}
                                  {/* Show incline only for treadmill */}
                                  {row.incline &&
                                    row.cardioType === "treadmill" &&
                                    ` • ${row.incline}% incline`}
                                  {/* Show resistance only for specific equipment (NOT treadmill) */}
                                  {row.resistance &&
                                    (row.cardioType === "crosstrainer" ||
                                      row.cardioType === "cycle" ||
                                      row.cardioType === "airbike" ||
                                      row.cardioType === "stairmaster" ||
                                      row.cardioType === "rowing") &&
                                    ` • Level ${row.resistance}`}
                                </Typography>
                                {row.distance && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {row.distance} {row.distanceUnit}
                                  </Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  display="block"
                                  color="text.secondary"
                                >
                                  {row.intensity} intensity
                                </Typography>
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.workoutType === "strength"
                              ? row.totalReps || "--"
                              : "--"}
                          </TableCell>
                          <TableCell>
                            {row.workoutType === "strength"
                              ? row.totalWeight?.toFixed(1) || "--"
                              : "--"}
                          </TableCell>
                          <TableCell>{row.calories || "--"}</TableCell>
                          <TableCell>
                            <IconButton
                              disabled={!isToday(row.date)}
                              size="small"
                              color="primary"
                              onClick={() => openEditWorkout(row)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              disabled={!isToday(row.date)}
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(row)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ),
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <DialogTitle>Delete Workout</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{deleteTarget?.exercise}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteWorkout}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={undoDelete}>
              UNDO
            </Button>
          }
        >
          Workout deleted
        </Alert>
      </Snackbar>

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
              margin="dense"
            />
            <TextField
              select
              label="Unit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              sx={{ width: 100 }}
              margin="dense"
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
                margin="dense"
              />
            ) : (
              <>
                <TextField
                  label="Feet"
                  type="number"
                  value={heightFt}
                  onChange={(e) => setHeightFt(e.target.value)}
                  sx={{ width: 100 }}
                  margin="dense"
                />
                <TextField
                  label="Inches"
                  type="number"
                  value={heightIn}
                  onChange={(e) => setHeightIn(e.target.value)}
                  sx={{ width: 100 }}
                  margin="dense"
                />
              </>
            )}
            <TextField
              select
              label="Unit"
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value)}
              sx={{ width: 100 }}
              margin="dense"
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
          setEditingWorkout(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingWorkout ? "Edit Workout" : "Add Workout"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* Date Picker */}
          {!editingWorkout && (
            <TextField
              label="Workout Date"
              type="date"
              value={workoutDate || new Date().toISOString().split("T")[0]}
              onChange={(e) => setWorkoutDate(e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                max: new Date().toISOString().split("T")[0], // Prevent future dates
              }}
              helperText={
                workoutDate === new Date().toISOString().split("T")[0] ||
                !workoutDate
                  ? "Today"
                  : `Logging for ${format(new Date(workoutDate), "dd-MM-yyyy")}`
              }
            />
          )}

          {/* If editing, show the date as read-only */}
          {editingWorkout && (
            <TextField
              label="Workout Date"
              value={format(parseISO(editingWorkout.date), "dd-MM-yyyy")}
              fullWidth
              margin="normal"
              InputProps={{
                readOnly: true,
              }}
              disabled
              helperText="Date cannot be changed for existing workouts"
            />
          )}

          {/* Exercise Name */}
          <TextField
            label="Exercise Name"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            fullWidth
            margin="normal"
            helperText="e.g., Bench Press, Running, Cycling"
          />

          {/* Workout Type Toggle */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Button
              fullWidth
              variant={workoutType === "strength" ? "contained" : "outlined"}
              onClick={() => {
                setWorkoutType("strength");
                setExercise(""); // Clear exercise for strength
              }}
            >
              💪 Strength Training
            </Button>
            <Button
              fullWidth
              variant={workoutType === "cardio" ? "contained" : "outlined"}
              onClick={() => {
                setWorkoutType("cardio");
                // Auto-set exercise name based on default cardio type (treadmill)
                setExercise(getCardioExerciseName(cardioType));
              }}
            >
              🏃 Cardio
            </Button>
          </Box>

          {/* Strength Training Form */}
          {workoutType === "strength" && (
            <>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ mr: 2 }}>
                  Weight Unit:
                </Typography>
                <ButtonGroup size="small">
                  <Button
                    variant={workoutUnit === "kg" ? "contained" : "outlined"}
                    onClick={() => setWorkoutUnit("kg")}
                  >
                    kg
                  </Button>
                  <Button
                    variant={workoutUnit === "lbs" ? "contained" : "outlined"}
                    onClick={() => setWorkoutUnit("lbs")}
                  >
                    lbs
                  </Button>
                </ButtonGroup>
              </Box>

              {/* Sets Header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: 2,
                  mb: 1,
                  alignItems: "center",
                }}
              >
                <Typography variant="subtitle2">Set</Typography>
                <Typography variant="subtitle2">Reps</Typography>
                <Typography variant="subtitle2">
                  Weight ({workoutUnit})
                </Typography>
                <Typography variant="subtitle2">Action</Typography>
              </Box>

              {/* Dynamic Sets */}
              {sets.map((set, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr auto",
                    gap: 2,
                    mb: 2,
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body1">#{set.setNumber}</Typography>
                  <TextField
                    type="number"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => updateSet(index, "reps", e.target.value)}
                    size="small"
                  />
                  <TextField
                    type="number"
                    placeholder="Weight"
                    value={set.weight}
                    onChange={(e) => updateSet(index, "weight", e.target.value)}
                    size="small"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {workoutUnit}
                        </InputAdornment>
                      ),
                    }}
                  />
                  <IconButton
                    onClick={() => removeSet(index)}
                    disabled={sets.length === 1}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              {/* Add Set Button */}
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSet}
                sx={{ mt: 1, mb: 3 }}
              >
                Add Another Set
              </Button>
            </>
          )}

          {/* Cardio Form */}
          {workoutType === "cardio" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Cardio Type - Gym Equipment */}
              <TextField
                select
                label="Equipment Type"
                value={cardioType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setCardioType(newType);
                  // Always update exercise name when equipment changes
                  setExercise(getCardioExerciseName(newType));

                  // Clear fields that don't apply to the new equipment type
                  clearIrrelevantCardioFields(newType);

                  // Clear fields that don't apply to the new equipment type
                  if (newType !== "treadmill") {
                    setIncline("");
                  }
                  if (!["treadmill", "cycle", "airbike"].includes(newType)) {
                    setSpeed("");
                  }
                  if (
                    ![
                      "crosstrainer",
                      "cycle",
                      "airbike",
                      "stairmaster",
                      "rowing",
                    ].includes(newType)
                  ) {
                    setResistance("");
                  }
                }}
                fullWidth
                margin="normal"
              >
                <MenuItem value="treadmill">Treadmill</MenuItem>
                <MenuItem value="crosstrainer">
                  Cross Trainer (Elliptical)
                </MenuItem>
                <MenuItem value="cycle">Stationary Cycle</MenuItem>
                <MenuItem value="airbike">Air Bike</MenuItem>
                <MenuItem value="stairmaster">Stair Master</MenuItem>
                <MenuItem value="rowing">Rowing Machine</MenuItem>
              </TextField>

              {/* Duration (Always Required) */}
              <TextField
                label="Duration (minutes)"
                type="number"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                }}
                fullWidth
                required
                margin="normal"
                inputProps={{
                  step: "0.5", // Allow half-minute increments
                }}
              />

              {/* Speed (Optional for Treadmill, Cycle, Air Bike) */}
              {(cardioType === "treadmill" ||
                cardioType === "cycle" ||
                cardioType === "airbike") && (
                <TextField
                  label="Speed"
                  type="number"
                  value={speed}
                  onChange={(e) => {
                    setSpeed(e.target.value);
                  }}
                  fullWidth
                  placeholder="e.g., 6.5, 8.2"
                  margin="normal"
                  inputProps={{
                    step: "0.1",
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {cardioType === "treadmill" ? "km/h" : "RPM"}
                      </InputAdornment>
                    ),
                  }}
                />
              )}

              {/* Incline (Specific to Treadmill) */}
              {cardioType === "treadmill" && (
                <TextField
                  label="Incline (%)"
                  type="number"
                  value={incline}
                  onChange={(e) => {
                    setIncline(e.target.value);
                  }}
                  fullWidth
                  placeholder="0 for flat"
                  margin="normal"
                  inputProps={{
                    step: "0.5",
                    min: "0",
                    max: "15",
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                />
              )}

              {/* Distance (Optional) */}
              <TextField
                label="Distance"
                type="number"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setIsDistanceEdited(true); // Mark as manually edited
                }}
                fullWidth
                margin="normal"
                inputProps={{
                  step: "0.01",
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <TextField
                        select
                        value={distanceUnit}
                        onChange={(e) => setDistanceUnit(e.target.value)}
                        variant="standard"
                        sx={{ width: 80 }}
                      >
                        <MenuItem value="km">km</MenuItem>
                        <MenuItem value="miles">miles</MenuItem>
                      </TextField>
                    </InputAdornment>
                  ),
                }}
              />

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mt: -1,
                  mb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Distance auto-calculates from speed, duration, and incline
                </Typography>
                {isDistanceEdited && distance && (
                  <Button
                    size="small"
                    onClick={() => {
                      setIsDistanceEdited(false);
                      const calculatedDist = calculateAutoDistance();
                      if (calculatedDist) {
                        setDistance(calculatedDist.toString());
                      }
                    }}
                  >
                    Reset to Auto
                  </Button>
                )}
              </Box>

              {/* Resistance (For machines with resistance levels) */}
              {(cardioType === "crosstrainer" ||
                cardioType === "cycle" ||
                cardioType === "airbike" ||
                cardioType === "stairmaster" ||
                cardioType === "rowing") && (
                <TextField
                  label="Resistance Level"
                  type="number"
                  value={resistance}
                  onChange={(e) => setResistance(e.target.value)}
                  fullWidth
                  placeholder="Optional"
                  margin="normal"
                  helperText="1-10 or machine specific level"
                />
              )}

              {/* Intensity Level */}
              <TextField
                select
                label="Intensity Level"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
                fullWidth
                margin="normal"
              >
                <MenuItem value="light">Light (30-50% max effort)</MenuItem>
                <MenuItem value="moderate">
                  Moderate (50-70% max effort)
                </MenuItem>
                <MenuItem value="vigorous">
                  Vigorous (70-85% max effort)
                </MenuItem>
                <MenuItem value="max">Maximum (85-100% max effort)</MenuItem>
              </TextField>
            </Box>
          )}

          {/* Total Calories */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1">
              Estimated Calories Burned:
            </Typography>
            <Typography variant="h6" color="success.main">
              {calculateTotalCalories()} cal
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setOpenWorkout(false);
              clearWorkoutForm();
              setEditingWorkout(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveWorkout}
            disabled={
              workoutType === "strength"
                ? !exercise || sets.some((s) => !s.reps || !s.weight)
                : !duration || Number(duration) <= 0 // Cardio only needs duration
            }
          >
            {editingWorkout ? "Update Workout" : "Add Workout"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
