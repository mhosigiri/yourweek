"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "@/lib/hooks/useUserProfile";
import Button from "../components/ui/Button";
import NetworkStatus from "../components/ui/NetworkStatus";
import { AvailabilitySlot } from "@/lib/types/user";
import Link from "next/link";
import { logOut } from "@/lib/firebase";
import { clearSessionCookie } from "@/lib/auth/authHelpers";

// Days of the week constant for consistent ordering
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Availability time slot component
const AvailabilitySlotItem: React.FC<{
  slot: AvailabilitySlot;
  onUpdate: (updatedSlot: AvailabilitySlot) => void;
}> = ({ slot, onUpdate }) => {
  const handleToggle = () => {
    onUpdate({
      ...slot,
      isAvailable: !slot.isAvailable,
    });
  };

  const handleTimeChange = (field: "startTime" | "endTime", value: string) => {
    onUpdate({
      ...slot,
      [field]: value,
    });
  };

  // Format day name to look nicer
  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="flex items-center py-2 border-b border-gray-200">
      <div className="w-1/4">
        <span className="font-medium">{formatDayName(slot.day)}</span>
      </div>
      <div className="w-1/4 px-2">
        <input
          type="checkbox"
          checked={slot.isAvailable}
          onChange={handleToggle}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      </div>
      <div className="w-1/4 px-2">
        <input
          type="time"
          value={slot.startTime}
          onChange={(e) => handleTimeChange("startTime", e.target.value)}
          disabled={!slot.isAvailable}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>
      <div className="w-1/4 px-2">
        <input
          type="time"
          value={slot.endTime}
          onChange={(e) => handleTimeChange("endTime", e.target.value)}
          disabled={!slot.isAvailable}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
        />
      </div>
    </div>
  );
};

