import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Get all changelog entries (for admin panel - shows all)
export const getChangelogEntries = async () => {
  try {
    const q = query(collection(db, "changelog"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching changelog:", error);
    return [];
  }
};

// Get single changelog entry
export const getChangelogEntry = async (id) => {
  try {
    const docRef = doc(db, "changelog", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error fetching changelog entry:", error);
    return null;
  }
};

// Add new changelog entry
export const addChangelogEntry = async (entry) => {
  try {
    const entryWithMetadata = {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "changelog"), entryWithMetadata);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding changelog entry:", error);
    return { success: false, error };
  }
};

// Update changelog entry
export const updateChangelogEntry = async (id, updates) => {
  try {
    await updateDoc(doc(db, "changelog", id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating changelog entry:", error);
    return { success: false, error };
  }
};

// Delete changelog entry
export const deleteChangelogEntry = async (id) => {
  try {
    await deleteDoc(doc(db, "changelog", id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting changelog entry:", error);
    return { success: false, error };
  }
};

// Get latest changelog entries for display (published only)
export const getPublishedChangelog = async (limit = 10) => {
  try {
    // IMPORTANT: Add where clause to filter published entries
    const q = query(
      collection(db, "changelog"),
      where("published", "==", true), // Add this line
      orderBy("date", "desc"),
    );
    const snapshot = await getDocs(q);

    const entries = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .slice(0, limit); // Remove the .filter() since we're querying with where

    return entries;
  } catch (error) {
    console.error("Error fetching published changelog:", error);
    return [];
  }
};
