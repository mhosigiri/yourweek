import { useState, useEffect, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

// Create a context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Provider component to wrap our app and make auth available
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useProvideAuth();
  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

// Hook for components to get the auth object
export const useAuth = () => useContext(AuthContext);

// Provider hook that creates the auth object and handles state
function useProvideAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return {
    user,
    loading,
    signOut,
  };
}
