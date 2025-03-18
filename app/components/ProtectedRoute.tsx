"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { user, loading, isOnline } = useAuth();
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [offlineAccess, setOfflineAccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuthorization = () => {
      // If loading, don't do anything yet
      if (loading) return;

      // If offline but we have cached user data, allow access
      if (!isOnline && user) {
        console.log("Offline access granted - using cached authentication");
        setOfflineAccess(true);
        setAuthorized(true);
        return;
      }

      // If no user is logged in, redirect to login
      if (!user) {
        setAuthorized(false);
        router.push("/login");
        return;
      }

      // User is logged in - allow access
      setAuthorized(true);
    };

    checkAuthorization();
  }, [user, loading, router, isOnline]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show offline state message with content
  if (offlineAccess) {
    return (
      <div>
        {children}
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-md shadow-lg">
          Offline Mode - Some features may be limited
        </div>
      </div>
    );
  }

  // Show authorized content or nothing while checking/redirecting
  return authorized ? <>{children}</> : null;
};

export default ProtectedRoute;
