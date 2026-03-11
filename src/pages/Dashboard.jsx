import React, { useState, useEffect } from "react";
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
  Autocomplete,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  DialogContentText,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
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
import SyncIcon from "@mui/icons-material/Sync";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import BedIcon from "@mui/icons-material/Bed";
import ListIcon from "@mui/icons-material/List";
import SecurityIcon from "@mui/icons-material/Security";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShareIcon from "@mui/icons-material/Share";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CountUp from "react-countup";
import WorkoutPlans from "./WorkoutPlans";
import AddToWorkoutHandler from "./AddToWorkoutHandler";
import { useAdmin } from "../contexts/AdminContext";
import { getPublishedChangelog } from "../utils/changelogFunctions";
import ChangelogDialog from "../components/ChangelogDialog";
import Profile from "../components/Profile";
import StepTracker from "./StepTracker";
import BMIChart from "../components/BMIChart";
import { useTheme } from "../contexts/ThemeContext";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import ShareDialog from "../components/ShareDialog";

const PREDEFINED_STRENGTH_WORKOUTS = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Barbell Row",
  "Pull-ups",
  "Push-ups",
  "Dumbbell Curls",
  "Tricep Extensions",
  "Leg Press",
  "Lunges",
  "Shoulder Press",
  "Lat Pulldown",
  "Chest Fly",
  "Leg Curls",
  "Calf Raises",
  "Bicep Curls",
  "Tricep Pushdown",
  "Face Pulls",
  "Plank",
  "Incline Bench Press",
  "Decline Bench Press",
  "Front Squat",
  "Romanian Deadlift",
  "Bent Over Row",
  "T-Bar Row",
  "Seated Row",
  "Dips",
  "Skull Crushers",
  "Hammer Curls",
  "Lateral Raises",
  "Front Raises",
  "Rear Delt Fly",
  "Leg Extension",
  "Hip Thrust",
  "Glute Bridge",
  "Cable Crossover",
  "Pullovers",
  "Shrugs",
  "Farmer's Walk",
];

