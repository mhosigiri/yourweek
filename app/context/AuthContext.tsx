"use client";

import {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, DocumentData, onSnapshot } from "firebase/firestore";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/authHelpers";

interface AuthContextType {
  user: User | null;
  userProfile: DocumentData | null;
  loading: boolean;
  isOnline: boolean;
}

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isOnline: true,
});

interface AuthContextProviderProps {
  children: ReactNode;
}

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Auth context provider component
export const AuthContextProvider = ({ children }: AuthContextProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Get cached profile from localStorage
  const getCachedProfile = (userId: string): DocumentData | null => {
    try {
      const cachedProfile = localStorage.getItem(`userProfile_${userId}`);
      if (cachedProfile) {
        const { data, timestamp } = JSON.parse(cachedProfile);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error("Error reading from cache:", error);
    }
    return null;
  };

  // Cache profile in localStorage
  const cacheProfile = (userId: string, data: DocumentData): void => {
    try {
      localStorage.setItem(
        `userProfile_${userId}`,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (error) {
      console.error("Error caching profile:", error);
    }
  };

  // Set up real-time listener for user profile
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupProfileListener = async (userId: string) => {
      try {
        // First, try to get cached data
        const cachedData = getCachedProfile(userId);
        if (cachedData) {
          setUserProfile(cachedData);
        }

        // Set up real-time listener
        const userDoc = doc(db, "users", userId);
        unsubscribe = onSnapshot(
          userDoc,
          (doc) => {
            if (doc.exists()) {
              const data = doc.data();
              setUserProfile(data);
              cacheProfile(userId, data);
            }
          },
          (error) => {
            console.error("Error in profile listener:", error);
            // If offline, try to use cached data
            if (
              error.code === "failed-precondition" ||
              error.message.includes("offline")
            ) {
              const cachedData = getCachedProfile(userId);
              if (cachedData) {
                setUserProfile(cachedData);
              }
            }
          }
        );
      } catch (error) {
        console.error("Error setting up profile listener:", error);
        // If offline, try to use cached data
        const cachedData = getCachedProfile(userId);
        if (cachedData) {
          setUserProfile(cachedData);
        }
      }
    };

    if (user?.uid) {
      setupProfileListener(user.uid);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user?.uid]);

  // Handle auth state changes
  useEffect(() => {
    let isActive = true;
    setLoading(true);

    const handleAuth = async (currentUser: User | null) => {
      if (!isActive) return;

      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        clearSessionCookie(); // Clear the session cookie when user is logged out
        setLoading(false);
        return;
      }

      try {
        setUser(currentUser);

        // Try to get cached data immediately
        const cachedData = getCachedProfile(currentUser.uid);
        if (cachedData) {
          setUserProfile(cachedData);
        }

        // Set the session cookie for the middleware
        await setSessionCookie();

        setLoading(false);
      } catch (error) {
        console.error("Error in auth state change handler:", error);
        if (isActive) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleAuth);

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isOnline }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
