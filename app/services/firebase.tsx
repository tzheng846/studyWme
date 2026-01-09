import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseApp, initializeApp } from "firebase/app";
import {
  Auth,
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  GoogleAuthProvider,
  initializeAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Violation severity categories based on duration
 * - minor: < 30 seconds
 * - medium: 30 seconds - 2 minutes
 * - large: 2 minutes - 5 minutes
 * - catastrophic: > 5 minutes (immediately fails session)
 */
export type ViolationCategory = "minor" | "medium" | "large" | "catastrophic";

/**
 * Represents a violation during a study session
 */
export interface Violation {
  userId: string;
  timestamp: string;
  type: string;
  durationSeconds: number;
  category: ViolationCategory;
}

/**
 * Session outcome
 * - successful: Everyone made it to the end with < 5 min total violations
 * - failed: Someone left early OR someone had catastrophic violation
 */
export type SessionOutcome = "successful" | "failed";

/**
 * Represents a study session in Firestore
 */
export interface Session {
  id: string;
  hostId: string;
  participants: string[];
  status: "pending" | "active" | "ended";
  duration: number; // in minutes
  violations: Violation[];
  createdAt: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  roomCode: string; // 6-digit numeric code for joining
  outcome?: SessionOutcome | null; // null while active, set when ended
  failReason?: string | null; // reason for failure if failed
}

/**
 * Represents a user in Firestore
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  totalHours: number;
  violations: number;
  sessionsCompleted: number;
  createdAt: Date;
}

/**
 * Firebase configuration object structure
 */
interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
}

// ============================================
// FIREBASE INITIALIZATION
// ============================================

// Firebase configuration loaded from environment variables
// See .env.example for setup instructions
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db: Firestore = getFirestore(app);

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Creates a new user account and profile
 * @param email - User's email address
 * @param password - User's password
 * @param username - User's display name
 * @returns Promise resolving to the created User object
 * @throws Error if signup fails
 */
export const signup = async (
  email: string,
  password: string,
  username: string
): Promise<User> => {
  try {
    const userCred: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await setDoc(doc(db, "users", userCred.user.uid), {
      username,
      email,
      totalHours: 0,
      violations: 0,
      sessionsCompleted: 0,
      createdAt: new Date(),
    });
    return userCred.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Logs in an existing user
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to UserCredential
 * @throws Error if login fails
 */
export const login = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw error;
  }
};

/**
 * Signs in with Google using ID token from OAuth flow
 * @param idToken - Google ID token from expo-auth-session
 * @returns Promise resolving to UserCredential
 * @throws Error if Google sign-in fails
 */
export const signInWithGoogle = async (idToken: string): Promise<User> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCred = await signInWithCredential(auth, credential);

    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db, "users", userCred.user.uid));
    if (!userDoc.exists()) {
      // Create user profile for new Google users
      await setDoc(doc(db, "users", userCred.user.uid), {
        username: userCred.user.displayName || userCred.user.email?.split('@')[0] || 'User',
        email: userCred.user.email || '',
        totalHours: 0,
        violations: 0,
        sessionsCompleted: 0,
        createdAt: new Date(),
      });
    }

    return userCred.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Logs out the current user
 * @returns Promise that resolves when logout is complete
 * @throws Error if logout fails
 */
export const logout = async (): Promise<void> => {
  try {
    return await signOut(auth);
  } catch (error) {
    throw error;
  }
};

/**
 * Listens for authentication state changes
 * @param callback - Function called when auth state changes
 * @returns Unsubscribe function to stop listening
 */
export const onAuthChange = (
  callback: (user: User | null) => void
): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// ============================================
// SESSION FUNCTIONS
// ============================================

/**
 * Creates a new study session
 * @param hostId - ID of the user hosting the session
 * @param participantIds - Array of participant user IDs
 * @param duration - Session duration in minutes
 * @returns Promise resolving to the new session ID
 * @throws Error if session creation fails
 */
export const createSession = async (
  hostId: string,
  participantIds: string[],
  duration: number
): Promise<string> => {
  try {
    const roomCode = await generateRoomCode();

    const sessionRef: DocumentReference<DocumentData> = await addDoc(
      collection(db, "sessions"),
      {
        hostId,
        participants: [hostId, ...participantIds],
        status: "pending",
        duration: parseInt(duration.toString()),
        violations: [],
        createdAt: serverTimestamp(),
        startTime: null,
        endTime: null,
        roomCode,
      }
    );
    return sessionRef.id;
  } catch (error) {
    throw error;
  }
};

/**
 * Starts an existing session
 * @param sessionId - ID of the session to start
 * @returns Promise that resolves when session is started
 * @throws Error if session start fails
 */
