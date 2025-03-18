"use client";

import React, { Suspense } from "react";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { logOut } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { clearSessionCookie } from "@/lib/auth/authHelpers";
import Link from "next/link";
import NetworkStatus from "../components/ui/NetworkStatus";

// Loading component for suspense
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Dashboard content component
const DashboardContent = () => {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const handleLogout = async (): Promise<void> => {
    try {
      // Clear the session cookie
      clearSessionCookie();
      // Log out from Firebase
      await logOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            YourWeek Dashboard
          </h1>
          <div className="flex space-x-4 items-center">
            <Link
              href="/profile"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Profile
            </Link>
            <Link
              href="/search"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Search Users
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="rounded-lg border-4 border-dashed border-gray-200 h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-medium text-gray-900">
                Welcome,{" "}
                {userProfile?.name ||
                  user?.email ||
                  user?.phoneNumber ||
                  "User"}
                !
              </h2>
              <p className="mt-2 text-gray-600">
                Your dashboard content will appear here soon.
              </p>
              <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
                <Link
                  href="/profile"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View and Edit your Profile
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Search and Follow Users
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Main dashboard component with suspense
export default function Dashboard(): React.ReactNode {
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSpinner />}>
        <DashboardContent />
        <NetworkStatus />
      </Suspense>
    </ProtectedRoute>
  );
}