export default function Dashboard() {
  const { isAdmin } = useAdmin();
  const { mode, toggleMode, tailwindTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 for Workout, 1 for Workout Plans, 2 for Health Metrics

  // Profile State
  const [profile, setProfile] = useState(null);

  // FAB State
  const [fabOpen, setFabOpen] = useState(false);

  // Changelog State
  const [changelogDialogOpen, setChangelogDialogOpen] = useState(false);
  const [unreadUpdates, setUnreadUpdates] = useState(0);
  const [lastSeenUpdate, setLastSeenUpdate] = useState(null);

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
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    maxWidth: "100%",
    "& .MuiTableRow-root:hover": {
      backgroundColor: mode === "light" ? "#f6e4d280" : "#2d2d2d80",
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

  // Alert Dialog States
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogTitle, setAlertDialogTitle] = useState("");
  const [alertDialogMessage, setAlertDialogMessage] = useState("");
  const [alertDialogSeverity, setAlertDialogSeverity] = useState("info");
  const [alertDialogActions, setAlertDialogActions] = useState([]);

  const handleNumberChange =
    (setter, options = {}) =>
    (e) => {
      const value = e.target.value;
      const { decimal = false, max, min = 0 } = options;

      // Allow empty string
      if (value === "") {
        setter(value);
        return;
      }

      // Regex for numbers only (with or without decimals)
      const regex = decimal ? /^\d*\.?\d*$/ : /^\d*$/;

      if (!regex.test(value)) return;

      const numValue = Number(value);

      // Check min value
      if (min !== undefined && numValue < min) return;

      // Check max value
      if (max !== undefined && numValue > max) return;

      setter(value);
    };

  // Handle profile updates from Profile component
  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);

    // Update local cache
    localStorage.setItem("cachedProfile", JSON.stringify(updatedProfile));
    setLocalCache((prev) => ({ ...prev, profile: updatedProfile }));

    // Show success message
    setSnackbarMessage("Profile updated successfully!");
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
  };

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

        showAlert(
          "Rest Day Logged",
          "✅ Rest day logged locally. Will sync when online.",
          "success",
        );
      }

      setSnackbarMessage("Rest day added successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Error adding rest day:", err);
      showAlert("Error", "Failed to add rest day", "error");
    }
  };

  // Workout Plan States
  const [addingPlanExercises, setAddingPlanExercises] = useState([]);
  const [addExercisesDialogOpen, setAddExercisesDialogOpen] = useState(false);
  const [exercisesToAdd, setExercisesToAdd] = useState([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Share Dialog State
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareContent, setShareContent] = useState("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareData, setShareData] = useState({});

  // Share Functions
  const generateWorkoutShareContent = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayWorkouts = workouts.filter((w) => w.date === today);

    if (todayWorkouts.length === 0) {
      setSnackbarMessage("No workouts logged today to share");
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
      return;
    }

    let content = `💪 My Workout Summary - ${format(new Date(), "dd MMM yyyy")}\n\n`;
    let totalCalories = 0;
    let workoutDetails = [];

    todayWorkouts.forEach((workout, index) => {
      if (workout.type === "rest") {
        content += `🛌 Rest Day - Active Recovery\n`;
      } else if (workout.workoutType === "strength") {
        content += `💪 ${workout.exercise}\n`;
        workout.sets?.forEach((set) => {
          content += `  Set ${set.setNumber}: ${set.reps} reps × ${set.weight?.toFixed(1)} kg\n`;
        });
        totalCalories += workout.calories || 0;

        workoutDetails.push({
          exercise: workout.exercise,
          sets: workout.sets?.length || 0,
          totalReps: workout.totalReps || 0,
          totalWeight: workout.totalWeight?.toFixed(1) || 0,
        });
      } else if (workout.workoutType === "cardio") {
        content += `🏃 ${workout.exercise}\n`;
        content += `  Duration: ${workout.duration} min\n`;
        if (workout.distance)
          content += `  Distance: ${workout.distance} ${workout.distanceUnit}\n`;
        if (workout.avgSpeed)
          content += `  Avg Speed: ${workout.avgSpeed.toFixed(1)} km/h\n`;
        totalCalories += workout.calories || 0;

        workoutDetails.push({
          type: workout.cardioType,
          duration: workout.duration,
          distance: workout.distance
            ? `${workout.distance} ${workout.distanceUnit}`
            : null,
        });
      }
      if (index < todayWorkouts.length - 1) content += `\n`;
    });

    content += `\n🔥 Total Calories: ${totalCalories.toFixed(0)} kcal`;
    content += `\n📊 Total Workouts: ${todayWorkouts.length}`;

    if (workoutDetails.length > 0) {
      content += `\n——\nWellTrackD\n#FitnessTracker #Workout #Fitness`;
    }

    setShareTitle(`My Workout - ${format(new Date(), "dd MMM yyyy")}`);
    setShareContent(content);
    setShareData({
      Workouts: todayWorkouts.length,
      Calories: `${totalCalories.toFixed(0)} kcal`,
      ...(workoutDetails[0]?.exercise && {
        "Main Exercise": workoutDetails[0].exercise,
      }),
    });
    setShareDialogOpen(true);
  };

  // Alert Dialog Helper Function
  const showAlert = (title, message, severity = "info", actions = []) => {
    setAlertDialogTitle(title);
    setAlertDialogMessage(message);
    setAlertDialogSeverity(severity);
    setAlertDialogActions(actions);
    setAlertDialogOpen(true);
  };

  const processExerciseAddition = (exerciseData) => {
    // Clear any existing form data first
    clearWorkoutForm();

    // Set workout date to today
    const today = new Date().toISOString().split("T")[0];
    setWorkoutDate(today);

    // Handle different exercise formats
    if (typeof exerciseData === "string") {
      // String format (legacy)
      setExercise(exerciseData);
      setWorkoutType("strength");
      setSets([
        { setNumber: 1, reps: "", weight: "" },
        { setNumber: 2, reps: "", weight: "" },
        { setNumber: 3, reps: "", weight: "" },
      ]);
    } else {
      // Object format from workout plans
      setExercise(exerciseData.name || "");
      setWorkoutType("strength");

      const setsCount = parseInt(exerciseData.sets) || 3;
      const repsValue = exerciseData.reps?.toString() || "8";
      const weightValue = exerciseData.weight?.toString() || "";

      const newSets = Array.from({ length: setsCount }, (_, i) => ({
        setNumber: i + 1,
        reps: repsValue,
        weight: weightValue,
      }));

      setSets(newSets);

      if (exerciseData.weightUnit) {
        setWorkoutUnit(exerciseData.weightUnit);
      }
    }

    // Open the workout form
    setOpenWorkout(true);
  };

  const processExerciseBatch = (exercises) => {
    if (exercises.length === 0) return;

    // Save exercises for sequential processing
    setExercisesToAdd(exercises);
    setCurrentExerciseIndex(0);
    setIsProcessingBatch(true);

    // Close the selection dialog
    setAddExercisesDialogOpen(false);

    // Process first exercise
    processExerciseAddition(exercises[0]);

    // Show info message
    setSnackbarMessage(
      `Adding ${exercises.length} exercises (1/${exercises.length})`,
    );
    setSnackbarSeverity("info");
    setSnackbarOpen(true);
  };

  useEffect(() => {
    // Check if we're processing a batch and the workout form was just closed
    if (
      isProcessingBatch &&
      !openWorkout &&
      exercisesToAdd.length > 0 &&
      currentExerciseIndex >= 0
    ) {
      // Check if we have more exercises
      const nextIndex = currentExerciseIndex + 1;

      if (nextIndex < exercisesToAdd.length) {
        // Process next exercise after a short delay
        const timer = setTimeout(() => {
          processExerciseAddition(exercisesToAdd[nextIndex]);
          setCurrentExerciseIndex(nextIndex);

          // Update snackbar message
          setSnackbarMessage(
            `Adding ${exercisesToAdd.length} exercises (${nextIndex + 1}/${exercisesToAdd.length})`,
          );
          setSnackbarSeverity("info");
          setSnackbarOpen(true);
        }, 1000); // 1 second delay between exercises

        return () => clearTimeout(timer);
      } else {
        // All exercises processed
        setSnackbarMessage(
          `Successfully added ${exercisesToAdd.length} exercises!`,
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Reset batch state
        setExercisesToAdd([]);
        setCurrentExerciseIndex(-1);
        setIsProcessingBatch(false);
      }
    }
  }, [openWorkout, isProcessingBatch, exercisesToAdd, currentExerciseIndex]);

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
    showAlert(
      "Clear Local Cache",
      "Are you sure you want to clear all locally cached data?\n\n" +
        "This will remove: \n" +
        "• Cached workouts\n" +
        "• Cached BMI data\n" +
        "• Cached profile\n" +
        "• Sync queue\n\n" +
        "You'll need internet connection to reload data.",
      "warning",
      [
        {
          text: "Cancel",
          onClick: () => setAlertDialogOpen(false),
          color: "primary",
          variant: "contained",
          sx: {
            bgcolor: mode === "light" ? "#f9f6ee" : "#333333",
            color: mode === "light" ? "#333333" : "#f9f6ee",
            "&:hover": {
              bgcolor: mode === "light" ? "#f6e4d2" : "#444444",
            },
          },
        },
        {
          text: "Clear Cache",
          onClick: () => {
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
            setAlertDialogOpen(false);
          },
          color: "error",
          variant: "contained",
        },
      ],
    );
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

  useEffect(() => {
    const fetchLastSeenUpdate = async () => {
      if (!userId) return;

      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const storedLastSeen = userData.lastSeenUpdate;

          if (storedLastSeen) {
            setLastSeenUpdate(storedLastSeen);
            // Also store in localStorage as cache for offline use
            localStorage.setItem("lastSeenUpdate", storedLastSeen);
          }
        }
      } catch (error) {
        console.error("Error fetching lastSeenUpdate:", error);
        // Fall back to localStorage cache if offline
        const cached = localStorage.getItem("lastSeenUpdate");
        if (cached) {
          setLastSeenUpdate(cached);
        }
      }
    };

    fetchLastSeenUpdate();
  }, [userId]);

  useEffect(() => {
    const checkForNewUpdates = async () => {
      if (!userId) return;

      try {
        const entries = await getPublishedChangelog();
        if (entries.length > 0) {
          // Get the latest entry date
          const latestDate = entries[0].date;

          // Check if user has seen this update (using lastSeenUpdate from state)
          if (
            !lastSeenUpdate ||
            new Date(latestDate) > new Date(lastSeenUpdate)
          ) {
            // Show badge if there are unseen updates
            const unseenEntries = entries.filter(
              (entry) =>
                !lastSeenUpdate ||
                new Date(entry.date) > new Date(lastSeenUpdate),
            );
            setUnreadUpdates(unseenEntries.length);
          } else {
            setUnreadUpdates(0);
          }
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      }
    };

    checkForNewUpdates();
  }, [userId, lastSeenUpdate]);

  useEffect(() => {
    const migrateLastSeenUpdate = async () => {
      if (!userId) return;

      const localLastSeen = localStorage.getItem("lastSeenUpdate");
      if (localLastSeen && !lastSeenUpdate) {
        try {
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            lastSeenUpdate: localLastSeen,
          });
          setLastSeenUpdate(localLastSeen);
          console.log("Migrated lastSeenUpdate to Firestore");
        } catch (error) {
          console.error("Error migrating lastSeenUpdate:", error);
        }
      }
    };

    migrateLastSeenUpdate();
  }, [userId, lastSeenUpdate]);

  // Update when dialog is closed (mark as seen)
  const handleChangelogClose = async () => {
    setChangelogDialogOpen(false);

    if (!userId) return;

    try {
      // Get the latest changelog date
      const entries = await getPublishedChangelog();

      if (entries.length > 0) {
        const latestDate = entries[0].date;

        // Update in Firestore
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          lastSeenUpdate: latestDate,
        });

        // Update local state
        setLastSeenUpdate(latestDate);

        // Also update localStorage cache
        localStorage.setItem("lastSeenUpdate", latestDate);
        setUnreadUpdates(0);
      }
    } catch (error) {
      console.error("Error updating lastSeenUpdate:", error);

      // Offline fallback - store in localStorage only
      const entries = await getPublishedChangelog().catch(() => []);
      if (entries.length > 0) {
        const latestDate = entries[0].date;

        // Add to sync queue for when back online
        setSyncQueue((prev) => [
          ...prev,
          {
            type: "updateProfile",
            data: { lastSeenUpdate: latestDate },
            timestamp: new Date().toISOString(),
          },
        ]);

        // Optimistic update
        setLastSeenUpdate(latestDate);
        localStorage.setItem("lastSeenUpdate", latestDate);
        setUnreadUpdates(0);
      }
    }
  };

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
    if (!userId) {
      showAlert("Error", "User not loaded yet. Please try again.", "error");
      return;
    }

    const bmi = calculateBMI();
    if (!weight) {
      showAlert("Validation Error", "Please enter a weight", "warning");
      return;
    }
    if (bmi === null) {
      showAlert("Validation Error", "Please enter a valid height", "warning");
      return;
    }

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

        showAlert(
          "Saved Locally",
          "✅ BMI entry saved locally. Will sync when online.",
          "success",
        );
      }

      clearBMIForm();
      setOpenBMI(false);
      if (networkAvailable) fetchData();
    } catch (err) {
      console.error("Error adding BMI:", err);
      if (!isOffline) {
        showAlert(
          "Error",
          "Error saving BMI entry. Please try again.",
          "error",
        );
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
        avgBMI: null,
        minBMI: null,
        maxBMI: null,
      };
    }

    // Sort all entries by date (oldest first)
    const sortedEntries = [...bmiEntries].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    // Get the absolute starting weight (oldest entry)
    const startingWeight = sortedEntries[0]?.bodyweight ?? null;

    // Get the absolute current weight (latest entry)
    const currentWeight =
      sortedEntries[sortedEntries.length - 1]?.bodyweight ?? null;

    const change =
      startingWeight != null && currentWeight != null
        ? currentWeight - startingWeight
        : null;

    // Calculate BMI stats from bmiEntries
    const bmiValues = sortedEntries
      .map((d) => d.bmi)
      .filter((bmi) => bmi && !isNaN(bmi) && bmi > 10 && bmi < 60);

    const avgBMI =
      bmiValues.length > 0
        ? bmiValues.reduce((a, b) => a + b, 0) / bmiValues.length
        : null;
    const minBMI = bmiValues.length > 0 ? Math.min(...bmiValues) : null;
    const maxBMI = bmiValues.length > 0 ? Math.max(...bmiValues) : null;

    return {
      startingWeight,
      currentWeight,
      change,
      avgBMI,
      minBMI,
      maxBMI,
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
        showAlert(
          "Validation Error",
          "Please enter an exercise name",
          "warning",
        );
        return;
      }
      const hasEmptySets = sets.some((set) => !set.reps || !set.weight);
      if (hasEmptySets) {
        showAlert(
          "Validation Error",
          "Please fill in reps and weight for all sets",
          "warning",
        );
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
        showAlert(
          "Validation Error",
          "Please enter a valid duration for all sessions",
          "warning",
        );
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
          showAlert(
            "Validation Error",
            "Please enter a valid speed for all sessions",
            "warning",
          );
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
      showAlert(
        "Invalid Date",
        "Cannot add workouts for future dates. Please select today or a past date.",
        "warning",
      );
      return;
    }

    // Also validate date is not too far in the past (optional)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    if (selectedDateObj < oneYearAgo) {
      showAlert(
        "Invalid Date",
        "Cannot add workouts older than 1 year.",
        "warning",
      );
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
        showAlert(
          "Saved Locally",
          "✅ Workout saved locally. Will sync when you're back online.",
          "success",
        );
      }

      clearWorkoutForm();
      setEditingWorkout(null);
      setOpenWorkout(false);
    } catch (err) {
      console.error("Save failed:", err);

      if (err.code === "unavailable" || isOffline) {
        // Even if network fails, keep optimistic update
        showAlert(
          "Network Issue",
          "⚠️ Network issue. Your workout has been saved locally.",
          "warning",
        );
      } else {
        fetchData(); // restore from server only if it's not a network issue
      }
    }
  };

  const getPreviousBestForExercise = (exerciseName, currentDate) => {
    if (!exerciseName) return null;

    const currentDateObj = new Date(currentDate);
    currentDateObj.setHours(0, 0, 0, 0);

    // Filter workouts for the same exercise before current date
    const previousWorkouts = workouts
      .filter((w) => {
        if (w.workoutType !== "strength") return false;
        if (
          !w.exercise ||
          w.exercise.toLowerCase() !== exerciseName.toLowerCase()
        )
          return false;

        const workoutDate = new Date(w.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate < currentDateObj;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first

    if (previousWorkouts.length === 0) return null;

    // Find the best set from previous workouts
    let bestSet = null;

    previousWorkouts.forEach((workout) => {
      if (workout.sets && workout.sets.length > 0) {
        workout.sets.forEach((set) => {
          const currentVolume = (set.reps || 0) * (set.weight || 0);
          const bestVolume = bestSet ? bestSet.reps * bestSet.weight : 0;

          if (currentVolume > bestVolume) {
            bestSet = { ...set, date: workout.date };
          }
        });
      }
    });

    return bestSet;
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
        // Get the start of the current week (Monday)
        const startOfWeek = new Date(now);
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Calculate Monday of this week
        // If today is Sunday (day 0), go back 6 days to get to Monday of last week
        // If today is Monday (day 1), we're already at Monday
        // For other days, subtract (day - 1) to get to Monday
        const daysToMonday = day === 0 ? 6 : day - 1;
        startOfWeek.setDate(now.getDate() - daysToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get end of week (Sunday)
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

  const handleChartFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setChartFilter(newFilter);
    }
  };

  const handleWorkoutFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setWorkoutFilter(newFilter);
    }
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
    let startDate, endDate;

    if (calorieFilter === "week") {
      // Calculate Monday of this week (Monday to Sunday)
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = day === 0 ? 6 : day - 1;

      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);

      // Sunday of this week
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else if (calorieFilter === "month") {
      // First day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      // Last day of current month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Handle case where filter is not set (shouldn't happen but good practice)
    if (!startDate || !endDate) return 0;

    return workouts
      .filter((d) => {
        const workoutDate = new Date(d.date);
        // Set to start of day for comparison
        const workoutDateStart = new Date(workoutDate);
        workoutDateStart.setHours(0, 0, 0, 0);

        // Set to end of day for endDate comparison
        const workoutDateEnd = new Date(workoutDate);
        workoutDateEnd.setHours(23, 59, 59, 999);

        // Workout is included if it falls within the date range
        return workoutDateEnd >= startDate && workoutDateStart <= endDate;
      })
      .reduce((sum, w) => sum + (w.calories || 0), 0);
  };

  const caloriesBurned = getCaloriesBurned();

  const getCaloriesBurnedToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = workouts
      .filter((workout) => {
        const workoutDate = new Date(workout.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === today.getTime();
      })
      .reduce((sum, w) => sum + (w.calories || 0), 0);

    return Number(total.toFixed(1));
  };

  const PreviousBestIndicator = ({ exercise, currentDate, currentSets }) => {
    const previousBest = getPreviousBestForExercise(exercise, currentDate);

    if (!previousBest) return null;

    // Find current best set
    const currentBestSet = currentSets.reduce((best, set) => {
      const currentVolume = (set.reps || 0) * (set.weight || 0);
      const bestVolume = best ? best.reps * best.weight : 0;
      return currentVolume > bestVolume ? set : best;
    }, null);

    if (!currentBestSet) return null;

    const currentVolume =
      (currentBestSet.reps || 0) * (currentBestSet.weight || 0);
    const previousVolume =
      (previousBest.reps || 0) * (previousBest.weight || 0);

    const isNewRecord = currentVolume > previousVolume;
    const isSame = currentVolume === previousVolume;

    const formattedBest = `${previousBest.reps} reps × ${previousBest.weight?.toFixed(1)} kg`;

    const prTextStyle = {
      fontSize: { xs: "0.65rem", sm: "0.75rem" },
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.25, sm: 0.5 },
          flexWrap: "wrap",
          maxWidth: "100%",
        }}
      >
        <Chip
          label={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                overflow: "hidden",
              }}
            >
              {isNewRecord ? (
                <>
                  <WhatshotIcon fontSize="small" color="error" />
                  <Typography
                    component="span"
                    variant="caption"
                    color="error.main"
                    sx={prTextStyle}
                  >
                    New PR! Was: {formattedBest}
                  </Typography>
                </>
              ) : isSame ? (
                <>
                  <BarChartIcon fontSize="small" color="info" />
                  <Typography
                    component="span"
                    variant="caption"
                    color="info.main"
                    sx={prTextStyle}
                  >
                    Matched best: {formattedBest}
                  </Typography>
                </>
              ) : (
                <>
                  <TrendingUpIcon fontSize="small" color="success" />
                  <Typography
                    component="span"
                    variant="caption"
                    color="success.main"
                    sx={prTextStyle}
                  >
                    Previous best: {formattedBest}
                  </Typography>
                </>
              )}
            </Box>
          }
          size="small"
          variant="outlined"
          sx={{
            borderColor: isNewRecord
              ? "error.main"
              : isSame
                ? "info.main"
                : "success.main",
            backgroundColor: isNewRecord
              ? "error.50"
              : isSame
                ? "info.50"
                : "success.50",
          }}
        />
      </Box>
    );
  };

  const actions = [
    {
      icon: <FitnessCenterIcon />,
      name: "Add Workout",
      onClick: () => {
        setActiveTab(0); // Switch to Workouts tab first
        setOpenWorkout(true); // Then open workout dialog
      },
    },
    {
      icon: <ListIcon />,
      name: "Workout Plans",
      onClick: () => {
        setActiveTab(1); // Switch to Workout Plans tab
      },
    },
    {
      icon: <ScaleIcon />,
      name: "Add/Update BMI",
      onClick: () => {
        setActiveTab(2); // Switch to Health Metrics tab first
        setOpenBMI(true); // Then open BMI dialog
      },
    },
  ];

  const mobileButtonStyle = (mode) => ({
    textTransform: "none",
    backgroundColor: mode === "light" ? "#333333" : "#f9f6ee",
    color: mode === "light" ? "#f9f6ee" : "#333333",
    "&:hover": {
      bgcolor: mode === "light" ? "#444444" : "#f6e4d2",
    },
  });

  const badgeStyle = {
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
  };

  return (
    <Container
      maxWidth="lg"
      sx={{
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1.5, sm: 2, md: 3 },
      }}
    >
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        {/* Profile Component */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Profile
            userData={{
              ...profile,
              uid: userId,
              name: profile?.name || "User",
              username: profile?.username || "user",
              email: profile?.email || "",
              avatarUrl: profile?.avatarUrl,
              createdAt: profile?.createdAt,
            }}
            onUpdate={handleProfileUpdate}
            isOffline={isOffline}
          />
        </Box>

        <Box display="flex" gap={2} alignItems="center">
          {/* Sync & Cache Menu Button */}
          {isMobile ? (
            <IconButton
              variant="contained"
              color="primary"
              onClick={(e) => setCacheMenuAnchor(e.currentTarget)}
              disabled={isOffline || loading}
              sx={mobileButtonStyle(mode)}
            >
              <RefreshIcon />
              {syncQueue.length > 0 && (
                <Box sx={badgeStyle}>{syncQueue.length}</Box>
              )}
            </IconButton>
          ) : (
            <Button
              variant="contained"
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
                <Box sx={badgeStyle}>{syncQueue.length}</Box>
              )}
            </Button>
          )}

          {/* Add What's New button */}
          {isMobile ? (
            <IconButton
              variant="contained"
              color="success"
              onClick={() => setChangelogDialogOpen(true)}
              disabled={isOffline || loading}
              sx={mobileButtonStyle(mode)}
            >
              <NewReleasesIcon />
              {unreadUpdates > 0 && <Box sx={badgeStyle}>{unreadUpdates}</Box>}
            </IconButton>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={() => setChangelogDialogOpen(true)}
              disabled={isOffline || loading}
              startIcon={<NewReleasesIcon />}
              sx={{
                textTransform: "none",
                minWidth: "auto",
                px: 2,
                position: "relative",
              }}
            >
              What's New
              {unreadUpdates > 0 && <Box sx={badgeStyle}>{unreadUpdates}</Box>}
            </Button>
          )}

          {/* Admin Panel Button */}
          {isAdmin &&
            (isMobile ? (
              <IconButton
                variant="contained"
                color="success"
                component={Link}
                to="/admin"
                disabled={isOffline || loading}
                sx={{
                  textTransform: "none",
                  backgroundColor: mode === "light" ? "#333333" : "#f9f6ee",
                  color: mode === "light" ? "#f9f6ee" : "#333333",
                  "&:hover": {
                    bgcolor: mode === "light" ? "#444444" : "#f6e4d2",
                  },
                }}
              >
                <SecurityIcon />
              </IconButton>
            ) : (
              <Button
                variant="contained"
                color="success"
                component={Link}
                to="/admin"
                disabled={isOffline || loading}
                startIcon={<SecurityIcon />}
                sx={{
                  textTransform: "none",
                  minWidth: "auto",
                  px: 2,
                }}
              >
                Admin Panel
              </Button>
            ))}

          {/* Dark Mode Toggle Icon */}
          {isMobile ? (
            <IconButton
              variant="contained"
              color="warning"
              onClick={toggleMode}
              disabled={isOffline || loading}
              sx={mobileButtonStyle(mode)}
            >
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          ) : (
            <Button
              variant="contained"
              color="warning"
              onClick={toggleMode}
              disabled={isOffline || loading}
              startIcon={
                mode === "light" ? <DarkModeIcon /> : <LightModeIcon />
              }
              sx={{
                textTransform: "none",
                minWidth: "auto",
                px: 2,
              }}
            >
              {mode === "light" ? "Dark Mode" : "Light Mode"}
            </Button>
          )}

          {/* Logout Button */}
          {isMobile ? (
            <IconButton
              variant="contained"
              color="error"
              onClick={() => signOut(auth)}
              disabled={isOffline || loading}
              sx={mobileButtonStyle(mode)}
            >
              <LogoutIcon />
            </IconButton>
          ) : (
            <Button
              variant="contained"
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
          )}
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
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
        <Grid size={{ xs: 6, sm: 2.3, md: 2.3 }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 1.5, sm: 2, md: 2 },
              gap: 1,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: "warning.main",
            }}
          >
            <ScaleIcon color="warning" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                {isMobile ? "Latest Weight" : "Latest Body Weight"}
              </Typography>
              <Typography variant="h6">
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
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 2, md: 2 }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 1.5, sm: 2, md: 2 },
              gap: 1,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: "success.main",
            }}
          >
            <BarChartIcon color="success" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Latest BMI
              </Typography>
              <Typography variant="h6">
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
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 2.4, md: 2.4 }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 1.5, sm: 2, md: 2 },
              gap: 1,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: getBMIColor(latestBMIEntry.bmi),
            }}
          >
            <BarChartIcon
              sx={{ color: getBMIColor(latestBMIEntry.bmi) }}
              fontSize="large"
            />
            <Box>
              <Typography variant="body2" color="textSecondary">
                BMI Status
              </Typography>
              <Typography variant="h6">{latestBMIStatus}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 6, sm: 2.3, md: 2.3 }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 1.5, sm: 2, md: 2 },
              gap: 1,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: "secondary.main",
            }}
          >
            <FitnessCenterIcon color="secondary" fontSize="large" />
            <Box>
              <Typography variant="body2" color="textSecondary">
                Consistency
              </Typography>
              <Typography variant="h6">
                <CountUp end={streak} duration={0.5} />{" "}
                {streak === 1 ? "day" : "days"}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 3, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              alignItems: "center",
              p: { xs: 1.5, sm: 2, md: 2 },
              gap: 1,
              borderRadius: 2,
              backgroundColor: "background.paper",
              boxShadow: 1,
              borderLeft: "4px solid",
              borderColor: "success.main",
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
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <Button
                  variant="text"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    p: 0,
                    minWidth: "auto",
                  }}
                >
                  {calorieFilter === "week" ? "This Week" : "This Month"}
                </Button>

                <Typography variant="h6">
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
          </Paper>
        </Grid>
      </Grid>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
            },
          }}
        >
          <Tab label="Workout History" />
          <Tab label="Workout Plans" />
          <Tab label="Health Metrics" />
          <Tab label="Step Tracker" />
        </Tabs>
      </Box>

      {/* Workout Tab Content */}
      {activeTab === 0 && (
        <>
          {/* Workout Table */}
          <Card
            variant="outlined"
            sx={{ p: { xs: 2, md: 3 }, mb: { xs: 6, md: 10 } }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" mb={2}>
                {" "}
                Workout History{" "}
              </Typography>
              <Button
                variant="contained"
                color="success"
                startIcon={<ShareIcon />}
                onClick={generateWorkoutShareContent}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                }}
              >
                Share Today
              </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                mb: 2,
                flexWrap: "wrap",
              }}
            >
              <ToggleButtonGroup
                value={workoutFilter}
                exclusive
                onChange={handleWorkoutFilterChange}
                size="small"
                sx={{
                  flexWrap: "wrap",
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    px: { xs: 1.8, sm: 2 },
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  },
                  "& .MuiToggleButton-root.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                  },
                  "& .MuiToggleButton-root.Mui-selected:hover": {
                    backgroundColor: "primary.dark",
                  },
                }}
              >
                <ToggleButton value="today">Today</ToggleButton>
                <ToggleButton value="week">This Week</ToggleButton>
                <ToggleButton value="month">This Month</ToggleButton>
                <ToggleButton value="all">All Time</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TableContainer component={Paper} sx={tableStyles}>
              <Table sx={{ minWidth: 900 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", pr: 8 }}>
                      Date
                    </TableCell>
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
                          {workoutFilter === "today" ? (
                            <>
                              <Typography color="text.primary" sx={{ mb: 2 }}>
                                No activities found for today 💤
                              </Typography>
                              <Typography
                                variant="caption"
                                component="p"
                                sx={{ mb: 2 }}
                              >
                                Taking a rest day? Log it to maintain your
                                streak!
                              </Typography>
                            </>
                          ) : (
                            <Typography color="text.primary" sx={{ mb: 2 }}>
                              "No activities found for this period 💤"
                            </Typography>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              justifyContent: "center",
                              flexWrap: "wrap",
                              mt: 2,
                            }}
                          >
                            <Button
                              variant="contained"
                              startIcon={<FitnessCenterIcon />}
                              onClick={() => setOpenWorkout(true)}
                              size="small"
                            >
                              Add Workout
                            </Button>
                            {workoutFilter === "today" && (
                              <>
                                <Button
                                  variant="contained"
                                  color="info"
                                  startIcon={<BedIcon />}
                                  onClick={() => addRestDay()}
                                  size="small"
                                >
                                  Log Rest Day
                                </Button>
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<ListIcon />}
                                  onClick={() => setActiveTab(1)} // Switch to Workout Plans tab
                                  size="small"
                                >
                                  Use Workout Plan
                                </Button>
                              </>
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
                            {/* Day label */}
                            <TableCell
                              colSpan={1}
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.95rem",
                                py: 1,
                              }}
                            >
                              {day}
                            </TableCell>

                            {/* Calories on the right */}
                            <TableCell
                              colSpan={6}
                              sx={{
                                textAlign: "right",
                              }}
                            >
                              {workoutFilter === "today" && (
                                <Box
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <WhatshotIcon
                                    fontSize="small"
                                    color="error"
                                  />
                                  <Typography
                                    variant="caption"
                                    fontWeight="bold"
                                    color="error.main"
                                  >
                                    Calories burned: {getCaloriesBurnedToday()}{" "}
                                    kcal
                                  </Typography>
                                </Box>
                              )}
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
                                    ? mode === "light"
                                      ? "#f9f9f9"
                                      : "#464646"
                                    : mode === "light"
                                      ? "#f9f9f9"
                                      : "#2d2d2d",

                                  "&:hover": {
                                    backgroundColor: isRestDay
                                      ? mode === "light"
                                        ? "#f9f9f9"
                                        : "#464646"
                                      : mode === "light"
                                        ? "#f9f9f9"
                                        : "#2d2d2d",
                                  },
                                }}
                              >
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    fontWeight="medium"
                                  >
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
                                        <BedIcon
                                          color="info"
                                          fontSize="small"
                                        />
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

                                                {/* Previous Best Indicator */}
                                                {row.sets &&
                                                  row.sets.length > 0 && (
                                                    <PreviousBestIndicator
                                                      exercise={row.exercise}
                                                      currentDate={row.date}
                                                      currentSets={row.sets}
                                                    />
                                                  )}
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
                                                    pr:
                                                      row.sets.length > 3
                                                        ? 1
                                                        : 0,
                                                  }}
                                                >
                                                  {row.sets.map((set, idx) => (
                                                    <Paper
                                                      key={idx}
                                                      variant="outlined"
                                                      sx={{
                                                        pl: 1,
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
                                                            alignItems:
                                                              "center",
                                                            gap: 1,
                                                            fontSize: {
                                                              xs: "0.65rem",
                                                              sm: "0.75rem",
                                                            },
                                                            flexWrap: "wrap",
                                                          }}
                                                        >
                                                          <span
                                                            style={{
                                                              fontWeight:
                                                                "bold",
                                                            }}
                                                          >
                                                            Set {set.setNumber}
                                                          </span>

                                                          <span>•</span>
                                                          <span
                                                            style={{
                                                              fontWeight:
                                                                "bold",
                                                            }}
                                                          >
                                                            {set.reps} reps
                                                          </span>

                                                          <span>×</span>
                                                          <span
                                                            style={{
                                                              fontWeight:
                                                                "bold",
                                                            }}
                                                          >
                                                            {set.weight?.toFixed(
                                                              1,
                                                            )}{" "}
                                                            kg
                                                          </span>

                                                          {/* Optional: Show total for this set */}
                                                          {set.reps &&
                                                            set.weight && (
                                                              <>
                                                                <span>•</span>
                                                                <span
                                                                  style={{
                                                                    fontWeight:
                                                                      "bold",
                                                                  }}
                                                                >
                                                                  Total:{" "}
                                                                  {(
                                                                    set.reps *
                                                                    set.weight
                                                                  ).toFixed(
                                                                    1,
                                                                  )}{" "}
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
                                                (row.cardioType ===
                                                  "treadmill" ||
                                                  row.cardioType === "cycle" ||
                                                  row.cardioType ===
                                                    "airbike") && (
                                                  <Chip
                                                    label={`Avg ${row.avgSpeed.toFixed(1)} ${
                                                      row.cardioType ===
                                                      "treadmill"
                                                        ? row.speedUnit ||
                                                          "km/h"
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
                                                    row.sessions.length > 3
                                                      ? 1
                                                      : 0,
                                                }}
                                              >
                                                {row.sessions.map(
                                                  (session, idx) => (
                                                    <Paper
                                                      key={idx}
                                                      variant="outlined"
                                                      sx={{
                                                        p: 0.5,
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
                                                            alignItems:
                                                              "center",
                                                            gap: 1,
                                                            flexWrap: "wrap",
                                                          }}
                                                        >
                                                          <span
                                                            style={{
                                                              fontWeight:
                                                                "bold",
                                                            }}
                                                          >
                                                            {session.duration}{" "}
                                                            min
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
                                                                  {
                                                                    session.speed
                                                                  }{" "}
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
                                                                <span
                                                                  style={{
                                                                    fontWeight:
                                                                      "bold",
                                                                  }}
                                                                >
                                                                  {
                                                                    session.incline
                                                                  }
                                                                  % incline
                                                                </span>
                                                              </>
                                                            )}

                                                          {session.resistance && (
                                                            <>
                                                              <span>•</span>
                                                              <span
                                                                style={{
                                                                  fontWeight:
                                                                    "bold",
                                                                }}
                                                              >
                                                                Level{" "}
                                                                {
                                                                  session.resistance
                                                                }
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
                                                    : row.intensity ===
                                                        "moderate"
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
                                                    : row.intensity ===
                                                        "moderate"
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
                                          {row.totalWeight?.toFixed(1) || "--"}{" "}
                                          kg
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
                                      flexWrap: "nowrap",
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
        </>
      )}

      {/* Add Exercise Dialog */}
      {activeTab === 1 && (
        <WorkoutPlans
          userId={userId}
          onAddToToday={(exercises) => {
            setAddingPlanExercises(exercises);
            setAddExercisesDialogOpen(true);
          }}
        />
      )}

      {/* Health Metrics Tab Content */}
      {activeTab === 2 && (
        <>
          {/* Chart */}
          <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                flexDirection: { xs: "column", md: "row" },
                gap: { xs: 1, md: 0 },
                mb: 2,
              }}
            >
              <Typography variant="h6">Weight & BMI Progress</Typography>

              <ToggleButtonGroup
                value={chartFilter}
                exclusive
                onChange={handleChartFilterChange}
                size="small"
                sx={{
                  flexWrap: "wrap",
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    px: { xs: 1.2, md: 2 },
                    fontSize: { xs: "0.7rem", md: "0.8rem" },
                  },
                  "& .MuiToggleButton-root.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "primary.contrastText",
                  },
                  "& .MuiToggleButton-root.Mui-selected:hover": {
                    backgroundColor: "primary.dark",
                  },
                }}
              >
                <ToggleButton value="week">Last 7 days</ToggleButton>
                <ToggleButton value="month">Last 30 days</ToggleButton>
                <ToggleButton value="3months">Last 90 days</ToggleButton>
                <ToggleButton value="all">All Time</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <BMIChart
              data={bmiEntries}
              filter={chartFilter}
              getFilteredChartData={getFilteredChartData}
              getWeightStats={getWeightStats}
              getBMIColor={getBMIColor}
              latestBMIEntry={latestBMIEntry}
            />
          </Card>
        </>
      )}

      {/* Step Tracker Tab Content */}
      {activeTab === 3 && <StepTracker userId={userId} />}

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        fullWidth
        maxWidth="xs"
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
          <Button
            variant="contained"
            onClick={() => setDeleteTarget(null)}
            sx={{
              bgcolor: mode === "light" ? "#f9f6ee" : "#333333",
              color: mode === "light" ? "#333333" : "#f9f6ee",
              "&:hover": {
                bgcolor: mode === "light" ? "#f6e4d2" : "#444444",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDeleteWorkout}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Alert Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{alertDialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText
            id="alert-dialog-description"
            sx={{ whiteSpace: "pre-line" }}
          >
            {alertDialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          {alertDialogActions.length > 0 ? (
            alertDialogActions.map((action, index) => (
              <Button
                key={index}
                onClick={action.onClick}
                color={action.color || "primary"}
                variant={action.variant || "text"}
                autoFocus={index === alertDialogActions.length - 1}
              >
                {action.text}
              </Button>
            ))
          ) : (
            <Button onClick={() => setAlertDialogOpen(false)} autoFocus>
              OK
            </Button>
          )}
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
        sx={{
          position: "fixed",
          bottom: { xs: 20, md: 30 },
          right: { xs: 20, md: 30 },
        }}
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
              type="text"
              inputMode="decimal"
              value={weight}
              onChange={handleNumberChange(setWeight, {
                decimal: true,
                max: 400,
                min: 0.1,
              })}
              fullWidth
              margin="dense"
              inputProps={{
                pattern: "[0-9]*\\.?[0-9]*",
                style: { fontSize: "1rem" },
              }}
              error={weight !== "" && Number(weight) <= 0}
              helperText={
                weight !== "" && Number(weight) <= 0
                  ? "Weight must be greater than 0"
                  : ""
              }
            />
            <TextField
              select
              label="Unit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              sx={{ width: { xs: "100%", sm: 100 } }}
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
                type="text"
                inputMode="decimal"
                value={heightCm}
                onChange={handleNumberChange(setHeightCm, {
                  decimal: true,
                  max: 300,
                  min: 1,
                })}
                fullWidth
                margin="dense"
                inputProps={{
                  pattern: "[0-9]*\\.?[0-9]*",
                }}
                error={heightCm !== "" && Number(heightCm) <= 0}
                helperText={
                  heightCm !== "" && Number(heightCm) <= 0
                    ? "Height must be greater than 0"
                    : ""
                }
              />
            ) : (
              <>
                <TextField
                  label="Feet"
                  type="text"
                  inputMode="numeric"
                  value={heightFt}
                  onChange={handleNumberChange(setHeightFt, { max: 8 })}
                  sx={{ width: { xs: "100%", sm: 100 } }}
                  margin="dense"
                  inputProps={{
                    pattern: "[0-9]*",
                  }}
                  error={
                    heightFt !== "" &&
                    (Number(heightFt) < 0 || Number(heightFt) > 8)
                  }
                  helperText={
                    heightFt !== "" && Number(heightFt) < 0
                      ? "Feet cannot be negative"
                      : heightFt !== "" && Number(heightFt) > 8
                        ? "Feet cannot exceed 8"
                        : ""
                  }
                />
                <TextField
                  label="Inches"
                  type="text"
                  inputMode="numeric"
                  value={heightIn}
                  onChange={handleNumberChange(setHeightIn, { max: 11 })}
                  sx={{ width: { xs: "100%", sm: 100 } }}
                  margin="dense"
                  inputProps={{
                    pattern: "[0-9]*",
                  }}
                  error={
                    heightIn !== "" &&
                    (Number(heightIn) < 0 || Number(heightIn) > 11)
                  }
                  helperText={
                    heightIn !== "" && Number(heightIn) < 0
                      ? "Inches cannot be negative"
                      : heightIn !== "" && Number(heightIn) > 11
                        ? "Inches cannot exceed 11"
                        : ""
                  }
                />
              </>
            )}
            <TextField
              select
              label="Unit"
              value={heightUnit}
              onChange={(e) => setHeightUnit(e.target.value)}
              sx={{ width: { xs: "100%", sm: 100 } }}
              margin="dense"
            >
              <MenuItem value="cm">cm</MenuItem>
              <MenuItem value="ft/in">ft/in</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setOpenBMI(false);
              clearBMIForm();
            }}
            sx={{
              bgcolor: mode === "light" ? "#f9f6ee" : "#333333",
              color: mode === "light" ? "#333333" : "#f9f6ee",
              "&:hover": {
                bgcolor: mode === "light" ? "#f6e4d2" : "#444444",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addBMIEntry}
            disabled={
              !weight ||
              Number(weight) <= 0 ||
              (heightUnit === "cm" && (!heightCm || Number(heightCm) <= 0)) ||
              (heightUnit === "ft/in" &&
                ((heightFt && Number(heightFt) < 0) ||
                  (heightIn && Number(heightIn) < 0)))
            }
          >
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
              pr: 4,
              pt: 1,
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
                    color="warning.dark"
                    fontWeight="medium"
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
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Workout Date"
                format="dd-MM-yyyy"
                value={workoutDate ? new Date(workoutDate) : new Date()}
                onChange={(newValue) => {
                  if (newValue) {
                    setWorkoutDate(newValue.toISOString().split("T")[0]);
                  }
                }}
                disableFuture
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal",
                    helperText:
                      workoutDate === new Date().toISOString().split("T")[0] ||
                      !workoutDate
                        ? "Today"
                        : `Logging for ${format(
                            new Date(workoutDate),
                            "dd-MM-yyyy",
                          )}`,
                    FormHelperTextProps: {
                      sx: { ml: "4px" },
                    },
                  },
                }}
              />
            </LocalizationProvider>
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
          {workoutType === "strength" ? (
            // Strength Training with Autocomplete and Simple Quick Chips
            <Box sx={{ position: "relative" }}>
              <Autocomplete
                freeSolo
                value={exercise}
                onChange={(event, newValue) => {
                  setExercise(newValue || "");
                }}
                onInputChange={(event, newInputValue) => {
                  setExercise(newInputValue);
                }}
                options={[...PREDEFINED_STRENGTH_WORKOUTS].sort((a, b) =>
                  a.localeCompare(b),
                )}
                groupBy={(option) => option.charAt(0).toUpperCase()}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Exercise Name"
                    margin="normal"
                    helperText={
                      editingWorkout
                        ? "Exercise name can be edited"
                        : "Select from list, use quick chips, or type your own"
                    }
                    FormHelperTextProps={{
                      sx: {
                        ml: "4px", // aligns with outlined input text
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {exercise && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setExercise("")}
                                edge="end"
                                sx={{ mr: 1 }}
                              ></IconButton>
                            </InputAdornment>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <FitnessCenterIcon
                        fontSize="small"
                        sx={{ mr: 1, opacity: 0.7 }}
                      />
                      {option}
                    </Box>
                  </li>
                )}
              />

              {/* Simple quick select chips for popular exercises */}
              {!exercise && !editingWorkout && (
                <Box sx={{ position: "relative" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1, pl: 0.5 }}
                  >
                    Quick select popular exercises:
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 0.5,
                      mb: 1.5,
                      maxHeight: { xs: 120, md: "none" },
                      overflowY: { xs: "auto", md: "visible" },
                    }}
                  >
                    {[
                      "Bench Press",
                      "Squat",
                      "Deadlift",
                      "Pull-ups",
                      "Shoulder Press",
                      "Barbell Row",
                      "Lunges",
                      "Bicep Curls",
                      "Tricep Extensions",
                      "Leg Press",
                    ].map((workout) => (
                      <Chip
                        key={workout}
                        label={workout}
                        size="small"
                        onClick={() => setExercise(workout)}
                        variant="outlined"
                        sx={{
                          fontSize: "0.75rem",
                          "&:hover": {
                            backgroundColor: "primary.light",
                            color: "primary.main",
                          },
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            // Cardio
            <TextField
              label="Exercise Name"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              fullWidth
              margin="normal"
              helperText={
                editingWorkout
                  ? "Exercise name can be edited"
                  : "Auto-filled based on equipment type"
              }
              InputProps={{
                readOnly: editingWorkout && workoutType === "cardio",
              }}
            />
          )}

          {/* Workout Type Toggle */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 3,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
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
                  gridTemplateColumns: {
                    xs: "0.3fr 0.7fr 1fr auto", // mobile
                    sm: "0.6fr 0.9fr 1.2fr auto", // tablet
                    md: "1fr 1fr 1fr auto", // desktop
                  },
                  gap: 2,
                  mb: 2,
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
                    gridTemplateColumns: {
                      xs: "0.3fr 0.7fr 1fr auto", // mobile
                      sm: "0.6fr 0.9fr 1.2fr auto", // tablet
                      md: "1fr 1fr 1fr auto", // desktop
                    },
                    gap: 2,
                    mb: 2,
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body1">#{set.setNumber}</Typography>
                  <TextField
                    type="text"
                    inputMode="numeric"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={handleNumberChange(
                      (value) => updateSet(index, "reps", value),
                      { max: 100 },
                    )}
                    size="small"
                    inputProps={{
                      pattern: "[0-9]*",
                    }}
                    error={set.reps !== "" && Number(set.reps) < 0}
                    helperText={
                      set.reps !== "" && Number(set.reps) < 0
                        ? "Reps cannot be negative"
                        : ""
                    }
                  />
                  <TextField
                    type="text"
                    inputMode="decimal"
                    placeholder="Weight"
                    value={set.weight}
                    onChange={handleNumberChange(
                      (value) => updateSet(index, "weight", value),
                      { decimal: true, max: 10000, min: 0 },
                    )}
                    size="small"
                    inputProps={{
                      pattern: "[0-9]*\\.?[0-9]*",
                    }}
                    error={set.weight !== "" && Number(set.weight) < 0}
                    helperText={
                      set.weight !== "" && Number(set.weight) < 0
                        ? "Weight cannot be negative"
                        : ""
                    }
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
                variant="contained"
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
                InputProps={{ style: editingWorkout }}
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
                      p: { xs: 1.5, sm: 2 },
                      border: "1px solid #ccc",
                      borderRadius: 1,
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
                      <Grid size={{ xs: 12, sm: 2.6 }}>
                        <TextField
                          label="Duration (min)"
                          type="text"
                          inputMode="decimal"
                          value={session.duration}
                          onChange={handleNumberChange(
                            (value) =>
                              updateCardioSession(
                                session.id,
                                "duration",
                                value,
                              ),
                            { decimal: true },
                          )}
                          fullWidth
                          size="small"
                          required
                          inputProps={{
                            pattern: "[0-9]*\\.?[0-9]*",
                          }}
                          error={
                            session.duration !== "" &&
                            Number(session.duration) < 0
                          }
                          helperText={
                            session.duration !== "" &&
                            Number(session.duration) < 0
                              ? "Duration cannot be negative"
                              : ""
                          }
                        />
                      </Grid>

                      {(cardioType === "treadmill" ||
                        cardioType === "cycle" ||
                        cardioType === "airbike") && (
                        <Grid
                          size={{
                            xs: cardioType === "treadmill" ? 12 : 12,
                            sm: cardioType === "treadmill" ? 2.6 : 2.6,
                          }}
                        >
                          <TextField
                            label={
                              cardioType === "treadmill"
                                ? `Speed (${speedUnit})`
                                : "Speed (RPM)"
                            }
                            type="text"
                            inputMode="decimal"
                            value={session.speed}
                            onChange={handleNumberChange(
                              (value) =>
                                updateCardioSession(session.id, "speed", value),
                              { decimal: true },
                            )}
                            fullWidth
                            size="small"
                            required
                            inputProps={{
                              pattern: "[0-9]*\\.?[0-9]*",
                            }}
                            error={
                              session.speed !== "" && Number(session.speed) < 0
                            }
                            helperText={
                              session.speed !== "" && Number(session.speed) < 0
                                ? "Speed cannot be negative"
                                : ""
                            }
                          />
                        </Grid>
                      )}

                      {/* Speed unit selector (only for treadmill) */}
                      {cardioType === "treadmill" && (
                        <Grid size={{ xs: 12, sm: 2.6 }}>
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
                        <Grid size={{ xs: 12, sm: 2.6 }}>
                          <TextField
                            label="Incline (%)"
                            type="text"
                            inputMode="decimal"
                            value={session.incline}
                            onChange={handleNumberChange(
                              (value) =>
                                updateCardioSession(
                                  session.id,
                                  "incline",
                                  value,
                                ),
                              { decimal: true, max: 20 },
                            )}
                            fullWidth
                            size="small"
                            inputProps={{
                              pattern: "[0-9]*\\.?[0-9]*",
                            }}
                            error={
                              session.incline !== "" &&
                              (Number(session.incline) < 0 ||
                                Number(session.incline) > 20)
                            }
                            helperText={
                              session.incline !== "" &&
                              Number(session.incline) < 0
                                ? "Incline cannot be negative"
                                : session.incline !== "" &&
                                    Number(session.incline) > 20
                                  ? "Incline cannot exceed 20%"
                                  : ""
                            }
                          />
                        </Grid>
                      )}

                      {/* Resistance Level for relevant equipment */}
                      {(cardioType === "crosstrainer" ||
                        cardioType === "cycle" ||
                        cardioType === "airbike" ||
                        cardioType === "stairmaster" ||
                        cardioType === "rowing") && (
                        <Grid size={{ xs: 12, sm: 2.6 }}>
                          <TextField
                            label="Resistance Level"
                            type="text"
                            inputMode="decimal"
                            value={session.resistance || ""}
                            onChange={handleNumberChange(
                              (value) =>
                                updateCardioSession(
                                  session.id,
                                  "resistance",
                                  value,
                                ),
                              { decimal: true },
                            )}
                            fullWidth
                            size="small"
                            placeholder="Optional"
                            inputProps={{
                              pattern: "[0-9]*\\.?[0-9]*",
                            }}
                            error={
                              session.resistance !== "" &&
                              Number(session.resistance) < 0
                            }
                            helperText={
                              session.resistance !== "" &&
                              Number(session.resistance) < 0
                                ? "Resistance cannot be negative"
                                : ""
                            }
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}

                {/* Add Session Button */}
                <Button
                  variant="contained"
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
                type="text"
                inputMode="decimal"
                value={distance}
                onChange={handleNumberChange(
                  (value) => {
                    setDistance(value);
                    setIsDistanceEdited(true);
                  },
                  { decimal: true },
                )}
                fullWidth
                margin="normal"
                inputProps={{
                  pattern: "[0-9]*\\.?[0-9]*",
                }}
                error={distance !== "" && Number(distance) < 0}
                helperText={
                  distance !== "" && Number(distance) < 0
                    ? "Distance cannot be negative"
                    : "Auto-calculated from sessions"
                }
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: { xs: "flex-start", sm: "center" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
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
            variant="contained"
            onClick={() => {
              setOpenWorkout(false);
              clearWorkoutForm();
              setEditingWorkout(null);
            }}
            sx={{
              bgcolor: mode === "light" ? "#f9f6ee" : "#333333",
              color: mode === "light" ? "#333333" : "#f9f6ee",
              "&:hover": {
                bgcolor: mode === "light" ? "#f6e4d2" : "#444444",
              },
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

      {/* Add Exercises Dialog */}
      <AddToWorkoutHandler
        open={addExercisesDialogOpen}
        onClose={() => {
          setAddExercisesDialogOpen(false);
          setAddingPlanExercises([]);
        }}
        exercises={addingPlanExercises}
        onConfirm={processExerciseBatch}
      />

      {/* Changelog Dialog */}
      <ChangelogDialog
        open={changelogDialogOpen}
        onClose={handleChangelogClose}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        title={shareTitle}
        content={shareContent}
        shareData={shareData}
        type="Workout"
      />
    </Container>
  );
}
