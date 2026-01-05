import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  addDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';

// Firebase configuration loaded from environment variables
// See .env.example for setup instructions
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);

// ============================================
// AUTH FUNCTIONS
// ============================================

export const signup = async (email, password, username) => {
  try {
    const userCred = await createUserWithEmailAndPassword(
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

export const login = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  try {
    return await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ============================================
// SESSION FUNCTIONS
// ============================================

export const createSession = async (hostId, participantIds, duration) => {
  try {
    const sessionRef = await addDoc(collection(db, "sessions"), {
      hostId,
      participants: [hostId, ...participantIds],
      status: "pending",
      duration: parseInt(duration),
      violations: [],
      createdAt: serverTimestamp(),
      startTime: null,
      endTime: null,
    });
    return sessionRef.id;
  } catch (error) {
    throw error;
  }
};

export const startSession = async (sessionId) => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "active",
      startTime: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const endSession = async (sessionId) => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "ended",
      endTime: serverTimestamp(),
    });
  } catch (error) {
    throw error;
  }
};

export const addViolation = async (sessionId, userId, type) => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      violations: arrayUnion({
        userId,
        timestamp: new Date().toISOString(),
        type,
      }),
    });
  } catch (error) {
    throw error;
  }
};

// Real-time listener for single session
export const subscribeToSession = (sessionId, callback) => {
  const sessionRef = doc(db, "sessions", sessionId);
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    }
  });
};

// Get all sessions for a user
export const getUserSessions = async (userId) => {
  try {
    const q = query(
      collection(db, "sessions"),
      where("participants", "array-contains", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    return sessions;
  } catch (error) {
    throw error;
  }
};

// Real-time listener for user sessions
export const subscribeToUserSessions = (userId, callback) => {
  const q = query(
    collection(db, "sessions"),
    where("participants", "array-contains", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const sessions = [];
    snapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    callback(sessions);
  });
};

// ============================================
// USER FUNCTIONS
// ============================================

export const getUser = async (userId) => {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    throw error;
  }
};

export const updateUserStats = async (userId, sessionData) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const currentData = userSnap.data();
      const userViolations = sessionData.violations.filter(
        (v) => v.userId === userId
      ).length;

      await updateDoc(userRef, {
        totalHours: currentData.totalHours + sessionData.duration / 60,
        violations: currentData.violations + userViolations,
        sessionsCompleted: currentData.sessionsCompleted + 1,
      });
    }
  } catch (error) {
    throw error;
  }
};