// Helper function to get theme color for a day
const getDayColor = (day: string) => {
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

// FreeTimeSlot interface for manually entered free time windows
interface FreeTimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

// Profile page component
const ProfileContent: React.FC = () => {
  const { user } = useAuth();
  const {
    profile,
    loading,
    error,
    isOffline,
    updateProfile,
    updateBio,
    updateAvailability,
    initializeProfile,
    refreshProfile,
  } = useUserProfile();

  const [displayName, setDisplayName] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [freeTimeSlots, setFreeTimeSlots] = useState<FreeTimeSlot[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [isAddingFreeTime, setIsAddingFreeTime] = useState<boolean>(false);
  const [newFreeTimeSlot, setNewFreeTimeSlot] = useState<
    Omit<FreeTimeSlot, "id">
  >({
    day: DAYS_OF_WEEK[0],
    startTime: "09:00",
    endTime: "17:00",
  });

  // Initialize profile if needed
  useEffect(() => {
    if (user && !profile && !loading) {
      initializeProfile();
    }
  }, [user, profile, loading, initializeProfile]);

  // Load free time slots from localStorage
  useEffect(() => {
    const loadFreeTimeSlots = () => {
      try {
        const storedSlots = localStorage.getItem("social-plan_free_time_slots");
        if (storedSlots) {
          const parsedSlots = JSON.parse(storedSlots);
          setFreeTimeSlots(parsedSlots);
        } else {
          // Initialize with some default slots if none exist
          const defaultSlots: FreeTimeSlot[] = [
            { id: "1", day: "Monday", startTime: "09:00", endTime: "12:00" },
            { id: "2", day: "Monday", startTime: "13:00", endTime: "17:00" },
            { id: "3", day: "Wednesday", startTime: "09:00", endTime: "17:00" },
            { id: "4", day: "Friday", startTime: "13:00", endTime: "15:00" },
          ];
          setFreeTimeSlots(defaultSlots);
          localStorage.setItem(
            "social-plan_free_time_slots",
            JSON.stringify(defaultSlots)
          );
        }
      } catch (e) {
        console.error("Error loading free time slots:", e);
      }
    };

    loadFreeTimeSlots();
  }, []);

  // Function to add a new free time slot
  const handleAddFreeTimeSlot = () => {
    const newSlot: FreeTimeSlot = {
      ...newFreeTimeSlot,
      id: Date.now().toString(),
    };

    const updatedSlots = [...freeTimeSlots, newSlot];
    setFreeTimeSlots(updatedSlots);

    // Save to localStorage
    localStorage.setItem(
      "social-plan_free_time_slots",
      JSON.stringify(updatedSlots)
    );

    // Reset form
    setNewFreeTimeSlot({
      day: DAYS_OF_WEEK[0],
      startTime: "09:00",
      endTime: "17:00",
    });
    setIsAddingFreeTime(false);
  };

  // Function to delete a free time slot
  const handleDeleteFreeTimeSlot = (id: string) => {
    const updatedSlots = freeTimeSlots.filter((slot) => slot.id !== id);
    setFreeTimeSlots(updatedSlots);

    // Save to localStorage
    localStorage.setItem(
      "social-plan_free_time_slots",
      JSON.stringify(updatedSlots)
    );
  };

  // Update local state when profile data changes
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setAvailability(profile.availability || []);
    }
  }, [profile]);

  // Handle editing the profile
  const handleEdit = () => {
    // Don't allow editing if offline
    if (isOffline) {
      setStatusMessage(
        "Cannot edit profile while offline. Please connect to the internet."
      );
      setIsError(true);
      setTimeout(() => {
        setStatusMessage("");
        setIsError(false);
      }, 3000);
      return;
    }
    setIsEditing(true);
  };

  // Handle canceling edits
  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setAvailability(profile.availability || []);
    }
    setIsEditing(false);
    setStatusMessage("");
    setIsError(false);
  };

  // Handle saving profile changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setStatusMessage("Saving changes...");
      setIsError(false);

      await updateProfile({
        displayName,
        bio,
        availability,
      });

      // Also save free time slots to localStorage
      localStorage.setItem(
        "social-plan_free_time_slots",
        JSON.stringify(freeTimeSlots)
      );

      setIsEditing(false);
      setStatusMessage("Profile updated successfully!");
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setStatusMessage(
        err.message || "Error updating profile. Please try again."
      );
      setIsError(true);
    } finally {
      setIsSaving(false);

      // Clear success message after a delay
      if (!isError) {
        setTimeout(() => {
          setStatusMessage("");
        }, 3000);
      }
    }
  };

  // Handle updating a single availability slot
  const handleUpdateAvailability = (
    index: number,
    updatedSlot: AvailabilitySlot
  ) => {
    const newAvailability = [...availability];
    newAvailability[index] = updatedSlot;
    setAvailability(newAvailability);
  };

  // Add a refresh handler
  const handleRefresh = async () => {
    try {
      setStatusMessage("Refreshing profile...");
      setIsError(false);
      await refreshProfile();
      setStatusMessage("Profile refreshed");
      setTimeout(() => {
        setStatusMessage("");
      }, 3000);
    } catch (err: any) {
      console.error("Error refreshing profile:", err);
      setStatusMessage(err.message || "Error refreshing profile");
      setIsError(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Display a warning banner when offline but show the cached profile
  const OfflineBanner = () => (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
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
            You are currently offline. You are viewing cached profile data. Some
            features will be limited until you reconnect.
          </p>
        </div>
      </div>
    </div>
  );

  if (error && !profile) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-red-50 rounded-lg border border-red-200">
        <h3 className="text-lg font-medium text-red-800">
          Error loading profile
        </h3>
        <p className="mt-2 text-sm text-red-700">{error}</p>

        <div className="mt-6 flex space-x-4">
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => initializeProfile()}
          >
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 className="text-lg font-medium text-yellow-800">
          Profile Not Found
        </h3>
        <p className="mt-2 text-sm text-yellow-700">
          We couldn't find your profile information. Please try initializing
          your profile.
        </p>
        <div className="mt-6 flex space-x-4">
          <button
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            onClick={() => initializeProfile()}
            disabled={isOffline}
          >
            {isOffline ? "Connect to Internet First" : "Initialize Profile"}
          </button>

          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Show offline banner if needed */}
      {isOffline && <OfflineBanner />}

      {/* Error or status message from our operations */}
      {error && profile && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
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
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Profile
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Your personal information and availability.
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleRefresh}
              className="bg-gray-600 hover:bg-gray-700"
              disabled={loading}
            >
              Refresh
            </Button>

            {!isEditing ? (
              <Button
                onClick={handleEdit}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isOffline}
              >
                {isOffline ? "Offline - Can't Edit" : "Edit Profile"}
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isSaving || isOffline}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`px-4 py-3 ${
              isError ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
            </div>

            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">
                Display Name
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {isEditing ? (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  profile.displayName
                )}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Bio</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {isEditing ? (
                  <textarea
                    value={bio || ""}
                    onChange={(e) => setBio(e.target.value)}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  profile.bio || "No bio provided"
                )}
              </dd>
            </div>

            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 mb-2 flex justify-between items-center">
                <span>Free Time Availability</span>
                {!isEditing && (
                  <button
                    onClick={() => setIsAddingFreeTime(!isAddingFreeTime)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {isAddingFreeTime ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Cancel
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Add Free Time
                      </>
                    )}
                  </button>
                )}
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {isEditing ? (
                  /* Original editing UI for availability settings */
                  <div className="border rounded-md overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 bg-gray-100 p-3 font-medium text-gray-700">
                      <div>Day</div>
                      <div>Available</div>
                      <div>Start Time</div>
                      <div>End Time</div>
                    </div>
                    <div className="p-3">
                      {availability.map((slot, index) => (
                        <AvailabilitySlotItem
                          key={slot.day}
                          slot={slot}
                          onUpdate={(updatedSlot) =>
                            handleUpdateAvailability(index, updatedSlot)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* New free time slot form */}
                    {isAddingFreeTime && (
                      <div className="mb-4 p-4 border rounded-md bg-blue-50 border-blue-200">
                        <h4 className="text-sm font-medium text-blue-800 mb-3">
                          Add New Free Time Slot
                        </h4>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Day
                            </label>
                            <select
                              value={newFreeTimeSlot.day}
                              onChange={(e) =>
                                setNewFreeTimeSlot({
                                  ...newFreeTimeSlot,
                                  day: e.target.value,
                                })
                              }
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                              {DAYS_OF_WEEK.map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Start Time
                            </label>
                            <input
                              type="time"
                              value={newFreeTimeSlot.startTime}
                              onChange={(e) =>
                                setNewFreeTimeSlot({
                                  ...newFreeTimeSlot,
                                  startTime: e.target.value,
                                })
                              }
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              End Time
                            </label>
                            <input
                              type="time"
                              value={newFreeTimeSlot.endTime}
                              onChange={(e) =>
                                setNewFreeTimeSlot({
                                  ...newFreeTimeSlot,
                                  endTime: e.target.value,
                                })
                              }
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end space-x-3">
                          <button
                            onClick={() => setIsAddingFreeTime(false)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddFreeTimeSlot}
                            className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Add Slot
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Free time slots display table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700">
                          Your Free Time Slots
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
                                          className="text-xs border-l-2 pl-2 py-1 group flex justify-between items-center"
                                          style={{ borderLeftColor: dayColor }}
                                        >
                                          <div
                                            className="font-medium"
                                            style={{ color: dayColor }}
                                          >
                                            {slot.startTime} - {slot.endTime}
                                          </div>
                                          <button
                                            onClick={() =>
                                              handleDeleteFreeTimeSlot(slot.id)
                                            }
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              className="h-4 w-4"
                                              fill="none"
                                              viewBox="0 0 24 24"
                                              stroke="currentColor"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                              />
                                            </svg>
                                          </button>
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
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center">
                        <span>
                          Click the "Add Free Time" button to add more free time
                          slots
                        </span>
                        {freeTimeSlots.length > 0 && (
                          <span>Hover over a slot to delete it</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

// Protected profile page with loading state
export default function ProfilePage() {
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
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
            <div className="flex space-x-4 items-center">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Back to Dashboard
              </Link>
              {/* Add additional navigation links here when new pages are available */}
              <button
                onClick={handleLogout}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <main>
          <ProfileContent />
        </main>
        <NetworkStatus />
      </div>
    </ProtectedRoute>
  );
}
