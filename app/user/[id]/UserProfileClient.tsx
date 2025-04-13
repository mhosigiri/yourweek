"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import NetworkStatus from "../../components/ui/NetworkStatus";
import Link from "next/link";
import { logOut } from "@/lib/firebase";
import { clearSessionCookie } from "@/lib/auth/authHelpers";
import {
  getUserProfileWithStats,
  followUser as followUserService,
  unfollowUser as unfollowUserService,
} from "@/lib/services/userProfileService";
import { UserProfile, AvailabilitySlot } from "@/lib/types/user";
import Image from "next/image";

// Helper function to get theme color for a day
const getDayColor = (day: string) => {
  const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const dayIndex = DAYS_OF_WEEK.indexOf(day);
  const colors = [
    "#0ea5e9", // Monday - blue
    "#22c55e", // Tuesday - green
    "#eab308", // Wednesday - yellow
    "#ef4444", // Thursday - red
    "#a855f7", // Friday - purple
    "#f97316", // Saturday - orange
    "#64748b", // Sunday - slate
  ];
  return colors[dayIndex] || "#3b82f6";
};

interface UserProfileClientProps {
  userId: string;
}

export default function UserProfileClient({ userId }: UserProfileClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<
    | (UserProfile & {
        isFollowing: boolean;
        followerCount: number;
        followingCount: number;
      })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Convert availability to freeTimeSlots format (for display consistency)
  const [freeTimeSlots, setFreeTimeSlots] = useState<
    {
      id: string;
      day: string;
      startTime: string;
      endTime: string;
    }[]
  >([]);

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

  // Load user profile
  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const userProfile = await getUserProfileWithStats(userId, user.uid);
        setProfile(userProfile);
        setIsFollowing(userProfile.isFollowing);

        // Convert availability to free time slots format
        const slots = userProfile.availability
          .filter((slot) => slot.isAvailable)
          .map((slot, index) => ({
            id: `${index}`,
            day: slot.day.charAt(0).toUpperCase() + slot.day.slice(1),
            startTime: slot.startTime,
            endTime: slot.endTime,
          }));

        setFreeTimeSlots(slots);
      } catch (err: any) {
        console.error("Error loading user profile:", err);
        setError(err.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user || isOffline || !profile) return;

    try {
      await followUserService(user.uid, userId);
      setIsFollowing(true);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: true,
              followerCount: prev.followerCount + 1,
            }
          : null
      );
    } catch (err: any) {
      console.error("Error following user:", err);
      alert(err.message || "Failed to follow user");
    }
  };

  const handleUnfollow = async () => {
    if (!user || isOffline || !profile) return;

    try {
      await unfollowUserService(user.uid, userId);
      setIsFollowing(false);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: false,
              followerCount: Math.max(0, prev.followerCount - 1),
            }
          : null
      );
    } catch (err: any) {
      console.error("Error unfollowing user:", err);
      alert(err.message || "Failed to unfollow user");
    }
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

  const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <div className="flex space-x-4 items-center">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Dashboard
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
                    You are currently offline. Some features may be limited.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {profile && !loading && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {/* User header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between">
                  <div className="flex items-center space-x-5">
                    <div className="flex-shrink-0">
                      {profile.photoURL ? (
                        <Image
                          src={profile.photoURL}
                          alt={profile.displayName}
                          width={80}
                          height={80}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="bg-blue-100 rounded-full h-20 w-20 flex items-center justify-center text-blue-600 font-bold text-2xl">
                          {profile.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {profile.displayName}
                      </h2>
                      <div className="flex space-x-6 mt-2">
                        <div className="text-sm text-gray-500">
                          <span className="font-semibold">
                            {profile.followerCount}
                          </span>{" "}
                          followers
                        </div>
                        <div className="text-sm text-gray-500">
                          <span className="font-semibold">
                            {profile.followingCount}
                          </span>{" "}
                          following
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {user?.uid !== userId && (
                      <Button
                        onClick={isFollowing ? handleUnfollow : handleFollow}
                        className={`
                          px-4 py-2
                          ${
                            isFollowing
                              ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }
                        `}
                        disabled={isOffline}
                      >
                        {isFollowing ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                  </div>
                </div>

                {profile.bio && (
                  <div className="mt-5">
                    <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                    <p className="text-sm text-gray-700 mt-1">{profile.bio}</p>
                  </div>
                )}
              </div>

              {/* Free time availability */}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Availability Schedule
                </h3>

                {/* Free time slots display table */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700">
                      Free Time Slots
                    </h3>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {DAYS_OF_WEEK.map((day) => {
                          const isToday =
                            day ===
                            [
                              "Sunday",
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                            ][new Date().getDay()];
                          const dayColor = getDayColor(day);
                          const daySlots = freeTimeSlots.filter(
                            (slot) => slot.day === day
                          );

                          return (
                            <th
                              key={day}
                              scope="col"
                              className={`px-3 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                                isToday
                                  ? "bg-blue-50 border-b-2"
                                  : "text-gray-500 border-b"
                              }`}
                              style={{
                                borderBottomColor: isToday
                                  ? dayColor
                                  : undefined,
                                color: isToday ? dayColor : undefined,
                              }}
                            >
                              <div className="flex justify-between items-center">
                                <span>{day.substring(0, 3)}</span>
                                {daySlots.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {daySlots.length}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="divide-x divide-gray-100">
                        {DAYS_OF_WEEK.map((day) => {
                          const dayColor = getDayColor(day);
                          const daySlots = freeTimeSlots.filter(
                            (slot) => slot.day === day
                          );

                          return (
                            <td key={day} className="px-2 py-2 align-top">
                              {daySlots.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {daySlots.map((slot) => (
                                    <div
                                      key={slot.id}
                                      className="text-xs border-l-2 pl-2 py-1"
                                      style={{ borderLeftColor: dayColor }}
                                    >
                                      <div
                                        className="font-medium"
                                        style={{ color: dayColor }}
                                      >
                                        {slot.startTime} - {slot.endTime}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-16 flex items-center justify-center text-gray-400 text-sm">
                                  No free time
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                    <span>
                      This shows when {profile.displayName} is generally
                      available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <NetworkStatus />
      </div>
    </ProtectedRoute>
  );
}
