"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";

interface NetworkStatusProps {
  className?: string;
}

const NetworkStatus: React.FC<NetworkStatusProps> = ({ className = "" }) => {
  const { isOnline } = useAuth();
  const [showReconnected, setShowReconnected] = useState(false);

  // Show a reconnected message briefly when going from offline to online
  useEffect(() => {
    if (isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showReconnected && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-yellow-50 border border-yellow-200 text-yellow-800"
      } ${className}`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {isOnline ? (
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          ) : (
            <div className="h-3 w-3 rounded-full bg-yellow-500 mr-2"></div>
          )}
        </div>
        <div>
          {isOnline ? (
            <p className="text-sm font-medium">Connected to the internet</p>
          ) : (
            <div>
              <p className="text-sm font-medium">You are offline</p>
              <p className="text-xs mt-1">Some features may be limited</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkStatus;
