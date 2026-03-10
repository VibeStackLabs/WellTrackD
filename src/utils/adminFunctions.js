import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  writeBatch,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

// List of admin emails (add more as needed)
const ADMIN_EMAILS = ["admin@gmail.com"];

// Check if user is admin
export const checkIfUserIsAdmin = async (userId, userEmail) => {
  try {
    // Check admins collection first
    const adminDoc = await getDoc(doc(db, "admins", userId));

    if (adminDoc.exists()) {
      return true;
    }

    // Check if email is in admin list
    if (ADMIN_EMAILS.includes(userEmail)) {
      // Add to admins collection
      await setDoc(doc(db, "admins", userId), {
        email: userEmail,
        role: "admin",
        createdAt: new Date().toISOString(),
        permissions: ["all"],
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Get all users (admin only)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      status: doc.data().status || "active", // Default to 'active' if no status
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      lastActive: doc.data().lastActive?.toDate?.() || null,
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// Update user data
export const updateUser = async (userId, updates) => {
  try {
    await updateDoc(doc(db, "users", userId), updates);
    return true;
  } catch (error) {
    console.error("Error updating user:", error);
    return false;
  }
};

// Enhanced Delete user - Deletes ALL user data from Firestore
export const deleteUser = async (userId) => {
  try {
    // Get user data before deletion
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    const username = userData.username;
    const email = userData.email;

    // Create a batch for all Firestore operations
    const batch = writeBatch(db);

    // Delete all subcollections recursively
    const subcollections = ["workouts", "bodyMetrics", "workoutPlans"];

    // Track what we're deleting
    const deletionCounts = {
      workouts: 0,
      bodyMetrics: 0,
      workoutPlans: 0,
      other: 0,
    };

    for (const subcollection of subcollections) {
      try {
        const subRef = collection(db, "users", userId, subcollection);
        const subSnapshot = await getDocs(subRef);
        subSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          deletionCounts[subcollection] =
            (deletionCounts[subcollection] || 0) + 1;
        });
      } catch (subError) {
        console.log(`No ${subcollection} found for user ${userId}`);
      }
    }

    // Delete username from usernames collection
    if (username) {
      const usernameDoc = doc(db, "usernames", username);
      batch.delete(usernameDoc);
      deletionCounts.other++;
    }

    // Delete user from admins collection if exists
    try {
      const adminRef = doc(db, "admins", userId);
      const adminDoc = await getDoc(adminRef);
      if (adminDoc.exists()) {
        batch.delete(adminRef);
        deletionCounts.other++;
      }
    } catch (adminError) {
      console.log("No admin record found or error deleting admin record");
    }

    // Delete from flaggedUsers if exists
    try {
      const flaggedRef = doc(db, "flaggedUsers", userId);
      const flaggedDoc = await getDoc(flaggedRef);
      if (flaggedDoc.exists()) {
        batch.delete(flaggedRef);
        deletionCounts.other++;
      }
    } catch (flaggedError) {
      // Ignore if doesn't exist
    }

    // Delete user document from users collection
    const userRef = doc(db, "users", userId);
    batch.delete(userRef);

    // Execute the batch
    await batch.commit();

    return {
      success: true,
      userData,
      deletionCounts,
      message: "All user data deleted from Firestore successfully",
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
};

// Detailed delete with more information
export const deleteUserWithDetails = async (userId) => {
  const results = {
    userData: null,
    deletedCounts: {
      workouts: 0,
      bodyMetrics: 0,
      workoutPlans: 0,
      other: 0,
    },
    success: false,
    warnings: [],
    error: null,
  };

  try {
    // Get user data first
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      results.error = "User not found";
      return results;
    }

    results.userData = userDoc.data();
    const username = results.userData.username;

    // Start batch
    const batch = writeBatch(db);

    // Delete workouts
    try {
      const workoutsRef = collection(db, "users", userId, "workouts");
      const workoutsSnapshot = await getDocs(
        query(workoutsRef, orderBy("createdAt", "desc")),
      );
      workoutsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        results.deletedCounts.workouts++;
      });
    } catch (e) {
      results.warnings.push("No workouts found or error deleting workouts");
    }

    // Delete body metrics
    try {
      const bodyMetricsRef = collection(db, "users", userId, "bodyMetrics");
      const bodyMetricsSnapshot = await getDocs(
        query(bodyMetricsRef, orderBy("createdAt", "desc")),
      );
      bodyMetricsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        results.deletedCounts.bodyMetrics++;
      });
    } catch (e) {
      results.warnings.push(
        "No body metrics found or error deleting body metrics",
      );
    }

    // Delete workout plans
    try {
      const workoutPlansRef = collection(db, "users", userId, "workoutPlans");
      const workoutPlansSnapshot = await getDocs(workoutPlansRef);
      workoutPlansSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        results.deletedCounts.workoutPlans++;
      });
    } catch (e) {
      results.warnings.push(
        "No workout plans found or error deleting workout plans",
      );
    }

    // Delete username
    if (username) {
      try {
        const usernameDoc = doc(db, "usernames", username);
        const usernameDocSnap = await getDoc(usernameDoc);
        if (usernameDocSnap.exists()) {
          batch.delete(usernameDoc);
          results.deletedCounts.other++;
        }
      } catch (e) {
        results.warnings.push("Error deleting username mapping");
      }
    } else {
      results.warnings.push("No username found to delete");
    }

    // Delete admin record if exists
    try {
      const adminRef = doc(db, "admins", userId);
      const adminDoc = await getDoc(adminRef);
      if (adminDoc.exists()) {
        batch.delete(adminRef);
        results.deletedCounts.other++;
        results.warnings.push(
          "User was also an admin - admin permissions removed",
        );
      }
    } catch (e) {
      // Ignore
    }

    // Delete from flaggedUsers if exists
    try {
      const flaggedRef = doc(db, "flaggedUsers", userId);
      const flaggedDoc = await getDoc(flaggedRef);
      if (flaggedDoc.exists()) {
        batch.delete(flaggedRef);
        results.deletedCounts.other++;
      }
    } catch (e) {
      // Ignore
    }

    // Finally delete the user document
    const userRef = doc(db, "users", userId);
    batch.delete(userRef);

    // Commit the batch
    await batch.commit();

    results.success = true;
    return results;
  } catch (error) {
    console.error("Error in detailed user deletion:", error);
    results.error = error.message;
    return results;
  }
};

