# User Search and Follow System Documentation

## Overview

This document explains the implementation of the user search and follow system in the YourWeek application. The system allows users to:

1. Search for other users by their display name or email
2. Follow and unfollow other users
3. Maintain a list of followers and following users

## Data Structure

The user profile schema has been extended with the following fields:

- `following`: An array of user IDs that the current user follows
- `followers`: An array of user IDs that follow the current user

## Components

### Search Service

The search functionality is implemented in `lib/services/userProfileService.ts`:

- `searchUsers(searchTerm, currentUserId, maxResults)`: Searches for users by display name or email, filters out the current user, and sorts by relevance.

### Follow/Unfollow Services

Follow/unfollow functionality is implemented in `lib/services/userProfileService.ts`:

- `followUser(currentUserId, targetUserId)`: Adds the target user to the current user's following list and adds the current user to the target user's followers list.
- `unfollowUser(currentUserId, targetUserId)`: Removes the target user from the current user's following list and removes the current user from the target user's followers list.
- `isFollowingUser(currentUserId, targetUserId)`: Checks if the current user is following the target user.

### Custom Hook

The `useUserSearch` hook in `lib/hooks/useUserSearch.tsx` provides:

- State management for search results, loading states, and errors
- Methods for searching users and following/unfollowing users
- Real-time updates to the UI when follow status changes

### UI Components

- `UserCard.tsx`: Displays user information and provides follow/unfollow buttons
- `search/page.tsx`: Provides a search interface and displays search results

## Search Algorithm

The search algorithm:

1. Takes a search term and converts it to lowercase for case-insensitive matching
2. Queries Firestore for user documents
3. Client-side filters results based on whether the display name or email contains the search term
4. Sorts results prioritizing exact matches first
5. Enriches results with following status relative to the current user

## Performance Considerations

- The search is limited to a maximum number of results to prevent excessive reads
- Firestore queries use limitations to prevent loading too many documents
- Client-side filtering is used for case-insensitive search since Firestore doesn't natively support it

## Security Considerations

- The search functionality is protected with middleware to ensure only authenticated users can access it
- Firestore security rules should be updated to ensure users can only read basic profile information of other users and can only modify their own following list
- Email addresses are only shown to authenticated users

## Future Improvements

- Implement server-side searching for better performance with large user bases
- Add pagination for search results
- Implement real-time notifications when someone follows a user
- Add blocking functionality to prevent unwanted follows
- Create a dedicated followers/following page to view all connections
