"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isOnline } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth check is complete and user is not authenticated, redirect to login
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Display offline warning if needed
  if (!isOnline) {
    return (
      <div>
        {user ? (
          <div>
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">
                    You're currently offline. Some features may be limited.
                  </p>
                </div>
              </div>
            </div>
            {children}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center p-6 max-w-sm mx-auto bg-white rounded-lg shadow-md">
              <svg
                className="h-12 w-12 text-yellow-400 mx-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                You're offline
              </h3>
              <p className="mt-2 text-gray-600">
                Please check your internet connection and try again.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If not authenticated and not loading, don't render anything
  if (!user) {
    return null;
  }

  // If authenticated, render the children components
  return <>{children}</>;
};

export default ProtectedRoute;
