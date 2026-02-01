import React from "react";
import { useState, useEffect } from "react";
import { db, auth, enableOfflineSupport, isOnline } from "../firebase";
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
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import ScaleIcon from "@mui/icons-material/Scale";
import BarChartIcon from "@mui/icons-material/BarChart";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import IconButton from "@mui/material/IconButton";
import { ListItemIcon, ListItemText } from "@mui/material";
import SyncIcon from "@mui/icons-material/Sync";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import BedIcon from "@mui/icons-material/Bed";
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
  const [speedUnit, setSpeedUnit] = useState("km/h"); // "km/h" or "mph"
  const [distance, setDistance] = useState(""); // in km or miles
  const [distanceUnit, setDistanceUnit] = useState("km"); // "km" or "miles"
  const [intensity, setIntensity] = useState("moderate"); // "light", "moderate", "vigorous"
  const [isDistanceEdited, setIsDistanceEdited] = useState(false); // State to track if user manually edited distance

  // Table styles
  const tableStyles = {
    "& .MuiTableRow-root:hover": {
      backgroundColor: "#fafafa",
    },
    "& .MuiTableCell-root": {
      py: 1.5,
    },
    "& .MuiChip-root": {
      maxWidth: "100%",
    },
  };

  // Cardio Session States
  const [cardioSessions, setCardioSessions] = useState([
    { id: 1, duration: "", speed: "", incline: "", resistance: "" },
  ]);
  const [sessionCount, setSessionCount] = useState(1);

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

  // Sync State
  const [isOffline, setIsOffline] = useState(false);
  const [hasPersistentData, setHasPersistentData] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localCache, setLocalCache] = useState({
    workouts: [],
    bmiEntries: [],
    profile: null,
  });

  // Rest Day State
  const [restDays, setRestDays] = useState([]);

  const addRestDay = async (date = new Date().toISOString().split("T")[0]) => {
    if (!userId) return;

    try {
      const networkAvailable = isOnline();

      // Create the data object (without id for Firestore)
      const restDayData = {
        type: "rest",
        date,
        createdAt: networkAvailable ? serverTimestamp() : new Date(),
        notes: "Rest day",
      };

      if (networkAvailable) {
        // Online - save to Firestore
        const docRef = await addDoc(
          collection(db, "users", userId, "workouts"),
          restDayData,
        );

        // Update local state with the real Firestore ID
        const newRestDay = {
          id: docRef.id,
          ...restDayData,
          createdAt: restDayData.createdAt.toDate
            ? restDayData.createdAt.toDate()
            : new Date(),
        };

        setWorkouts((prev) => [...prev, newRestDay]);
        setRestDays((prev) => [...prev, date]);

        // Update cache with real ID
        const updatedWorkouts = [...workouts, newRestDay];
        localStorage.setItem("cachedWorkouts", JSON.stringify(updatedWorkouts));
      } else {
        // Offline - generate a consistent temporary ID
        const tempId = `offline-rest-${date}-${Date.now()}`;

        // Add to sync queue
        setSyncQueue((prev) => [
          ...prev,
          {
            type: "addWorkout",
            data: restDayData,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Optimistic update with consistent temp ID
        const tempRestDay = {
          id: tempId,
          ...restDayData,
        };

        setWorkouts((prev) => [...prev, tempRestDay]);
        setRestDays((prev) => [...prev, date]);

        // Update cache with temp ID
        const cachedWorkouts = JSON.parse(
          localStorage.getItem("cachedWorkouts") || "[]",
        );
        cachedWorkouts.push(tempRestDay);
        localStorage.setItem("cachedWorkouts", JSON.stringify(cachedWorkouts));

        alert("✅ Rest day logged locally. Will sync when online.");
      }

      setSnackbarMessage("Rest day added successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Error adding rest day:", err);
      setSnackbarMessage("Failed to add rest day");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  // Listen to auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return () => unsub();
  }, []);

  // Offline support initialization and network listener
  useEffect(() => {
    // Offline support initialization and network listener
    const initializeOfflineSupport = async () => {
      try {
        await enableOfflineSupport();

        // Check if we have cached data in localStorage (for our custom cache)
        const cachedWorkouts = localStorage.getItem("cachedWorkouts");
        const cachedBMI = localStorage.getItem("cachedBMI");
        const cachedProfile = localStorage.getItem("cachedProfile");

        if (cachedWorkouts || cachedBMI || cachedProfile) {
          setHasPersistentData(true);
        }
      } catch (err) {
        console.error("Error initializing offline support:", err);
      }
    };

    initializeOfflineSupport();

    // Set up network status listeners
    const handleOnline = () => {
      setIsOffline(false);
      // Try to sync queued operations when coming back online
      if (syncQueue.length > 0) {
        processSyncQueue();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Set initial network status
    setIsOffline(!isOnline());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  // Fetch Profile with offline support
  const fetchProfile = async () => {
    if (!userId) return;
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const p = snap.data();
        setProfile(p);

        // Cache profile
        localStorage.setItem("cachedProfile", JSON.stringify(p));
        setLocalCache((prev) => ({ ...prev, profile: p }));

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

      // Try to load from cache
      if (isOffline || err.code === "unavailable") {
        const cachedProfile = localStorage.getItem("cachedProfile");
        if (cachedProfile) {
          const p = JSON.parse(cachedProfile);
          setProfile(p);
          // Apply height settings from cache
          if (p.heightUnit === "cm") {
            setHeightCm(p.heightCm || "");
            setHeightUnit("cm");
          } else if (p.heightUnit === "ft/in") {
            setHeightFt(p.heightFt || "");
            setHeightIn(p.heightIn || "");
            setHeightUnit("ft/in");
          }
        }
      }
    }
  };

  // Process queued operations when back online
  const processSyncQueue = async () => {
    if (!userId || !syncQueue.length || isSyncing) return;

    setIsSyncing(true);

    try {
      const processedOperations = [];

      for (const operation of syncQueue) {
        switch (operation.type) {
          case "addWorkout":
            const docRef = await addDoc(
              collection(db, "users", userId, "workouts"),
              operation.data,
            );

            // Update local cache with real Firestore ID
            const cachedWorkouts = JSON.parse(
              localStorage.getItem("cachedWorkouts") || "[]",
            );
            const tempWorkoutIndex = cachedWorkouts.findIndex(
              (w) =>
                w.date === operation.data.date &&
                w.type === operation.data.type &&
                w.id &&
                w.id.startsWith("offline-"),
            );

            if (tempWorkoutIndex !== -1) {
              cachedWorkouts[tempWorkoutIndex].id = docRef.id;
              localStorage.setItem(
                "cachedWorkouts",
                JSON.stringify(cachedWorkouts),
              );

              // Update state with real ID
              setWorkouts((prev) =>
                prev.map((w) =>
                  w.date === operation.data.date &&
                  w.type === operation.data.type &&
                  w.id &&
                  w.id.startsWith("offline-")
                    ? { ...w, id: docRef.id }
                    : w,
                ),
              );
            }
            break;

          case "updateWorkout":
            await updateDoc(
              doc(db, "users", userId, "workouts", operation.id),
              operation.data,
            );
            break;

          case "deleteWorkout":
            await deleteDoc(doc(db, "users", userId, "workouts", operation.id));
            break;

          case "addBMI":
            await addDoc(
              collection(db, "users", userId, "bodyMetrics"),
              operation.data,
            );
            break;

          case "updateProfile":
            await setDoc(doc(db, "users", userId), operation.data, {
              merge: true,
            });
            break;
        }

        processedOperations.push(operation);
      }

      // Remove processed operations from queue
      setSyncQueue((prev) =>
        prev.filter(
          (op) =>
            !processedOperations.some(
              (processed) =>
                processed.timestamp === op.timestamp &&
                processed.type === op.type,
            ),
        ),
      );

      // Refresh data from server
      await fetchData();

      setSnackbarMessage("Sync completed successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Error syncing queued operations:", err);
      setSnackbarMessage("Sync failed. Will retry later.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear cache function
  const clearLocalCache = () => {
    if (
      window.confirm(
        "Clear all locally cached data?\n\n" +
          "This will remove: \n" +
          "• Cached workouts\n" +
          "• Cached BMI data\n" +
          "• Cached profile\n" +
          "• Sync queue\n\n" +
          "You'll need internet connection to reload data.",
      )
    ) {
      // Clear localStorage
      localStorage.removeItem("cachedWorkouts");
      localStorage.removeItem("cachedBMI");
      localStorage.removeItem("cachedProfile");

      // Clear sync queue
      setSyncQueue([]);

      // Update state
      setHasPersistentData(false);

      // Show success message in snackbar
      setSnackbarMessage("Cache cleared successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // If online, fetch fresh data
      if (isOnline()) {
        fetchData();
      }
    }
  };

  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [cacheMenuAnchor, setCacheMenuAnchor] = useState(null);

  // Fetch Data with offline support
  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Try to fetch from network first
      const networkAvailable = isOnline();

      // Workouts
      const workoutSnap = await getDocs(
        collection(db, "users", userId, "workouts"),
      );
      const workoutData = workoutSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Extract rest days
      const restDays = workoutData
        .filter((w) => w.type === "rest")
        .map((w) => w.date);

      setRestDays(restDays);

      // Cache the data locally
      localStorage.setItem("cachedWorkouts", JSON.stringify(workoutData));
      setWorkouts(workoutData);
      setLocalCache((prev) => ({ ...prev, workouts: workoutData }));

      // BMI
      const bmiQuery = query(
        collection(db, "users", userId, "bodyMetrics"),
        orderBy("createdAt", "asc"),
      );

      const bmiSnap = await getDocs(bmiQuery);

      const bmiData = bmiSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Cache BMI data
      localStorage.setItem("cachedBMI", JSON.stringify(bmiData));
      setBmiEntries(bmiData);
      setLocalCache((prev) => ({ ...prev, bmiEntries: bmiData }));
    } catch (err) {
      console.error("Error fetching data from network:", err);

      // If network fails, try to load from cache
      if (isOffline || err.code === "unavailable") {
        console.log("Loading from cache...");

        try {
          // Load workouts from cache
          const cachedWorkouts = localStorage.getItem("cachedWorkouts");
          if (cachedWorkouts) {
            const workoutData = JSON.parse(cachedWorkouts);
            setWorkouts(workoutData);

            // Extract rest days from cache
            const restDays = workoutData
              .filter((w) => w.type === "rest")
              .map((w) => w.date);
            setRestDays(restDays);
          }

          // Load BMI from cache
          const cachedBMI = localStorage.getItem("cachedBMI");
          if (cachedBMI) {
            const bmiData = JSON.parse(cachedBMI);
            setBmiEntries(bmiData);
          }

          setHasPersistentData(true);
        } catch (cacheErr) {
          console.error("Error loading from cache:", cacheErr);
        }
      }
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
      const networkAvailable = isOnline();
      const bmiData = {
        bodyweight:
          weightUnit === "lbs" ? Number(weight) * 0.453592 : Number(weight),
        height:
          heightUnit === "cm"
            ? Number(heightCm) || null
            : (Number(heightFt) * 12 + Number(heightIn)) * 2.54 || null,
        bmi: Number(bmi),
        createdAt: networkAvailable ? serverTimestamp() : new Date(),
        date: new Date().toISOString().split("T")[0],
      };

      // Save height permanently
      const heightData =
        heightUnit === "cm" && heightCm
          ? { heightUnit: "cm", heightCm }
          : { heightUnit: "ft/in", heightFt, heightIn };

      if (networkAvailable) {
        // Online - save to Firestore
        await addDoc(collection(db, "users", userId, "bodyMetrics"), bmiData);

        await setDoc(doc(db, "users", userId), heightData, { merge: true });

        // Update local cache
        const updatedBMI = [...bmiEntries, { id: "temp", ...bmiData }];
        localStorage.setItem("cachedBMI", JSON.stringify(updatedBMI));
      } else {
        // Offline - queue for sync
        setSyncQueue((prev) => [
          ...prev,
          {
            type: "addBMI",
            data: bmiData,
            timestamp: new Date().toISOString(),
          },
          {
            type: "updateProfile",
            data: heightData,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Update local state optimistically
        setBmiEntries((prev) => [...prev, { id: "temp-offline", ...bmiData }]);
        setProfile((prev) => ({ ...prev, ...heightData }));

        alert("✅ BMI entry saved locally. Will sync when online.");
      }

      clearBMIForm();
      setOpenBMI(false);
      if (networkAvailable) fetchData();
    } catch (err) {
      console.error("Error adding BMI:", err);
      if (!isOffline) {
        alert("Error saving BMI entry. Please try again.");
      }
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

    // For filtered periods, return only entries within the period
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

  // Get starting and current weight from all data
  const getWeightStats = () => {
    if (bmiEntries.length === 0) {
      return {
        startingWeight: null,
        currentWeight: null,
        change: null,
      };
    }

    // Sort all entries by date (oldest first)
    const sortedEntries = [...bmiEntries].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    // Get the absolute starting weight (oldest entry)
    const startingWeight = sortedEntries[0]?.bodyweight;

    // Get the absolute current weight (latest entry)
    const currentWeight = sortedEntries[sortedEntries.length - 1]?.bodyweight;

    const change =
      currentWeight && startingWeight ? currentWeight - startingWeight : null;

    return {
      startingWeight,
      currentWeight,
      change,
    };
  };

  // --- Workout ---
  const clearWorkoutForm = () => {
    setExercise("");
    setSets([{ setNumber: 1, reps: "", weight: "" }]);
    setWorkoutUnit("kg");
    setWorkoutDate("");
    setWorkoutType("strength");
    setCardioType("treadmill");
    setDistance("");
    setDistanceUnit("km");
    setIntensity("moderate");
    setIsDistanceEdited(false); // Reset the edit flag
    // Always reset to one session
    setCardioSessions([
      { id: 1, duration: "", speed: "", incline: "", resistance: "" },
    ]);
    setSessionCount(1);
    // Reset speed unit to default
    setSpeedUnit("km/h");
  };

  // Add cardio session
  const addCardioSession = () => {
    const newSessionCount = sessionCount + 1;
    setSessionCount(newSessionCount);
    setCardioSessions((prev) => [
      ...prev,
      {
        id: newSessionCount,
        duration: "",
        speed: "",
        incline: "",
        resistance: "",
      },
    ]);
  };

  // Remove cardio session
  const removeCardioSession = (id) => {
    if (cardioSessions.length <= 1) return;
    setCardioSessions((prev) => prev.filter((session) => session.id !== id));
  };

  // Update cardio session
  const updateCardioSession = (id, field, value) => {
    setCardioSessions((prev) =>
      prev.map((session) =>
        session.id === id ? { ...session, [field]: value } : session,
      ),
    );
  };

  // Calculate totals from all sessions
  const calculateCardioTotals = () => {
    let totalDuration = 0;
    let totalDistance = 0;
    let avgSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    cardioSessions.forEach((session) => {
      const dur = parseFloat(session.duration) || 0;
      const spd = parseFloat(session.speed) || 0;

      totalDuration += dur;

      if (dur > 0 && spd > 0) {
        const sessionDistance = spd * (dur / 60);
        totalDistance += sessionDistance;
        totalSpeed += spd;
        speedCount++;
      }
    });

    if (totalDuration > 0) {
      avgSpeed = totalDistance / (totalDuration / 60) || 0;
    }

    // Calculate simple average speed if we have speed data (for cycle and airbike)
    if (speedCount > 0 && avgSpeed === 0) {
      avgSpeed = totalSpeed / speedCount;
    }

    return {
      totalDuration: Math.round(totalDuration * 100) / 100,
      totalDistance: Math.round(totalDistance * 100) / 100,
      avgSpeed: Math.round(avgSpeed * 100) / 100,
    };
  };

  const clearIrrelevantCardioFields = (equipmentType) => {
    // Don't clear fields when editing
    if (editingWorkout) return;

    // Clear irrelevant fields in all sessions
    setCardioSessions((prevSessions) =>
      prevSessions.map((session) => {
        const updatedSession = { ...session };

        if (equipmentType !== "treadmill") {
          updatedSession.incline = "";
        }

        if (!["treadmill", "cycle", "airbike"].includes(equipmentType)) {
          updatedSession.speed = "";
        }

        // Clear resistance for equipment that doesn't use it
        if (
          ![
            "crosstrainer",
            "cycle",
            "airbike",
            "stairmaster",
            "rowing",
          ].includes(equipmentType)
        ) {
          updatedSession.resistance = "";
        }

        return updatedSession;
      }),
    );
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
    return calculateCaloriesFromSessions();
  };

  // Add this new function for session-based calorie calculation
  const calculateCaloriesFromSessions = () => {
    const userWeight = latestBMIEntry?.bodyweight || 70;
    let totalCalories = 0;

    const intensityMultiplier =
      {
        light: 0.7,
        moderate: 1.0,
        vigorous: 1.4,
        max: 1.7,
      }[intensity] || 1.0;

    cardioSessions.forEach((session) => {
      const dur = parseFloat(session.duration) || 0;
      const spd = parseFloat(session.speed) || 0;
      const inc = parseFloat(session.incline) || 0;
      const res = parseFloat(session.resistance) || 0;

      if (dur <= 0) return;

      let baseMET = 0;

      // Calculate MET for this session
      switch (cardioType) {
        case "treadmill":
          let effectiveSpeed = spd;

          // Convert mph to km/h for MET calculation (MET tables use km/h)
          if (speedUnit === "mph") {
            effectiveSpeed = spd * 1.60934;
          }

          if (effectiveSpeed <= 0) {
            baseMET = 4.0;
          } else if (effectiveSpeed < 4.0) {
            baseMET = 3.0 + (effectiveSpeed - 2.5) * 1.0;
          } else if (effectiveSpeed < 5.0) {
            baseMET = 4.5 + (effectiveSpeed - 4.0) * 2.0;
          } else if (effectiveSpeed < 7.0) {
            baseMET = 6.5 + (effectiveSpeed - 5.0) * 1.5;
          } else {
            baseMET = 8.5 + (effectiveSpeed - 7.0) * 1.0;
          }

          if (inc > 0) {
            baseMET += inc * 0.1;
          }
          break;

        case "cycle":
          baseMET = 3.5 + spd * 0.3 + res * 0.5;
          break;

        case "crosstrainer":
          baseMET = 4.0 + res * 0.4;
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
          baseMET = 5.0;
      }

      baseMET *= intensityMultiplier;
      baseMET = Math.max(3, Math.min(baseMET, 20));

      const sessionCalories = baseMET * userWeight * (dur / 60);
      totalCalories += sessionCalories;
    });

    return Math.round(totalCalories);
  };

  const calculateAutoDistance = () => {
    if (cardioSessions.length === 0) return "";

    const totals = calculateCardioTotals();
    let totalDistance = totals.totalDistance;

    // If we have speed-based distance, use it
    if (totalDistance > 0) {
      // Adjust for incline if treadmill
      if (cardioType === "treadmill") {
        // Calculate weighted incline for all sessions
        let totalInclineEffect = 0;
        let totalWeightedDuration = 0;

        cardioSessions.forEach((session) => {
          const dur = parseFloat(session.duration) || 0;
          const inc = parseFloat(session.incline) || 0;

          if (dur > 0) {
            totalInclineEffect += inc * dur;
            totalWeightedDuration += dur;
          }
        });

        // Calculate average incline
        const avgIncline =
          totalWeightedDuration > 0
            ? totalInclineEffect / totalWeightedDuration
            : 0;

        // Apply incline factor to total distance
        if (avgIncline > 0) {
          const inclineFactor = 1 + avgIncline * 0.008;
          totalDistance *= inclineFactor;
        }
      }

      // Convert to selected distance unit
      const calculatedDistance = Math.round(totalDistance * 100) / 100;

      // If speed is in mph but distance unit is km, convert
      if (speedUnit === "mph" && distanceUnit === "km") {
        return Math.round(calculatedDistance * 1.60934 * 100) / 100;
      }

      // If speed is in km/h but distance unit is miles, convert
      if (speedUnit === "km/h" && distanceUnit === "miles") {
        return Math.round(calculatedDistance * 0.621371 * 100) / 100;
      }

      return calculatedDistance;
    }

    // For equipment without speed, calculate distance based on resistance and duration
    if (
      ["crosstrainer", "stairmaster", "rowing", "cycle", "airbike"].includes(
        cardioType,
      )
    ) {
      let estimatedDistance = 0;

      cardioSessions.forEach((session) => {
        const dur = parseFloat(session.duration) || 0;
        const res = parseFloat(session.resistance) || 1;

        if (dur <= 0) return;

        // Different distance estimation formulas for each equipment
        switch (cardioType) {
          case "crosstrainer":
            // Elliptical: resistance affects stride length
            estimatedDistance += (dur / 60) * (2.0 + res * 0.3); // km per hour estimation
            break;
          case "stairmaster":
            // Stair climber: resistance affects steps per minute
            estimatedDistance += (dur / 60) * (0.5 + res * 0.15); // vertical km estimation
            break;
          case "rowing":
            // Rowing machine: resistance affects meters per stroke
            estimatedDistance += (dur / 60) * (3.0 + res * 0.4); // km per hour estimation
            break;
          case "cycle":
            // Stationary bike: resistance affects simulated distance
            estimatedDistance += (dur / 60) * (15 + res * 2); // km per hour estimation
            break;
          case "airbike":
            // Air bike: resistance and speed affect distance
            const spd = parseFloat(session.speed) || 0;
            estimatedDistance += (dur / 60) * (spd * 0.06 + res * 0.5); // km per hour estimation
            break;
        }
      });

      if (estimatedDistance > 0) {
        // Convert to selected distance unit
        const calculatedDistance = Math.round(estimatedDistance * 100) / 100;

        if (distanceUnit === "miles") {
          return Math.round(calculatedDistance * 0.621371 * 100) / 100;
        }
        return calculatedDistance;
      }
    }

    return "";
  };

  useEffect(() => {
    if (workoutType === "cardio") {
      // Check if any session has valid data for distance calculation
      let hasValidDataForDistance = false;

      cardioSessions.forEach((session) => {
        const dur = parseFloat(session.duration) || 0;
        const spd = parseFloat(session.speed) || 0;
        const res = parseFloat(session.resistance) || 0;

        // For speed-based equipment: need duration AND speed
        if (["treadmill", "cycle", "airbike"].includes(cardioType)) {
          if (dur > 0 && spd > 0) {
            hasValidDataForDistance = true;
          }
        }
        // For resistance-only equipment: need duration
        else if (
          ["crosstrainer", "stairmaster", "rowing"].includes(cardioType)
        ) {
          if (dur > 0) {
            hasValidDataForDistance = true;
          }
        }
      });

      if (hasValidDataForDistance && !isDistanceEdited) {
        const calculatedDist = calculateAutoDistance();
        if (calculatedDist) {
          setDistance(calculatedDist.toString());
        }
      } else if (!hasValidDataForDistance && !isDistanceEdited) {
        // Clear distance if no valid session data
        setDistance("");
      }
    }
  }, [cardioType, workoutType, isDistanceEdited, cardioSessions]);

  // useEffect to recalculate distance when sessions change
  useEffect(() => {
    if (workoutType === "cardio" && !isDistanceEdited) {
      const calculatedDist = calculateAutoDistance();
      if (calculatedDist) {
        setDistance(calculatedDist.toString());
      }
    }
  }, [cardioSessions, cardioType, speedUnit]);

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

      // Validate sessions
      const hasEmptySessions = cardioSessions.some(
        (session) => !session.duration || parseFloat(session.duration) <= 0,
      );

      if (hasEmptySessions) {
        alert("Please enter a valid duration for all sessions");
        return;
      }

      // Validate speed for relevant equipment
      if (
        cardioType === "treadmill" ||
        cardioType === "cycle" ||
        cardioType === "airbike"
      ) {
        const hasInvalidSpeed = cardioSessions.some(
          (session) => !session.speed || parseFloat(session.speed) <= 0,
        );

        if (hasInvalidSpeed) {
          alert("Please enter a valid speed for all sessions");
          return;
        }
      }

      // Auto-calculate distance if not provided
      if (!distance) {
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
      const totals = calculateCardioTotals();

      const cardioPayload = {
        workoutType: "cardio",
        exercise,
        cardioType,
        duration: totals.totalDuration,
        distance: distance ? Number(distance) : null,
        distanceUnit,
        intensity,
        calories: Number(calculateTotalCalories()),
        date: selectedDate,
        createdAt: serverTimestamp(),
      };

      // Save speed unit if treadmill
      if (cardioType === "treadmill") {
        cardioPayload.speedUnit = speedUnit;
      }

      // Always save sessions
      cardioPayload.sessions = cardioSessions.map((session) => ({
        duration: parseFloat(session.duration) || 0,
        speed: parseFloat(session.speed) || null,
        incline:
          cardioType === "treadmill"
            ? parseFloat(session.incline) || null
            : null,
        resistance: parseFloat(session.resistance) || null,
      }));

      // Save average speed for display when relevant
      if (
        totals.avgSpeed > 0 &&
        (cardioType === "treadmill" ||
          cardioType === "cycle" ||
          cardioType === "airbike")
      ) {
        cardioPayload.avgSpeed = totals.avgSpeed;
      }

      // For backward compatibility, save first session values
      if (cardioSessions.length > 0) {
        if (cardioSessions[0].speed) {
          cardioPayload.speed = parseFloat(cardioSessions[0].speed) || null;
        }
        if (cardioType === "treadmill" && cardioSessions[0].incline) {
          cardioPayload.incline = parseFloat(cardioSessions[0].incline) || null;
        }
        // Add resistance for backward compatibility
        if (cardioSessions[0].resistance) {
          cardioPayload.resistance =
            parseFloat(cardioSessions[0].resistance) || null;
        }
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
      const networkAvailable = isOnline();

      if (networkAvailable) {
        // Online - save directly
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

        // Update cache
        const updatedWorkouts = editingWorkout
          ? workouts.map((w) =>
              w.id === editingWorkout.id ? { ...w, ...payload } : w,
            )
          : [
              ...workouts.filter((w) => w.id !== "temp"),
              { id: editingWorkout ? editingWorkout.id : "new", ...payload },
            ];

        localStorage.setItem("cachedWorkouts", JSON.stringify(updatedWorkouts));
      } else {
        // Offline - queue for later sync
        if (editingWorkout) {
          setSyncQueue((prev) => [
            ...prev,
            {
              type: "updateWorkout",
              id: editingWorkout.id,
              data: payload,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else {
          setSyncQueue((prev) => [
            ...prev,
            {
              type: "addWorkout",
              data: payload,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Show offline success message
        alert("✅ Workout saved locally. Will sync when you're back online.");
      }

      clearWorkoutForm();
      setEditingWorkout(null);
      setOpenWorkout(false);
    } catch (err) {
      console.error("Save failed:", err);

      if (err.code === "unavailable" || isOffline) {
        // Even if network fails, keep optimistic update
        alert("⚠️ Network issue. Your workout has been saved locally.");
      } else {
        fetchData(); // restore from server only if it's not a network issue
      }
    }
  };

  const confirmDeleteWorkout = async () => {
    if (!userId || !deleteTarget) return;

    // Find the exact workout to delete
    const workoutToDelete = workouts.find((w) => {
      // If it's a rest day, match by date and type
      if (deleteTarget.type === "rest") {
        return w.date === deleteTarget.date && w.type === "rest";
      }
      // Otherwise match by ID
      return w.id === deleteTarget.id;
    });

    if (!workoutToDelete) {
      console.error("Workout not found for deletion");
      setDeleteTarget(null);
      return;
    }

    const isRestDay = workoutToDelete.type === "rest";

    // Store the workout before optimistic removal
    const deletedWorkout = { ...workoutToDelete };

    // Optimistic UI removal
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutToDelete.id));

    if (isRestDay) {
      setRestDays((prev) => prev.filter((d) => d !== workoutToDelete.date));
    }

    // Set lastDeleted for undo
    if (!isRestDay) {
      setLastDeleted(deletedWorkout);
    }

    setDeleteTarget(null);

    // Set delete message
    setSnackbarMessage(isRestDay ? "Rest day deleted" : "Workout deleted");
    setSnackbarSeverity("info");
    setSnackbarOpen(true);

    try {
      const networkAvailable = isOnline();

      if (networkAvailable) {
        // Online - delete from Firestore
        await deleteDoc(
          doc(db, "users", userId, "workouts", workoutToDelete.id),
        );

        // Remove from cache
        const cachedWorkouts = JSON.parse(
          localStorage.getItem("cachedWorkouts") || "[]",
        );
        const updatedCache = cachedWorkouts.filter(
          (w) => w.id !== workoutToDelete.id,
        );
        localStorage.setItem("cachedWorkouts", JSON.stringify(updatedCache));

        // Clear lastDeleted after successful deletion
        if (!isRestDay) {
          setTimeout(() => setLastDeleted(null), 5000); // Clear after 5 seconds
        }
      } else {
        // Offline - queue for sync
        setSyncQueue((prev) => [
          ...prev,
          {
            type: "deleteWorkout",
            id: workoutToDelete.id,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Update local cache
        const cachedWorkouts = JSON.parse(
          localStorage.getItem("cachedWorkouts") || "[]",
        );
        const updatedCache = cachedWorkouts.filter(
          (w) => w.id !== workoutToDelete.id,
        );
        localStorage.setItem("cachedWorkouts", JSON.stringify(updatedCache));

        setSnackbarMessage(
          isRestDay
            ? "Rest day deleted locally. Will sync when online."
            : "Workout deleted locally. Will sync when online.",
        );
        setSnackbarSeverity("warning");
        setSnackbarOpen(true);

        // For offline deletions, we should still allow undo within the snackbar timeout
        if (!isRestDay) {
          // Clear lastDeleted after snackbar timeout
          setTimeout(() => setLastDeleted(null), 5000);
        }
      }
    } catch (err) {
      console.error("Delete failed, reverting:", err);

      // Revert optimistic update
      setWorkouts((prev) => [...prev, deletedWorkout]);
      if (isRestDay) {
        setRestDays((prev) => [...prev, deletedWorkout.date]);
      }

      // Restore cache
      const cachedWorkouts = JSON.parse(
        localStorage.getItem("cachedWorkouts") || "[]",
      );
      cachedWorkouts.push(deletedWorkout);
      localStorage.setItem("cachedWorkouts", JSON.stringify(cachedWorkouts));

      // Clear lastDeleted since we reverted
      setLastDeleted(null);

      setSnackbarMessage("Failed to delete");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const undoDelete = async () => {
    if (!lastDeleted || !userId) return;

    const { id, ...data } = lastDeleted;
    const isRestDay = data.type === "rest";

    try {
      const networkAvailable = isOnline();

      if (networkAvailable) {
        // Online - restore to Firestore
        await setDoc(doc(db, "users", userId, "workouts", id), data);

        // Update local state
        setWorkouts((prev) => [...prev, { id, ...data }]);

        if (isRestDay) {
          setRestDays((prev) => [...prev, data.date]);
        }
      } else {
        // Offline - add back to sync queue
        setSyncQueue((prev) => [
          ...prev,
          {
            type: "addWorkout",
            data: data,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Optimistic restore
        setWorkouts((prev) => [...prev, { id, ...data }]);

        if (isRestDay) {
          setRestDays((prev) => [...prev, data.date]);
        }
      }

      // Update cache
      const cachedWorkouts = JSON.parse(
        localStorage.getItem("cachedWorkouts") || "[]",
      );
      cachedWorkouts.push({ id, ...data });
      localStorage.setItem("cachedWorkouts", JSON.stringify(cachedWorkouts));

      setSnackbarMessage(`${isRestDay ? "Rest day" : "Workout"} restored`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Error restoring workout:", err);
      setSnackbarMessage(
        `Failed to restore ${isRestDay ? "rest day" : "workout"}`,
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLastDeleted(null);
    }
  };

  const openEditWorkout = (row) => {
    setEditingWorkout(row);
    setExercise(row.exercise || "");

    if (row.workoutType === "cardio") {
      setWorkoutType("cardio");
      setCardioType(row.cardioType || "treadmill");
      setExercise(row.exercise || getCardioExerciseName(row.cardioType));
      setDistance(row.distance?.toString() || "");
      setDistanceUnit(row.distanceUnit || "km");
      setIntensity(row.intensity || "moderate");

      // Always use sessions
      if (row.sessions && row.sessions.length > 0) {
        const sessionsWithIds = row.sessions.map((session, index) => ({
          id: index + 1,
          duration: session.duration?.toString() || "",
          speed: session.speed?.toString() || "",
          incline: session.incline?.toString() || "",
          resistance: session.resistance?.toString() || "",
        }));
        setCardioSessions(sessionsWithIds);
        setSessionCount(sessionsWithIds.length);

        // Load speed unit if it exists
        if (row.speedUnit) {
          setSpeedUnit(row.speedUnit);
        }
      } else {
        // For backward compatibility with old data without sessions
        setCardioSessions([
          {
            id: 1,
            duration: row.duration?.toString() || "",
            speed: row.speed?.toString() || "",
            incline: row.incline?.toString() || "",
            resistance: row.resistance?.toString() || "",
          },
        ]);
        setSessionCount(1);

        // Default to km/h for old data
        setSpeedUnit("km/h");
      }

      // Handle resistance
      const relevantEquipmentForResistance = [
        "crosstrainer",
        "cycle",
        "airbike",
        "stairmaster",
        "rowing",
      ];
    } else {
      // Strength training (unchanged)
      if (row.sets && row.sets.length > 0) {
        setSets(row.sets);
      } else {
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
      const activityDate = new Date(w.date);
      activityDate.setHours(0, 0, 0, 0);

      if (workoutFilter === "today") {
        return activityDate.getTime() === now.getTime();
      }

      if (workoutFilter === "week") {
        // Get the start of the current week (Sunday)
        const startOfWeek = new Date(now);
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate Sunday of this week
        startOfWeek.setDate(now.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get end of week (Saturday)
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return activityDate >= startOfWeek && activityDate <= endOfWeek;
      }

      if (workoutFilter === "month") {
        // Get the start of the current month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Get end of current month
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        return activityDate >= startOfMonth && activityDate <= endOfMonth;
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let expectedDate = new Date(today);

  // Check if there's any activity today (workout OR rest day)
  const hasActivityToday = sortedWorkouts.some((w) => {
    const d = new Date(w.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  // If no activity today, start from yesterday
  if (!hasActivityToday) {
    expectedDate.setDate(expectedDate.getDate() - 1);
  }

  // Count consecutive days with any activity (workout or rest)
  for (let i = sortedWorkouts.length - 1; i >= 0; i--) {
    const activityDate = new Date(sortedWorkouts[i].date);
    activityDate.setHours(0, 0, 0, 0);

    if (activityDate.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (activityDate.getTime() < expectedDate.getTime()) {
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
          {isOffline && (
            <Chip
              label="Offline"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ ml: 2, fontSize: "0.7rem", verticalAlign: "middle" }}
            />
          )}
        </Typography>

        <Box display="flex" gap={2} alignItems="center">
          {/* Sync & Cache Menu Button */}
          <Button
            variant="outlined"
            color="primary"
            onClick={(e) => setCacheMenuAnchor(e.currentTarget)}
            disabled={isOffline || loading}
            startIcon={<RefreshIcon />}
            sx={{
              textTransform: "none",
              minWidth: "auto",
              px: 2,
              position: "relative",
            }}
          >
            Refresh
            {syncQueue.length > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: "error.main",
                  color: "white",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                  border: "2px solid white",
                }}
              >
                {syncQueue.length}
              </Box>
            )}
          </Button>

          {/* Logout Button */}
          <Button
            variant="outlined"
            color="error"
            onClick={() => signOut(auth)}
            disabled={isOffline || loading}
            startIcon={<LogoutIcon />}
            sx={{
              textTransform: "none",
              minWidth: "auto",
              px: 2,
            }}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Sync & Cache Menu */}
      <Menu
        anchorEl={cacheMenuAnchor}
        open={Boolean(cacheMenuAnchor)}
        onClose={() => setCacheMenuAnchor(null)}
      >
        {/* Sync Now Option */}
        <MenuItem
          onClick={() => {
            setCacheMenuAnchor(null);
            processSyncQueue();
          }}
          disabled={isOffline || isSyncing || syncQueue.length === 0}
        >
          <ListItemIcon>
            {isSyncing ? (
              <CircularProgress size={20} />
            ) : (
              <SyncIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary="Sync Now"
            secondary={
              syncQueue.length > 0
                ? `${syncQueue.length} pending changes`
                : "All synced"
            }
          />
        </MenuItem>

        {/* Refresh Data Option */}
        <MenuItem
          onClick={() => {
            setCacheMenuAnchor(null);
            fetchData();
            setSnackbarMessage("Refreshing data...");
            setSnackbarSeverity("info");
            setSnackbarOpen(true);
          }}
          disabled={isOffline}
        >
          <ListItemIcon>
            <RefreshIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Refresh Data" />
        </MenuItem>

        <Divider />

        {/* Clear Cache Option */}
        <MenuItem
          onClick={() => {
            setCacheMenuAnchor(null);
            clearLocalCache();
            // Show a confirmation snackbar instead of alert
            setSnackbarMessage("Cache cleared successfully");
            setSnackbarSeverity("success");
            setSnackbarOpen(true);
          }}
          disabled={!hasPersistentData && syncQueue.length === 0}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Clear Local Cache"
            secondary={
              hasPersistentData ? "Remove cached data" : "No cache available"
            }
          />
        </MenuItem>
      </Menu>

      {/* Offline Status Indicator */}
      {isOffline && (
        <Card
          sx={{
            mb: 3,
            borderLeft: "6px solid",
            borderColor: "warning.main",
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography fontWeight="bold">⚠️ You're offline</Typography>
              <Typography variant="body2">
                {hasPersistentData
                  ? "Using cached data. Changes will sync when you're back online."
                  : "No cached data available. Please connect to the internet."}
              </Typography>
              {syncQueue.length > 0 && (
                <Chip
                  size="small"
                  label={`${syncQueue.length} pending sync`}
                  color="warning"
                  variant="outlined"
                />
              )}
              {isSyncing && (
                <Chip
                  size="small"
                  label="Syncing..."
                  variant="outlined"
                  color="info"
                  icon={<CircularProgress size={16} />}
                  sx={{
                    textTransform: "none",
                    minWidth: "auto",
                    px: 2,
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Streak Reminder */}
      {showStreakReminder && (
        <Card
          sx={{
            mb: 3,
            borderLeft: "6px solid",
            borderColor: "warning.main",
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

        <Grid size={{ xs: 12, sm: 2 }}>
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

        <Grid size={{ xs: 12, sm: 2.4 }}>
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

        <Grid size={{ xs: 12, sm: 2.3 }}>
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
                {getWeightStats().startingWeight?.toFixed(1) || "--"} kg
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current Weight
              </Typography>
              <Typography variant="h6" color="primary">
                {getWeightStats().currentWeight?.toFixed(1) || "--"} kg
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Overall Change
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color:
                    getWeightStats().change > 0
                      ? "error.main"
                      : getWeightStats().change < 0
                        ? "success.main"
                        : "text.primary",
                }}
              >
                {getWeightStats().change !== null
                  ? `${Math.abs(getWeightStats().change).toFixed(1)} kg ${
                      getWeightStats().change > 0 ? "↗" : "↘"
                    }`
                  : "--"}
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
                formatter={(value, name) => {
                  // Explicitly handle each data series
                  if (name === "weight") {
                    return [`${Number(value).toFixed(1)} kg`, "Weight"];
                  } else if (name === "bmi") {
                    return [Number(value).toFixed(1), "BMI"];
                  }
                  return [value, name];
                }}
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
            All Time
          </Button>
        </Box>

        <TableContainer component={Paper} sx={tableStyles}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: "bold", pr: 8 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Exercise</TableCell>
                <TableCell sx={{ fontWeight: "bold" }}>Details</TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Total Reps
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Total Weight
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Calories
                </TableCell>
                <TableCell sx={{ fontWeight: "bold" }} align="center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* No workouts found message */}
              {getFilteredWorkouts().length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {workoutFilter === "today" ? (
                          <>
                            No activities found for today 💤
                            <br />
                            <Typography variant="caption">
                              Taking a rest day? Log it to maintain your streak!
                            </Typography>
                          </>
                        ) : (
                          "No activities found for this period 💤"
                        )}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<FitnessCenterIcon />}
                          onClick={() => setOpenWorkout(true)}
                          size="small"
                        >
                          Add Workout
                        </Button>
                        {workoutFilter === "today" && (
                          <Button
                            variant="outlined"
                            color="info"
                            startIcon={<BedIcon />}
                            onClick={() => addRestDay()}
                            size="small"
                          >
                            Log Rest Day
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              )}

              {Object.entries(getWorkoutsByWeekday()).map(
                ([day, dayWorkouts]) =>
                  dayWorkouts.length > 0 && (
                    <React.Fragment key={day}>
                      {/* Day header row */}
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          sx={{
                            fontWeight: "bold",
                            backgroundColor: "#e8f4fd",
                            fontSize: "0.95rem",
                            py: 1,
                          }}
                        >
                          {day}
                        </TableCell>
                      </TableRow>

                      {/* Workout rows */}
                      {dayWorkouts.map((row) => {
                        // Check if it's a rest day
                        const isRestDay = row.type === "rest";

                        return (
                          <TableRow
                            key={row.id}
                            hover={!isRestDay}
                            sx={{
                              backgroundColor: isRestDay
                                ? "#f9f9f9"
                                : "inherit",
                              "&:hover": {
                                backgroundColor: isRestDay
                                  ? "#f0f0f0"
                                  : "#fafafa",
                              },
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {format(parseISO(row.date), "dd-MM-yyyy")}
                              </Typography>
                            </TableCell>

                            {isRestDay ? (
                              // Rest Day Display
                              <>
                                <TableCell>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <BedIcon color="info" fontSize="small" />
                                    <Typography
                                      variant="body2"
                                      color="info.main"
                                      fontWeight="medium"
                                    >
                                      Rest Day
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {row.notes || "Active recovery"}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    --
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    --
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    --
                                  </Typography>
                                </TableCell>
                              </>
                            ) : (
                              // Workout Display
                              <>
                                <TableCell>
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight="medium"
                                    >
                                      {row.exercise || "--"}
                                    </Typography>
                                  </Box>
                                </TableCell>

                                <TableCell>
                                  {row.workoutType === "strength" ? (
                                    row.sets ? (
                                      <Box>
                                        {/* Duration/Stats Row */}
                                        <Box sx={{ mb: 1 }}>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1,
                                              mb: 0.5,
                                            }}
                                          >
                                            <Chip
                                              label={
                                                <>
                                                  {row.sets.length}{" "}
                                                  {row.sets.length === 1
                                                    ? "set"
                                                    : "sets"}
                                                </>
                                              }
                                              size="small"
                                              variant="outlined"
                                              color="warning"
                                              icon={
                                                <FitnessCenterIcon
                                                  fontSize="small"
                                                  color="warning"
                                                />
                                              }
                                            />
                                          </Box>
                                        </Box>

                                        {/* Sets Display - Paper Style */}
                                        {row.sets && (
                                          <Box sx={{ mb: 1 }}>
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                              display="block"
                                              sx={{ mb: 0.5 }}
                                            >
                                              {row.sets.length}{" "}
                                              {row.sets.length === 1
                                                ? "set"
                                                : "sets"}
                                              :
                                            </Typography>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 0.5,
                                                maxHeight:
                                                  row.sets.length > 3
                                                    ? "120px"
                                                    : "none",
                                                overflowY:
                                                  row.sets.length > 3
                                                    ? "auto"
                                                    : "visible",
                                                pr: row.sets.length > 3 ? 1 : 0,
                                              }}
                                            >
                                              {row.sets.map((set, idx) => (
                                                <Paper
                                                  key={idx}
                                                  variant="outlined"
                                                  sx={{
                                                    p: 0.5,
                                                    backgroundColor: "#f9f9f9",
                                                    borderLeft: "3px solid",
                                                    borderLeftColor:
                                                      idx % 2 === 0
                                                        ? "#1976d2"
                                                        : "#2e7d32",
                                                  }}
                                                >
                                                  <Typography
                                                    variant="caption"
                                                    component="div"
                                                  >
                                                    <Box
                                                      sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        flexWrap: "wrap",
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontWeight: "bold",
                                                          minWidth: "40px",
                                                        }}
                                                      >
                                                        Set {set.setNumber}
                                                      </span>

                                                      <span>•</span>
                                                      <span
                                                        style={{
                                                          fontWeight: "bold",
                                                        }}
                                                      >
                                                        {set.reps} reps
                                                      </span>

                                                      <span>×</span>
                                                      <span
                                                        style={{
                                                          fontWeight: "bold",
                                                          color: "#1976d2",
                                                        }}
                                                      >
                                                        {set.weight?.toFixed(1)}{" "}
                                                        kg
                                                      </span>

                                                      {/* Optional: Show total for this set */}
                                                      {set.reps &&
                                                        set.weight && (
                                                          <>
                                                            <span>•</span>
                                                            <span
                                                              style={{
                                                                color:
                                                                  "#2e7d32",
                                                              }}
                                                            >
                                                              Total:{" "}
                                                              {(
                                                                set.reps *
                                                                set.weight
                                                              ).toFixed(1)}{" "}
                                                              kg
                                                            </span>
                                                          </>
                                                        )}
                                                    </Box>
                                                  </Typography>
                                                </Paper>
                                              ))}
                                            </Box>
                                          </Box>
                                        )}
                                      </Box>
                                    ) : (
                                      "--"
                                    )
                                  ) : (
                                    <Box>
                                      {/* Duration and Stats Row */}
                                      <Box sx={{ mb: 1 }}>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            mb: 0.5,
                                          }}
                                        >
                                          <Chip
                                            label={`${row.duration} ${"mins"}`}
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            icon={
                                              <AccessTimeIcon fontSize="small" />
                                            }
                                          />

                                          {/* Average Speed for relevant equipment */}
                                          {row.avgSpeed &&
                                            row.avgSpeed > 0 &&
                                            (row.cardioType === "treadmill" ||
                                              row.cardioType === "cycle" ||
                                              row.cardioType === "airbike") && (
                                              <Chip
                                                label={`Avg ${row.avgSpeed.toFixed(1)} ${
                                                  row.cardioType === "treadmill"
                                                    ? row.speedUnit || "km/h"
                                                    : "RPM"
                                                }`}
                                                size="small"
                                                variant="outlined"
                                                color="primary"
                                              />
                                            )}

                                          {/* Distance if available */}
                                          {row.distance && (
                                            <Chip
                                              label={`${row.distance} ${row.distanceUnit}`}
                                              size="small"
                                              variant="outlined"
                                              color="success"
                                              icon={
                                                <DirectionsRunIcon fontSize="small" />
                                              }
                                            />
                                          )}
                                        </Box>
                                      </Box>

                                      {/* Sessions */}
                                      {row.sessions && (
                                        <Box sx={{ mb: 1 }}>
                                          <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            display="block"
                                            sx={{ mb: 0.5 }}
                                          >
                                            {row.sessions.length}{" "}
                                            {row.sessions.length === 1
                                              ? "session"
                                              : "sessions"}
                                            :
                                          </Typography>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 0.5,
                                              maxHeight:
                                                row.sessions.length > 3
                                                  ? "120px"
                                                  : "none",
                                              overflowY:
                                                row.sessions.length > 3
                                                  ? "auto"
                                                  : "visible",
                                              pr:
                                                row.sessions.length > 3 ? 1 : 0,
                                            }}
                                          >
                                            {row.sessions.map(
                                              (session, idx) => (
                                                <Paper
                                                  key={idx}
                                                  variant="outlined"
                                                  sx={{
                                                    p: 0.5,
                                                    backgroundColor: "#f9f9f9",
                                                    borderLeft: "3px solid",
                                                    borderLeftColor:
                                                      idx % 2 === 0
                                                        ? "#1976d2"
                                                        : "#2e7d32",
                                                  }}
                                                >
                                                  <Typography
                                                    variant="caption"
                                                    component="div"
                                                  >
                                                    <Box
                                                      sx={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 1,
                                                        flexWrap: "wrap",
                                                      }}
                                                    >
                                                      <span
                                                        style={{
                                                          fontWeight: "bold",
                                                          minWidth: "40px",
                                                        }}
                                                      >
                                                        {session.duration} min
                                                      </span>

                                                      {(row.cardioType ===
                                                        "treadmill" ||
                                                        row.cardioType ===
                                                          "cycle" ||
                                                        row.cardioType ===
                                                          "airbike") &&
                                                        session.speed && (
                                                          <>
                                                            <span>@</span>
                                                            <span
                                                              style={{
                                                                fontWeight:
                                                                  "bold",
                                                              }}
                                                            >
                                                              {session.speed}{" "}
                                                              {row.cardioType ===
                                                              "treadmill"
                                                                ? row.speedUnit ||
                                                                  "km/h"
                                                                : "RPM"}
                                                            </span>
                                                          </>
                                                        )}

                                                      {row.cardioType ===
                                                        "treadmill" &&
                                                        session.incline && (
                                                          <>
                                                            <span>•</span>
                                                            <span>
                                                              {session.incline}%
                                                              incline
                                                            </span>
                                                          </>
                                                        )}

                                                      {session.resistance && (
                                                        <>
                                                          <span>•</span>
                                                          <span>
                                                            Level{" "}
                                                            {session.resistance}
                                                          </span>
                                                        </>
                                                      )}
                                                    </Box>
                                                  </Typography>
                                                </Paper>
                                              ),
                                            )}
                                          </Box>
                                        </Box>
                                      )}
                                      {/* Intensity with color coding */}
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                          mt: 0.5,
                                        }}
                                      >
                                        <WhatshotIcon
                                          fontSize="small"
                                          sx={{
                                            color:
                                              row.intensity === "vigorous"
                                                ? "error.main"
                                                : row.intensity === "moderate"
                                                  ? "warning.main"
                                                  : "success.main",
                                          }}
                                        />
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: "medium",
                                            color:
                                              row.intensity === "vigorous"
                                                ? "error.main"
                                                : row.intensity === "moderate"
                                                  ? "warning.main"
                                                  : "success.main",
                                            textTransform: "capitalize",
                                          }}
                                        >
                                          {row.intensity} intensity
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  {row.workoutType === "strength" ? (
                                    <Typography
                                      variant="body2"
                                      fontWeight="medium"
                                    >
                                      {row.totalReps || "--"}
                                    </Typography>
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      --
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  {row.workoutType === "strength" ? (
                                    <Typography
                                      variant="body2"
                                      fontWeight="medium"
                                    >
                                      {row.totalWeight?.toFixed(1) || "--"} kg
                                    </Typography>
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      --
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <WhatshotIcon
                                      fontSize="small"
                                      color="error"
                                      sx={{ mr: 0.5 }}
                                    />
                                    <Typography
                                      variant="body2"
                                      fontWeight="medium"
                                      color="error.main"
                                    >
                                      {row.calories || "--"}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </>
                            )}

                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                {isRestDay ? (
                                  <>
                                    <IconButton
                                      disabled={isRestDay}
                                      size="small"
                                      color="primary"
                                      onClick={() => openEditWorkout(row)}
                                      title="Edit rest day"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      disabled={!isToday(row.date)}
                                      size="small"
                                      color="error"
                                      onClick={() => setDeleteTarget(row)}
                                      title="Delete rest day"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                ) : (
                                  <>
                                    <IconButton
                                      disabled={!isToday(row.date)}
                                      size="small"
                                      color="primary"
                                      onClick={() => openEditWorkout(row)}
                                      title="Edit workout"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      disabled={!isToday(row.date)}
                                      size="small"
                                      color="error"
                                      onClick={() => setDeleteTarget(row)}
                                      title="Delete workout"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
            <strong>
              {deleteTarget?.type === "rest"
                ? "rest day"
                : deleteTarget?.exercise}
            </strong>
            ?
          </Typography>
          {deleteTarget?.type === "rest" && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Note: Deleting rest days may affect your streak.
            </Typography>
          )}
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
        onClose={() => {
          setSnackbarOpen(false);
          setSnackbarMessage("");
          // Only clear lastDeleted if not showing undo
          if (!lastDeleted) {
            setSnackbarMessage("");
          }
        }}
      >
        <Alert
          severity={snackbarSeverity}
          action={
            lastDeleted && lastDeleted.type !== "rest" ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  undoDelete();
                  setSnackbarOpen(false);
                }}
              >
                UNDO
              </Button>
            ) : null
          }
        >
          {snackbarMessage}
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

        {editingWorkout && (
          <Box
            sx={{
              px: 3,
              pr: 5,
            }}
          >
            <Card
              variant="outlined"
              sx={{
                backgroundColor:
                  workoutType === "cardio" ? "#f0f7ff" : "#fff8e1",
                borderColor: workoutType === "cardio" ? "#1976d2" : "#ed6c02",
                borderLeft: `4px solid ${workoutType === "cardio" ? "#1976d2" : "#ed6c02"}`,
              }}
            >
              <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {workoutType === "cardio" ? (
                    <>
                      <FitnessCenterIcon fontSize="small" color="primary" />
                      <Typography
                        variant="body2"
                        color="primary"
                        fontWeight="medium"
                      >
                        Editing {cardioType} workout
                      </Typography>
                    </>
                  ) : (
                    <>
                      <FitnessCenterIcon fontSize="small" color="warning" />
                      <Typography
                        variant="body2"
                        color="warning.dark"
                        fontWeight="medium"
                      >
                        Editing strength workout
                      </Typography>
                    </>
                  )}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: "auto" }}
                  >
                    Created on{" "}
                    {format(parseISO(editingWorkout.date), "dd-MM-yyyy")}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        <DialogContent>
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
            helperText={
              editingWorkout
                ? "Exercise name can be edited"
                : "e.g., Bench Press, Running, Cycling"
            }
            InputProps={{
              readOnly: editingWorkout && workoutType === "cardio", // Read-only for cardio when editing
            }}
          />

          {/* Workout Type Toggle */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Button
              fullWidth
              variant={workoutType === "strength" ? "contained" : "outlined"}
              onClick={() => {
                if (!editingWorkout) {
                  setWorkoutType("strength");
                  setExercise(""); // Clear exercise for strength
                }
              }}
              disabled={editingWorkout && workoutType === "cardio"}
            >
              💪 Strength Training
            </Button>
            <Button
              fullWidth
              variant={workoutType === "cardio" ? "contained" : "outlined"}
              onClick={() => {
                if (!editingWorkout) {
                  setWorkoutType("cardio");
                  // Auto-set exercise name based on default cardio type (treadmill)
                  setExercise(getCardioExerciseName(cardioType));
                }
              }}
              disabled={editingWorkout && workoutType === "strength"}
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
                    onClick={() => {
                      if (!editingWorkout) setWorkoutUnit("kg");
                    }}
                    disabled={editingWorkout}
                  >
                    kg
                  </Button>
                  <Button
                    variant={workoutUnit === "lbs" ? "contained" : "outlined"}
                    onClick={() => {
                      if (!editingWorkout) setWorkoutUnit("lbs");
                    }}
                    disabled={editingWorkout}
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
                    disabled={sets.length === 1}
                    size="small"
                    color="error"
                    onClick={() => removeSet(index)}
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
                  if (!editingWorkout) {
                    const newType = e.target.value;
                    setCardioType(newType);
                    setExercise(getCardioExerciseName(newType));
                    clearIrrelevantCardioFields(newType);

                    // Clear sessions when equipment changes (only when not editing)
                    setCardioSessions([
                      {
                        id: 1,
                        duration: "",
                        speed: "",
                        incline: "",
                        resistance: "",
                      },
                    ]);
                    setSessionCount(1);

                    // Reset speed unit to default when changing equipment
                    if (newType === "treadmill") {
                      setSpeedUnit("km/h");
                    }
                  }
                }}
                fullWidth
                margin="normal"
                disabled={editingWorkout} // Disable when editing
                InputProps={{
                  style: editingWorkout ? { backgroundColor: "#f5f5f5" } : {},
                }}
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
              {editingWorkout && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: -1, mb: 1 }}
                >
                  Equipment type cannot be changed when editing a workout
                </Typography>
              )}

              {/* Cardio Sessions */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Cardio Sessions
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Add your intervals (e.g., 5 min @ 4 km/h, 5 min @ 2 km/h)
                </Typography>

                {cardioSessions.map((session, index) => (
                  <Box
                    key={session.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      border: "1px solid #ccc",
                      borderRadius: 1,
                      backgroundColor: index === 0 ? "transparent" : "grey.50",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2">
                        Session #{index + 1}
                      </Typography>
                      {cardioSessions.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeCardioSession(session.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 2.6 }}>
                        <TextField
                          label="Duration (min)"
                          type="number"
                          value={session.duration}
                          onChange={(e) =>
                            updateCardioSession(
                              session.id,
                              "duration",
                              e.target.value,
                            )
                          }
                          fullWidth
                          size="small"
                          required
                          inputProps={{ step: "0.5", min: "0" }}
                        />
                      </Grid>

                      {(cardioType === "treadmill" ||
                        cardioType === "cycle" ||
                        cardioType === "airbike") && (
                        <Grid
                          size={{ xs: cardioType === "treadmill" ? 2.6 : 2.6 }}
                        >
                          <TextField
                            label={
                              cardioType === "treadmill"
                                ? `Speed (${speedUnit})`
                                : "Speed (RPM)"
                            }
                            type="number"
                            value={session.speed}
                            onChange={(e) =>
                              updateCardioSession(
                                session.id,
                                "speed",
                                e.target.value,
                              )
                            }
                            fullWidth
                            size="small"
                            required
                            inputProps={{ step: "0.1", min: "0" }}
                          />
                        </Grid>
                      )}

                      {/* Speed unit selector (only for treadmill) */}
                      {cardioType === "treadmill" && (
                        <Grid size={{ xs: 2 }}>
                          <TextField
                            select
                            label="Unit"
                            value={speedUnit}
                            onChange={(e) => setSpeedUnit(e.target.value)}
                            fullWidth
                            size="small"
                            variant="outlined"
                          >
                            <MenuItem value="km/h">km/h</MenuItem>
                            <MenuItem value="mph">mph</MenuItem>
                          </TextField>
                        </Grid>
                      )}

                      {cardioType === "treadmill" && (
                        <Grid size={{ xs: 2.6 }}>
                          <TextField
                            label="Incline (%)"
                            type="number"
                            value={session.incline}
                            onChange={(e) =>
                              updateCardioSession(
                                session.id,
                                "incline",
                                e.target.value,
                              )
                            }
                            fullWidth
                            size="small"
                            inputProps={{ step: "0.5", min: "0", max: "15" }}
                          />
                        </Grid>
                      )}

                      {/* Resistance Level for relevant equipment */}
                      {(cardioType === "crosstrainer" ||
                        cardioType === "cycle" ||
                        cardioType === "airbike" ||
                        cardioType === "stairmaster" ||
                        cardioType === "rowing") && (
                        <Grid size={{ xs: 2.8 }}>
                          <TextField
                            label="Resistance Level"
                            type="number"
                            value={session.resistance || ""}
                            onChange={(e) =>
                              updateCardioSession(
                                session.id,
                                "resistance",
                                e.target.value,
                              )
                            }
                            fullWidth
                            size="small"
                            placeholder="Optional"
                            inputProps={{ step: "0.5", min: "0" }}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}

                {/* Add Session Button */}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addCardioSession}
                  sx={{ mt: 1 }}
                >
                  Add Another Session
                </Button>
              </Box>

              {/* Distance */}
              <TextField
                label="Total Distance"
                type="number"
                value={distance}
                onChange={(e) => {
                  setDistance(e.target.value);
                  setIsDistanceEdited(true);
                }}
                fullWidth
                margin="normal"
                inputProps={{ step: "0.01" }}
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
                helperText="Auto-calculated from sessions"
              />

              {/* Intensity */}
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

              {/* Session Totals Display */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Session Totals
                </Typography>
                <Box sx={{ display: "flex", gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Total Duration
                    </Typography>
                    <Typography variant="body1">
                      {calculateCardioTotals().totalDuration} min
                    </Typography>
                  </Box>
                  {cardioType === "treadmill" &&
                    calculateCardioTotals().avgSpeed > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Average Speed
                        </Typography>
                        <Typography variant="body1">
                          {calculateCardioTotals().avgSpeed} km/h
                        </Typography>
                      </Box>
                    )}
                  {distance && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Estimated Distance
                      </Typography>
                      <Typography variant="body1">
                        {distance} {distanceUnit}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Total Calories */}
          <Box
            sx={{
              mt: 3,
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
                : // Cardio validation - check sessions
                  !exercise ||
                  cardioSessions.some(
                    (s) => !s.duration || parseFloat(s.duration) <= 0,
                  ) ||
                  (["treadmill", "cycle", "airbike"].includes(cardioType) &&
                    cardioSessions.some(
                      (s) => !s.speed || parseFloat(s.speed) <= 0,
                    ))
            }
          >
            {editingWorkout ? "Update Workout" : "Add Workout"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
