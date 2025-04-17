import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier as FirebaseRecaptchaVerifier,
  signOut,
  Auth,
  User,
  ConfirmationResult,
  ApplicationVerifier
} from "firebase/auth";
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentSingleTabManager,
  Firestore
} from "firebase/firestore";

// Firebase configuration (from environment variables for security)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (Prevent multiple initializations in Next.js)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with optimized configuration for offline support and better performance
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({
      forceOwnership: true
    }),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

// Export services for use across the app
export const auth: Auth = getAuth(app);

// Authentication helper functions
export const signInWithEmail = (email: string, password: string) => 
  signInWithEmailAndPassword(auth, email, password);

export const createUser = (email: string, password: string) => 
  createUserWithEmailAndPassword(auth, email, password);

export const resetPassword = (email: string) => 
  sendPasswordResetEmail(auth, email);

export const phoneSignIn = (phoneNumber: string, appVerifier: ApplicationVerifier): Promise<ConfirmationResult> => 
  signInWithPhoneNumber(auth, phoneNumber, appVerifier);

export const logOut = () => signOut(auth);

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => 
  Math.floor(100000 + Math.random() * 900000).toString();

// Re-export RecaptchaVerifier with the original name
export const RecaptchaVerifier = FirebaseRecaptchaVerifier;

export default app; 