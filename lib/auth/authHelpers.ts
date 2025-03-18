import { auth } from "@/lib/firebase";
import { setCookie, deleteCookie } from 'cookies-next';

// Session duration in seconds (1 day)
const SESSION_DURATION = 60 * 60 * 24;

/**
 * Sets a session cookie when a user signs in
 * This allows middleware to check auth status without client-side JavaScript
 */
export const setSessionCookie = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Get the ID token for the current user
    const token = await currentUser.getIdToken();
    
    // Store it in a cookie with appropriate security settings
    setCookie('firebase-auth-token', token, {
      maxAge: SESSION_DURATION,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    // Also set a flag for fallback detection
    setCookie('userHasSession', 'true', {
      maxAge: SESSION_DURATION,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  } catch (error) {
    console.error('Error setting session cookie:', error);
  }
};

/**
 * Clears the session cookie when a user signs out
 */
export const clearSessionCookie = (): void => {
  try {
    deleteCookie('firebase-auth-token');
    deleteCookie('userHasSession');
  } catch (error) {
    console.error('Error clearing session cookie:', error);
  }
};

/**
 * Function to refresh the session token periodically
 * Call this function on a timer or before critical operations
 */
export const refreshSessionToken = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    // Force token refresh
    await currentUser.getIdToken(true);
    
    // Reset the cookie
    await setSessionCookie();
  } catch (error) {
    console.error('Error refreshing session token:', error);
  }
}; 