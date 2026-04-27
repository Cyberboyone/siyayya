import { collection, query, where, getDocs } from "firebase/firestore";
import { db, isFirebaseDisabled } from "./firebase";

/**
 * 🟢 Isolated Business Name Validation
 * Checks if a business name is already taken in the Firestore database.
 * 
 * @param name The business name to check
 * @param currentUserId Optional ID to ignore (for edit mode)
 * @returns Promise<boolean> True if taken, False if available
 */
export async function isBusinessNameTaken(name: string, currentUserId?: string): Promise<boolean> {
  if (!name || name.trim().length < 3) {
    return false; // Not "taken" because it's too short to be valid anyway
  }

  try {
    // 1. Normalize input (Requirement: trim and lowercase)
    const normalizedName = name.trim().toLowerCase();
    
    console.log(`[Validation] Checking uniqueness for: "${normalizedName}"`);
    
    // 2. Query properly (Firestore indexed search)
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("businessNameLower", "==", normalizedName));
    
    // 3. Ensure validation finishes before proceeding (Requirement: await)
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // 4. Fallback for legacy data that doesn't have businessNameLower yet
      const legacyQ = query(usersRef, where("businessName", "==", name.trim()));
      const legacySnapshot = await getDocs(legacyQ);
      
      if (legacySnapshot.empty) return false;
      
      // If found in legacy, check ownership
      return !legacySnapshot.docs.every(doc => doc.id === currentUserId);
    }
    
    // 5. Only block if result exists AND owner is NOT current user
    const isTakenByOthers = querySnapshot.docs.some(doc => doc.id !== currentUserId);
    
    console.log(`[Validation] Result for "${normalizedName}": ${isTakenByOthers ? 'TAKEN' : 'AVAILABLE'}`);
    return isTakenByOthers;
  } catch (error) {
    console.error("[Validation Error] Failed to check business name uniqueness:", error);
    // Safety fallback: if we can't check, we don't block unless we are sure.
    // However, to prevent duplicates, returning false (available) is risky.
    // But returning true (taken) on error causes the "false positive" bug the user reported.
    // The requirement says: "It should ONLY return 'already exists' if there is a real match in the database."
    return false; 
  }
}
