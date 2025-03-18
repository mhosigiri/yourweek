import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  updateUserBio,
  updateUserAvailability,
  onUserProfileChange,
  createUserProfile,
} from "@/lib/services/userProfileService";
import {
  UserProfile,
  UserProfileUpdate,
  AvailabilitySlot,
} from "@/lib/types/user";

type ProfileState = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
};

type ProfileActions = {
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
  updateBio: (bio: string) => Promise<void>;
  updateAvailability: (availability: AvailabilitySlot[]) => Promise<void>;
  initializeProfile: () => Promise<void>;
};

// Local storage key for caching the profile
const PROFILE_CACHE_KEY = "userProfileCache";

export function useUserProfile(): ProfileState & ProfileActions {
  const { user, isOnline } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!isOnline);

  // Function to save profile to localStorage
  const cacheProfileLocally = useCallback((profileData: UserProfile) => {
    try {
      localStorage.setItem(
        `${PROFILE_CACHE_KEY}_${profileData.uid}`,
        JSON.stringify({
          profile: profileData,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      console.error("Error caching profile locally:", err);
    }
  }, []);

  // Function to get profile from localStorage
  const getCachedProfile = useCallback((uid: string): UserProfile | null => {
    try {
      const cachedData = localStorage.getItem(`${PROFILE_CACHE_KEY}_${uid}`);
      if (cachedData) {
        const { profile, timestamp } = JSON.parse(cachedData);
        // Check if cache is not too old (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return profile;
        }
      }
    } catch (err) {
      console.error("Error retrieving cached profile:", err);
    }
    return null;
  }, []);

  // Update isOffline when online status changes
  useEffect(() => {
    setIsOffline(!isOnline);
  }, [isOnline]);

  // Initialize profile if it doesn't exist yet
  const initializeProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Check if offline first
      if (isOffline) {
        const cachedProfile = getCachedProfile(user.uid);
        if (cachedProfile) {
          setProfile(cachedProfile);
          setLoading(false);
          return;
        } else {
          throw new Error(
            "You are offline and no cached profile is available."
          );
        }
      }

      // If online, proceed normally
      const existingProfile = await getUserProfile(user.uid);

      if (!existingProfile) {
        // Create a new profile if it doesn't exist
        await createUserProfile(user.uid, {
          displayName: user.displayName || "",
          email: user.email || "",
          emailVerified: user.emailVerified,
        });

        // Fetch the newly created profile
        const newProfile = await getUserProfile(user.uid);
        if (newProfile) {
          setProfile(newProfile);
          // Cache the new profile
          cacheProfileLocally(newProfile);
        }
      } else {
        setProfile(existingProfile);
        // Cache the existing profile
        cacheProfileLocally(existingProfile);
      }
    } catch (err: any) {
      console.error("Error initializing profile:", err);

      // Try to get cached profile as fallback
      if (user) {
        const cachedProfile = getCachedProfile(user.uid);
        if (cachedProfile) {
          setProfile(cachedProfile);
          setError("Using cached profile data while offline.");
        } else {
          setError(err.message || "Failed to initialize user profile");
        }
      } else {
        setError(err.message || "Failed to initialize user profile");
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOffline, getCachedProfile, cacheProfileLocally]);

  // Fetch the user profile manually
  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if offline first
      if (isOffline) {
        const cachedProfile = getCachedProfile(user.uid);
        if (cachedProfile) {
          setProfile(cachedProfile);
          setError("Using cached profile data while offline.");
        } else {
          throw new Error(
            "You are offline and no cached profile is available."
          );
        }
        return;
      }

      // If online, fetch from Firestore
      const userProfile = await getUserProfile(user.uid);
      if (userProfile) {
        setProfile(userProfile);
        // Cache the profile
        cacheProfileLocally(userProfile);
      } else {
        throw new Error(
          "Profile not found. Please try initializing your profile."
        );
      }
    } catch (err: any) {
      console.error("Error fetching profile:", err);

      // Try to get cached profile as fallback
      if (user) {
        const cachedProfile = getCachedProfile(user.uid);
        if (cachedProfile) {
          setProfile(cachedProfile);
          setError("Using cached profile data while offline.");
        } else {
          setError(err.message || "Failed to fetch user profile");
        }
      } else {
        setError(err.message || "Failed to fetch user profile");
      }
    } finally {
      setLoading(false);
    }
  }, [user, isOffline, getCachedProfile, cacheProfileLocally]);

  // Update the entire profile
  const updateProfile = useCallback(
    async (data: UserProfileUpdate) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Check if offline first
        if (isOffline) {
          throw new Error(
            "Cannot update profile while offline. Please connect to the internet and try again."
          );
        }

        await updateUserProfile(user.uid, data);

        // After successful update, refresh the profile to get the latest data
        // This is because onSnapshot might not work when connectivity is intermittent
        const updatedProfile = await getUserProfile(user.uid);
        if (updatedProfile) {
          setProfile(updatedProfile);
          // Cache the updated profile
          cacheProfileLocally(updatedProfile);
        }
      } catch (err: any) {
        console.error("Error updating profile:", err);
        setError(err.message || "Failed to update profile");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, isOffline, cacheProfileLocally]
  );

  // Update just the bio field
  const updateBio = useCallback(
    async (bio: string) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Check if offline first
        if (isOffline) {
          throw new Error(
            "Cannot update bio while offline. Please connect to the internet and try again."
          );
        }

        await updateUserBio(user.uid, bio);

        // After successful update, refresh the profile to get the latest data
        const updatedProfile = await getUserProfile(user.uid);
        if (updatedProfile) {
          setProfile(updatedProfile);
          // Cache the updated profile
          cacheProfileLocally(updatedProfile);
        }
      } catch (err: any) {
        console.error("Error updating bio:", err);
        setError(err.message || "Failed to update bio");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, isOffline, cacheProfileLocally]
  );

  // Update just the availability field
  const updateAvailability = useCallback(
    async (availability: AvailabilitySlot[]) => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Check if offline first
        if (isOffline) {
          throw new Error(
            "Cannot update availability while offline. Please connect to the internet and try again."
          );
        }

        await updateUserAvailability(user.uid, availability);

        // After successful update, refresh the profile to get the latest data
        const updatedProfile = await getUserProfile(user.uid);
        if (updatedProfile) {
          setProfile(updatedProfile);
          // Cache the updated profile
          cacheProfileLocally(updatedProfile);
        }
      } catch (err: any) {
        console.error("Error updating availability:", err);
        setError(err.message || "Failed to update availability");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [user, isOffline, cacheProfileLocally]
  );

  // Set up real-time listener for profile changes with offline fallback
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return () => {};
    }

    setLoading(true);

    // If offline, try to get cached profile
    if (isOffline) {
      const cachedProfile = getCachedProfile(user.uid);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setError("Using cached profile data while offline.");
      } else {
        setError("You are offline and no cached profile is available.");
      }
      setLoading(false);
      // Return a dummy unsubscribe function
      return () => {};
    }

    // If online, subscribe to profile changes
    try {
      const unsubscribe = onUserProfileChange(user.uid, (updatedProfile) => {
        if (updatedProfile) {
          setProfile(updatedProfile);
          // Cache the updated profile
          cacheProfileLocally(updatedProfile);
          setError(null);
        } else {
          // If profile is null but we're online, it might not exist yet
          setError("Profile not found. Please try initializing your profile.");
        }
        setLoading(false);
      });

      // Cleanup function
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up profile listener:", err);

      // Try to get cached profile as fallback
      const cachedProfile = getCachedProfile(user.uid);
      if (cachedProfile) {
        setProfile(cachedProfile);
        setError(
          "Error connecting to the database. Using cached profile data."
        );
      } else {
        setError(
          "Error connecting to the database and no cached profile is available."
        );
      }
      setLoading(false);
      // Return a dummy unsubscribe function
      return () => {};
    }
  }, [user, isOffline, getCachedProfile, cacheProfileLocally]);

  return {
    profile,
    loading,
    error,
    isOffline,
    refreshProfile,
    updateProfile,
    updateBio,
    updateAvailability,
    initializeProfile,
  };
}
