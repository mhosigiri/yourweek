"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";

interface NetworkStatusProps {
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ className = "" }) => {
  const { isOnline } = useAuth();
  const [showReconnected, setShowReconnected] = useState(false);
  const [isFirestoreAvailable, setIsFirestoreAvailable] = useState(true);
  const [showFirestoreStatus, setShowFirestoreStatus] = useState(false);

  // Check Firestore availability with a simple fetch
  const checkFirestoreAvailability = async () => {
    if (!isOnline) {
      setIsFirestoreAvailable(false);
      return;
    }
    
    try {
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout checking Firestore')), 3000);
      });
      
      // Use a simple fetch that will work or fail quickly
      const fetchPromise = fetch('https://firestore.googleapis.com/v1/projects', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      await Promise.race([fetchPromise, timeoutPromise]);
      setIsFirestoreAvailable(true);
    } catch (error) {
      console.warn('Firebase connectivity check failed:', error);
      setIsFirestoreAvailable(false);
      // Show Firestore unavailable warning
      setShowFirestoreStatus(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowFirestoreStatus(false), 5000);
    }
  };

  // Show a reconnected message briefly when going from offline to online
  useEffect(() => {
    if (isOnline) {
      // We're back online, check if Firestore is available
      checkFirestoreAvailability();
      
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // We're offline, so Firestore is definitely unavailable
      setIsFirestoreAvailable(false);
    }
  }, [isOnline]);

  // Don't show the online status if we're online and not recently reconnected
  if (!showReconnected && isOnline && !showFirestoreStatus) {
    return null;
  }

  // Special case for when we're online but Firestore is unavailable
  const showFirestoreWarning = isOnline && !isFirestoreAvailable && showFirestoreStatus;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline
          ? showFirestoreWarning
            ? "bg-amber-50 border border-amber-200 text-amber-800"
            : "bg-green-50 border border-green-200 text-green-800"
          : "bg-yellow-50 border border-yellow-200 text-yellow-800"
      } ${className}`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {isOnline ? (
            showFirestoreWarning ? (
              <div className="h-3 w-3 rounded-full bg-amber-500 mr-2"></div>
            ) : (
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
            )
          ) : (
            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
          )}
        </div>
        <div>
          {isOnline ? (
            showFirestoreWarning ? (
              <div>
                <p className="text-sm font-medium">Cloud sync unavailable</p>
                <p className="text-xs mt-1">Changes saved locally</p>
              </div>
            ) : (
              <p className="text-sm font-medium">Connected to the internet</p>
            )
          ) : (
            <div>
              <p className="text-sm font-medium">You are offline</p>
              <p className="text-xs mt-1">Changes saved locally only</p>
            </div>
          )}
        </div>
        {/* Close button */}
        <button 
          onClick={() => {
            setShowReconnected(false);
            setShowFirestoreStatus(false);
          }}
          className="ml-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NetworkStatus;
