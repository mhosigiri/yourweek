"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { useUserSearch } from "@/lib/hooks/useUserSearch";
import UserCard from "../components/user/UserCard";
import Button from "../components/ui/Button";
import NetworkStatus from "../components/ui/NetworkStatus";
import Link from "next/link";
import { logOut } from "@/lib/firebase";
import { clearSessionCookie } from "@/lib/auth/authHelpers";

export default function SearchPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const {
    searchTerm,
    results,
    loading,
    error,
    search,
    followUser,
    unfollowUser,
  } = useUserSearch();

  // Check online status
  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

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

  // Handle follow user with offline check
  const handleFollowUser = (userId: string) => {
    if (isOffline) {
      alert("Cannot follow users while offline. Please check your connection.");
      return;
    }
    followUser(userId);
  };

  // Handle unfollow user with offline check
  const handleUnfollowUser = (userId: string) => {
    if (isOffline) {
      alert(
        "Cannot unfollow users while offline. Please check your connection."
      );
      return;
    }
    unfollowUser(userId);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Search Users</h1>
            <div className="flex space-x-4 items-center">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900"
              >
                Your Profile
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

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Offline warning */}
          {isOffline && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
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
                  <p className="text-sm text-yellow-700">
                    You are currently offline. Search functionality is limited.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search form */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isOffline}
              />
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                loading={loading}
                disabled={loading || isOffline || !searchInput.trim()}
              >
                Search
              </Button>
            </form>

            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
          </div>

          {/* Search results */}
          <div className="space-y-4">
            {searchTerm && !loading && results.length === 0 && !error && (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <p className="text-gray-500">
                  No users found matching "{searchTerm}"
                </p>
              </div>
            )}

            {results.map((user) => (
              <UserCard
                key={user.uid}
                user={user}
                onFollow={handleFollowUser}
                onUnfollow={handleUnfollowUser}
                disabled={isOffline}
              />
            ))}

            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </main>

        <NetworkStatus />
      </div>
    </ProtectedRoute>
  );
}