export const startSession = async (sessionId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "active",
      startTime: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Categorizes a violation based on duration
 * @param durationSeconds - Duration of the violation in seconds
 * @returns The violation category
 */
export const getViolationCategory = (durationSeconds: number): ViolationCategory => {
  if (durationSeconds < 30) return "minor";
  if (durationSeconds < 120) return "medium"; // 2 minutes
  if (durationSeconds < 300) return "large"; // 5 minutes
  return "catastrophic";
};

/**
 * Gets total violation time for a user in a session
 * @param violations - Array of violations
 * @param userId - User ID to filter by
 * @returns Total violation time in seconds
 */
export const getUserTotalViolationTime = (
  violations: Violation[],
  userId: string
): number => {
  return violations
    .filter((v) => v.userId === userId)
    .reduce((total, v) => total + v.durationSeconds, 0);
};

/**
 * Checks if a session is successful based on violations
 * A session is successful if no one has >= 5 minutes total violations
 * @param violations - Array of violations
 * @param participants - Array of participant IDs
 * @returns true if session would be successful
 */
export const isSessionSuccessful = (
  violations: Violation[],
  participants: string[]
): boolean => {
  const MAX_VIOLATION_SECONDS = 300; // 5 minutes

  for (const participantId of participants) {
    const totalTime = getUserTotalViolationTime(violations, participantId);
    if (totalTime >= MAX_VIOLATION_SECONDS) {
      return false;
    }
  }
  return true;
};

/**
 * Ends an active session with outcome determination
 * @param sessionId - ID of the session to end
 * @param outcome - Whether session was successful or failed
 * @param failReason - Optional reason for failure
 * @returns Promise that resolves when session is ended
 * @throws Error if session end fails
 */
export const endSession = async (
  sessionId: string,
  outcome: SessionOutcome = "successful",
  failReason?: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "ended",
      endTime: serverTimestamp(),
      outcome,
      failReason: failReason || null,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Immediately fails and terminates a session (for catastrophic violations)
 * @param sessionId - ID of the session to terminate
 * @param reason - Reason for termination
 * @returns Promise that resolves when session is terminated
 */
export const terminateSession = async (
  sessionId: string,
  reason: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "ended",
      endTime: serverTimestamp(),
      outcome: "failed" as SessionOutcome,
      failReason: reason,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Adds a violation to a session
 * @param sessionId - ID of the session
 * @param userId - ID of the user who violated rules
 * @param type - Type of violation (e.g., "app-switch")
 * @param durationSeconds - Duration of the violation in seconds
 * @returns Object with violation info and whether it was catastrophic
 * @throws Error if adding violation fails
 */
export const addViolation = async (
  sessionId: string,
  userId: string,
  type: string,
  durationSeconds: number
): Promise<{ category: ViolationCategory; isCatastrophic: boolean }> => {
  try {
    const category = getViolationCategory(durationSeconds);

    await updateDoc(doc(db, "sessions", sessionId), {
      violations: arrayUnion({
        userId,
        timestamp: new Date().toISOString(),
        type,
        durationSeconds,
        category,
      }),
    });

    return {
      category,
      isCatastrophic: category === "catastrophic",
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Real-time listener for a single session
 * @param sessionId - ID of the session to listen to
 * @param callback - Function called when session data changes (null if deleted)
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToSession = (
  sessionId: string,
  callback: (session: Session | null) => void
): Unsubscribe => {
  const sessionRef = doc(db, "sessions", sessionId);
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Session);
    } else {
      callback(null);
    }
  });
};

/**
 * Gets all sessions for a specific user
 * @param userId - ID of the user
 * @returns Promise resolving to array of sessions
 * @throws Error if query fails
 */
export const getUserSessions = async (userId: string): Promise<Session[]> => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("participants", "array-contains", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const sessions: Session[] = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as Session);
    });
    return sessions;
  } catch (error) {
    throw error;
  }
};

/**
 * Real-time listener for all of a user's sessions
 * @param userId - ID of the user
 * @param callback - Function called when sessions change
 * @returns Unsubscribe function to stop listening
 */
export const subscribeToUserSessions = (
  userId: string,
  callback: (sessions: Session[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, "sessions"),
    where("participants", "array-contains", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const sessions: Session[] = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as Session);
    });
    callback(sessions);
  });
};

/**
 * Generates a unique 6-digit numeric room code
 * @returns Promise resolving to a unique room code string
 * @throws Error if generation fails
 */
export const generateRoomCode = async (): Promise<string> => {
  try {
    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Check for collisions in active/pending sessions
    const q = query(
      collection(db, "sessions"),
      where("roomCode", "==", code),
      where("status", "in", ["pending", "active"])
    );
    const snapshot = await getDocs(q);

    // Recursively generate new code if collision detected
    if (!snapshot.empty) {
      return generateRoomCode();
    }

    return code;
  } catch (error) {
    throw error;
  }
};

/**
 * Finds a session by its room code
 * @param roomCode - The 6-digit room code
 * @returns Promise resolving to Session or null if not found
 * @throws Error if query fails
 */
