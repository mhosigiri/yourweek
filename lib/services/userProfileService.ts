import { db, auth } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  Timestamp,
  FirestoreError,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
  limit,
  or
} from 'firebase/firestore';
import { UserProfile, UserProfileUpdate, AvailabilitySlot, UserSearchResult } from '@/lib/types/user';

const USERS_COLLECTION = 'users';

/**
 * Check if a Firestore error is due to being offline
 */
function isOfflineError(error: any): boolean {
  if (error instanceof FirestoreError) {
    // FirestoreError with failed-precondition or unavailable code typically means offline
    return error.code === 'failed-precondition' || 
           error.code === 'unavailable' || 
           error.message.includes('offline') || 
           error.message.includes('network');
  }
  // For other error types, check the message
  if (error instanceof Error) {
    return error.message.includes('offline') || 
           error.message.includes('network') || 
           error.message.includes('connection');
  }
  return false;
}

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(
  uid: string, 
  data: { 
    displayName: string; 
    email: string; 
    emailVerified?: boolean;
  }
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    // Default availability - set all days of the week
    const defaultAvailability: AvailabilitySlot[] = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ].map(day => ({
      day: day as AvailabilitySlot['day'],
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: day !== 'saturday' && day !== 'sunday' // Weekdays available by default
    }));

    const userData: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: any;
      updatedAt: any;
    } = {
      uid,
      displayName: data.displayName || data.email.split('@')[0], // Use part of email as fallback
      email: data.email,
      bio: '',
      availability: defaultAvailability,
      emailVerified: data.emailVerified || false,
      following: [], // Initialize with empty following array
      followers: [], // Initialize with empty followers array
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, userData);
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot create profile while offline. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Get a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return null;
    }
    
    const userData = userSnap.data() as UserProfile;
    
    // Convert Firestore timestamps to JS Dates
    return {
      ...userData,
      createdAt: userData.createdAt instanceof Timestamp 
        ? userData.createdAt.toDate() 
        : userData.createdAt,
      updatedAt: userData.updatedAt instanceof Timestamp 
        ? userData.updatedAt.toDate() 
        : userData.updatedAt
    };
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Failed to get document because the client is offline.');
    }
    throw error;
  }
}

/**
 * Update a user profile
 */
export async function updateUserProfile(
  uid: string, 
  data: UserProfileUpdate
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot update profile while offline. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Update a user's bio
 */
export async function updateUserBio(uid: string, bio: string): Promise<void> {
  return updateUserProfile(uid, { bio });
}

/**
 * Update a user's availability
 */
export async function updateUserAvailability(
  uid: string, 
  availability: AvailabilitySlot[]
): Promise<void> {
  return updateUserProfile(uid, { availability });
}

/**
 * Set up a listener for real-time updates to a user profile
 */
export function onUserProfileChange(
  uid: string,
  callback: (profile: UserProfile | null) => void
): () => void {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    
    return onSnapshot(userRef, (doc) => {
      if (!doc.exists()) {
        callback(null);
        return;
      }

      const userData = doc.data() as UserProfile;
      callback({
        ...userData,
        createdAt: userData.createdAt instanceof Timestamp 
          ? userData.createdAt.toDate() 
          : userData.createdAt,
        updatedAt: userData.updatedAt instanceof Timestamp 
          ? userData.updatedAt.toDate() 
          : userData.updatedAt
      });
    }, (error) => {
      console.error('Error listening to profile changes:', error);
      if (isOfflineError(error)) {
        throw new Error('Failed to listen for updates because the client is offline.');
      }
      callback(null);
    });
  } catch (error) {
    console.error('Error setting up snapshot listener:', error);
    // Return a dummy unsubscribe function when we can't establish the listener
    return () => {};
  }
}

/**
 * Search for users by displayName or email
 */
export async function searchUsers(
  searchTerm: string,
  currentUserId: string,
  maxResults: number = 20
): Promise<UserSearchResult[]> {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return [];
    }

    // Lowercase the search term for case-insensitive search
    const searchTermLower = searchTerm.toLowerCase().trim();
    
    // Create a query to find users where displayName or email contains the search term
    // Note: Firestore doesn't support native case-insensitive queries or full-text search
    // In a real app, you might use Cloud Functions with Algolia or ElasticSearch
    const usersRef = collection(db, USERS_COLLECTION);
    
    // First, get the current user to check follows
    const currentUserProfile = await getUserProfile(currentUserId);
    const following = currentUserProfile?.following || [];
    
    // Query users where displayName or email contains the search term
    // This will be case-sensitive in Firestore, we'll filter client-side
    const q = query(
      usersRef,
      limit(100) // Limit to prevent excessive reads
    );
    
    const snapshot = await getDocs(q);
    
    // Filter and transform results
    const results: UserSearchResult[] = [];
    
    snapshot.forEach((doc) => {
      const userData = doc.data() as UserProfile;
      
      // Skip the current user
      if (userData.uid === currentUserId) {
        return;
      }
      
      // Check if displayName or email contains the search term (case-insensitive)
      const displayNameMatches = userData.displayName.toLowerCase().includes(searchTermLower);
      const emailMatches = userData.email.toLowerCase().includes(searchTermLower);
      
      if (displayNameMatches || emailMatches) {
        results.push({
          uid: userData.uid,
          displayName: userData.displayName,
          email: userData.email,
          bio: userData.bio,
          photoURL: userData.photoURL,
          isFollowing: following.includes(userData.uid)
        });
      }
    });
    
    // Sort results by relevance (exact matches first, then partial matches)
    results.sort((a, b) => {
      const aExactMatch = 
        a.displayName.toLowerCase() === searchTermLower || 
        a.email.toLowerCase() === searchTermLower;
      const bExactMatch = 
        b.displayName.toLowerCase() === searchTermLower || 
        b.email.toLowerCase() === searchTermLower;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      return 0;
    });
    
    // Limit to maxResults
    return results.slice(0, maxResults);
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot search users while offline. Please check your internet connection.');
    }
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Follow a user
 */
export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    if (currentUserId === targetUserId) {
      throw new Error('You cannot follow yourself');
    }

    // Update current user's following array
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      updatedAt: serverTimestamp()
    });

    // Update target user's followers array
    const targetUserRef = doc(db, USERS_COLLECTION, targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot follow user while offline. Please check your internet connection.');
    }
    console.error('Error following user:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    // Update current user's following array
    const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId),
      updatedAt: serverTimestamp()
    });

    // Update target user's followers array
    const targetUserRef = doc(db, USERS_COLLECTION, targetUserId);
    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot unfollow user while offline. Please check your internet connection.');
    }
    console.error('Error unfollowing user:', error);
    throw error;
  }
}

/**
 * Check if current user is following a target user
 */
export async function isFollowingUser(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const currentUserProfile = await getUserProfile(currentUserId);
    if (!currentUserProfile) {
      return false;
    }
    
    return currentUserProfile.following.includes(targetUserId);
  } catch (error) {
    if (isOfflineError(error)) {
      throw new Error('Cannot check following status while offline. Please check your internet connection.');
    }
    console.error('Error checking follow status:', error);
    return false;
  }
} 