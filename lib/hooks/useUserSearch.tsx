import { useState, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import {
  searchUsers,
  followUser,
  unfollowUser,
} from "@/lib/services/userProfileService";
import { UserSearchResult } from "@/lib/types/user";

interface UserSearchState {
  results: UserSearchResult[];
  loading: boolean;
  error: string | null;
}

export function useUserSearch() {
  const { user } = useAuth();
  const [searchState, setSearchState] = useState<UserSearchState>({
    results: [],
    loading: false,
    error: null,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Handle search
  const handleSearch = useCallback(
    async (term: string) => {
      if (!user?.uid) {
        setSearchState({
          results: [],
          loading: false,
          error: "You must be logged in to search users",
        });
        return;
      }

      if (!term || term.trim() === "") {
        setSearchState({
          ...searchState,
          results: [],
          loading: false,
        });
        return;
      }

      try {
        setSearchState({
          ...searchState,
          loading: true,
          error: null,
        });

        setSearchTerm(term);
        const results = await searchUsers(term, user.uid);

        setSearchState({
          results,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        setSearchState({
          results: [],
          loading: false,
          error: error.message || "Failed to search users",
        });
      }
    },
    [user, searchState]
  );

  // Handle follow user
  const handleFollowUser = useCallback(
    async (targetUserId: string) => {
      if (!user?.uid) {
        return;
      }

      try {
        await followUser(user.uid, targetUserId);

        // Update local state
        setSearchState((prev) => ({
          ...prev,
          results: prev.results.map((result) =>
            result.uid === targetUserId
              ? { ...result, isFollowing: true }
              : result
          ),
        }));
      } catch (error: any) {
        console.error("Error following user:", error);
        // Optionally set an error state
      }
    },
    [user]
  );

  // Handle unfollow user
  const handleUnfollowUser = useCallback(
    async (targetUserId: string) => {
      if (!user?.uid) {
        return;
      }

      try {
        await unfollowUser(user.uid, targetUserId);

        // Update local state
        setSearchState((prev) => ({
          ...prev,
          results: prev.results.map((result) =>
            result.uid === targetUserId
              ? { ...result, isFollowing: false }
              : result
          ),
        }));
      } catch (error: any) {
        console.error("Error unfollowing user:", error);
        // Optionally set an error state
      }
    },
    [user]
  );

  return {
    searchTerm,
    results: searchState.results,
    loading: searchState.loading,
    error: searchState.error,
    search: handleSearch,
    followUser: handleFollowUser,
    unfollowUser: handleUnfollowUser,
  };
}
