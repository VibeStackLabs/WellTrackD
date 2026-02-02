import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// List of admin emails
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
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
    // Delete from users collection
    await deleteDoc(doc(db, "users", userId));

    // Also delete from usernames collection if exists
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        await deleteDoc(doc(db, "usernames", userData.username));
      }
    } catch (err) {
      console.log("Username cleanup skipped:", err);
    }

    // Remove from admins collection if exists
    try {
      await deleteDoc(doc(db, "admins", userId));
    } catch (err) {
      console.log("Admin cleanup skipped:", err);
    }

    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};

// Log admin action
export const logAdminAction = async (adminId, action, target, details = {}) => {
  try {
    await setDoc(doc(collection(db, "adminLogs")), {
      adminId,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || "unknown",
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
};

// Get system stats
export const getSystemStats = async () => {
  try {
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    const totalUsers = usersSnapshot.size;

    // You can add more stats here (workouts, exercises, etc.)
    return {
      totalUsers,
      newUsersLast7Days: 0, // Implement date-based filtering
      activeUsers: 0,
      serverStatus: "online",
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { totalUsers: 0, error: error.message };
  }
};
