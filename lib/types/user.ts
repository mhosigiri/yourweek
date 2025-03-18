// User availability time slot interface
export interface AvailabilitySlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // Format: "HH:MM" in 24-hour format
  endTime: string; // Format: "HH:MM" in 24-hour format
  isAvailable: boolean;
}

// User profile interface
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  availability: AvailabilitySlot[];
  createdAt: Date | number; // Firestore timestamp converts to Date in JS
  updatedAt: Date | number;
  emailVerified: boolean;
  following: string[]; // Array of user IDs that this user follows
  followers: string[]; // Array of user IDs that follow this user
}

// Partial interface for updates
export type UserProfileUpdate = Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'email'>>;

// Search results interface
export interface UserSearchResult {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  photoURL?: string;
  isFollowing: boolean; // Whether the current user follows this user
} 