export const getSessionByRoomCode = async (
  roomCode: string
): Promise<Session | null> => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("roomCode", "==", roomCode),
      where("status", "in", ["pending", "active"])
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Session;
  } catch (error) {
    throw error;
  }
};

/**
 * Adds a user to a session using room code
 * @param roomCode - The 6-digit room code
 * @param userId - ID of the user joining
 * @returns Promise resolving to session ID
 * @throws Error if session not found, already active, or join fails
 */
export const joinSessionByCode = async (
  roomCode: string,
  userId: string
): Promise<string> => {
  try {
    const session = await getSessionByRoomCode(roomCode);

    if (!session) {
      throw new Error("Session not found. Please check the room code.");
    }

    if (session.status === "active") {
      throw new Error("Session already started. Cannot join now.");
    }

    if (session.status === "ended") {
      throw new Error("Session has ended.");
    }

    // Check if user is already a participant
    if (session.participants.includes(userId)) {
      return session.id; // Already joined, just return session ID
    }

    // Add user to participants array
    await updateDoc(doc(db, "sessions", session.id), {
      participants: arrayUnion(userId),
    });

    return session.id;
  } catch (error) {
    throw error;
  }
};

// ============================================
// USER FUNCTIONS
// ============================================

/**
 * Gets a user's profile by their ID
 * @param userId - ID of the user
 * @returns Promise resolving to user profile or null if not found
 * @throws Error if query fails
 */
export const getUser = async (userId: string): Promise<UserProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as UserProfile)
      : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Finds a user by their email address
 * @param email - User's email address
 * @returns Promise resolving to user profile or null if not found
 * @throws Error if query fails
 */
export const getUserByEmail = async (
  email: string
): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserProfile;
  } catch (error) {
    throw error;
  }
};

/**
 * Updates a user's statistics after a session ends
 * - Successful sessions: Update hours, violations count, and sessions completed
 * - Failed sessions: Only update violations count
 * @param userId - ID of the user to update
 * @param sessionData - The completed session data
 * @returns Promise that resolves when stats are updated
 * @throws Error if update fails
 */
export const updateUserStats = async (
  userId: string,
  sessionData: Session
): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentData = userSnap.data();
      const userViolationCount: number = sessionData.violations.filter(
        (v: Violation) => v.userId === userId
      ).length;

      const isSuccessful = sessionData.outcome === "successful";

      if (isSuccessful) {
        // Successful session: update all stats
        await updateDoc(userRef, {
          totalHours: currentData.totalHours + sessionData.duration / 60,
          violations: currentData.violations + userViolationCount,
          sessionsCompleted: currentData.sessionsCompleted + 1,
        });
      } else {
        // Failed session: only update violations
        await updateDoc(userRef, {
          violations: currentData.violations + userViolationCount,
        });
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Cancels/deletes a pending session
 * @param sessionId - ID of the session to cancel
 * @returns Promise that resolves when session is deleted
 * @throws Error if deletion fails
 */
export const cancelSession = async (sessionId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "sessions", sessionId));
  } catch (error) {
    throw error;
  }
};

/**
 * Gets a user's current active or pending session (if any)
 * Users should only be in one lobby at a time
 * @param userId - ID of the user
 * @returns Promise resolving to Session or null if not in any session
 * @throws Error if query fails
 */
export const getUserActiveSession = async (
  userId: string
): Promise<Session | null> => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("participants", "array-contains", userId),
      where("status", "in", ["pending", "active"])
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    // Return the most recent one if multiple exist
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Session;
  } catch (error) {
    throw error;
  }
};

/**
 * Removes a participant from a session
 * @param sessionId - ID of the session
 * @param userId - ID of the user to remove
 * @returns Promise that resolves when user is removed
 * @throws Error if removal fails
 */
export const leaveSession = async (
  sessionId: string,
  userId: string
): Promise<void> => {
  try {
    const sessionRef = doc(db, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) return;

    const sessionData = sessionSnap.data();
    const updatedParticipants = sessionData.participants.filter(
      (id: string) => id !== userId
    );

    await updateDoc(sessionRef, {
      participants: updatedParticipants,
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Deletes all sessions for a user and resets their stats to 0
 * @param userId - ID of the user
 * @returns Promise that resolves when complete
 * @throws Error if wipe fails
 */
export const wipeUserHistory = async (userId: string): Promise<void> => {
  try {
    // 1. Get all user sessions
    const sessions = await getUserSessions(userId);

    // 2. Delete each session document
    for (const session of sessions) {
      await deleteDoc(doc(db, "sessions", session.id));
    }

    // 3. Reset user stats to 0
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      totalHours: 0,
      violations: 0,
      sessionsCompleted: 0,
    });
  } catch (error) {
    throw error;
  }
};
