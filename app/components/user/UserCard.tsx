import React from "react";
import { UserSearchResult } from "@/lib/types/user";
import Image from "next/image";
import Button from "../ui/Button";
import Link from "next/link";

interface UserCardProps {
  user: UserSearchResult;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  disabled?: boolean;
}

export default function UserCard({
  user,
  onFollow,
  onUnfollow,
  disabled = false,
}: UserCardProps) {
  const handleFollowClick = () => {
    if (user.isFollowing) {
      onUnfollow(user.uid);
    } else {
      onFollow(user.uid);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName}
              width={50}
              height={50}
              className="rounded-full"
            />
          ) : (
            <div className="bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center text-blue-600 font-bold text-lg">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {user.displayName}
          </h3>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          {user.bio && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {user.bio}
            </p>
          )}
          
          <div className="flex mt-2 text-xs text-gray-500 space-x-4">
            <div>
              <span className="font-semibold">{user.followerCount || 0}</span> followers
            </div>
            <div>
              <span className="font-semibold">{user.followingCount || 0}</span> following
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-2">
          <Button
            onClick={handleFollowClick}
            disabled={disabled}
            className={`
              text-xs px-3 py-1
              ${
                user.isFollowing
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }
            `}
          >
            {user.isFollowing ? "Unfollow" : "Follow"}
          </Button>
          
          <Link 
            href={`/user/${user.uid}`}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center justify-center transition-colors font-medium"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