// Send password reset email
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent successfully" };
  } catch (error) {
    console.error("Error sending password reset:", error);
    return {
      success: false,
      message: error.message || "Failed to send password reset email",
    };
  }
};

// Toggle user status (active/suspended)
export const toggleUserStatus = async (userId, currentStatus) => {
  try {
    const newStatus = currentStatus === "active" ? "suspended" : "active";

    // Update the user document with the new status
    await updateDoc(doc(db, "users", userId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      suspendedAt: newStatus === "suspended" ? new Date().toISOString() : null,
    });

    return { success: true, newStatus };
  } catch (error) {
    console.error("Error toggling user status:", error);
    return { success: false, error };
  }
};

// Get system stats
export const getSystemStats = async () => {
  try {
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // Calculate active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = usersSnapshot.docs.filter((doc) => {
      const userData = doc.data();
      const lastActive =
        userData.lastActive?.toDate?.() || userData.createdAt?.toDate?.();
      return lastActive && lastActive >= thirtyDaysAgo;
    }).length;

    // Get new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersLast7Days = usersSnapshot.docs.filter((doc) => {
      const createdAt = doc.data().createdAt?.toDate?.();
      return createdAt && createdAt >= sevenDaysAgo;
    }).length;

    return {
      totalUsers,
      activeUsers,
      newUsersLast7Days,
      serverStatus: "online",
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      newUsersLast7Days: 0,
      serverStatus: "error",
      error: error.message,
    };
  }
};

// Simple client-side logging (no Firebase)
export const logAdminAction = (adminId, action, target, details = {}) => {
  const logEntry = {
    adminId,
    action,
    target,
    details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  console.log("Admin Action:", logEntry);

  // Store in localStorage temporarily (max 100 entries)
  try {
    const logs = JSON.parse(localStorage.getItem("adminLogs") || "[]");
    logs.unshift(logEntry); // Add to beginning
    if (logs.length > 100) logs.pop(); // Keep only last 100
    localStorage.setItem("adminLogs", JSON.stringify(logs));
  } catch (error) {
    console.error("Error saving admin log locally:", error);
  }
};
