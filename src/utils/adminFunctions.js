import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
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

// Delete user
export const deleteUser = async (userId) => {
  try {
    // Get user data before deletion
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();

    // Delete from users collection
    await deleteDoc(doc(db, "users", userId));

    // Delete from usernames collection if exists
    if (userData?.username) {
      try {
        await deleteDoc(doc(db, "usernames", userData.username));
      } catch (err) {
        console.log("Username cleanup skipped:", err);
      }
    }

    // Remove from admins collection if exists
    try {
      await deleteDoc(doc(db, "admins", userId));
    } catch (err) {
      console.log("Admin cleanup skipped:", err);
    }

    return { success: true, userData };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error };
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

// Log admin action
// export const logAdminAction = async (adminId, action, target, details = {}) => {
//   try {
//     await setDoc(doc(collection(db, "adminLogs")), {
//       adminId,
//       action,
//       target,
//       details,
//       timestamp: new Date().toISOString(),
//       ip: details.ip || "unknown",
//       userAgent: navigator.userAgent,
//     });
//   } catch (error) {
//     console.error("Error logging admin action:", error);
//   }
// };

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

  // Optional: Store in localStorage temporarily (max 100 entries)
  try {
    const logs = JSON.parse(localStorage.getItem("adminLogs") || "[]");
    logs.unshift(logEntry); // Add to beginning
    if (logs.length > 100) logs.pop(); // Keep only last 100
    localStorage.setItem("adminLogs", JSON.stringify(logs));
  } catch (error) {
    console.error("Error saving admin log locally:", error);
  }
};
