# Social-Plan App

A Next.js application that helps users manage their weekly schedule, profiles, and connections.

## Features

- **User Authentication**: Firebase-powered authentication with email/password
- **User Profiles**: Create and edit user profiles with personal information and availability
- **User Search**: Find other users by name or email
- **Follow System**: Follow/unfollow other users to connect with them
- **Offline Support**: Data persistence when offline using Firestore's offline capabilities

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project with Firestore and Authentication enabled

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## User Search and Follow System

The application includes a comprehensive user search and follow system:

- **Search**: Find users by typing their name or email in the search page
- **Profiles**: View detailed user profiles with their information and availability
- **Follow/Unfollow**: Connect with other users by following them
- **Network Status**: See your connection status and offline indicators when disconnected

## Project Structure

```
app/                  # Next.js app directory
├── components/       # Reusable UI components
│   ├── auth/         # Authentication-related components
│   ├── ui/           # UI elements
│   └── user/         # User-specific components
├── context/          # React Context providers
├── dashboard/        # Dashboard page
├── profile/          # User profile page
├── search/           # User search page
├── login/            # Login page
└── signup/           # Signup page
lib/                  # Application logic
├── auth/             # Authentication utilities
├── hooks/            # Custom React hooks
├── services/         # Firebase service integrations
└── types/            # TypeScript type definitions
docs/                 # Documentation files
middleware.ts         # Next.js middleware for route protection
```

## Technical Details

- **Frontend**: Next.js 13+ with App Router, React 18+
- **Authentication**: Firebase Authentication
- **Database**: Firestore with offline persistence
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript
- **Code Quality**: ESLint with TypeScript rules

## Deployment

This application can be deployed to Vercel, Netlify, or any other hosting platform that supports Next.js applications.

```bash
# Deploy to Vercel
vercel
```

## Documentation

Additional documentation is available in the `docs/` directory:

- [User Search and Follow System](docs/user-search-follow.md)
- [Authentication System](docs/authentication.md)
- [Offline Support](docs/offline-support.md)

## License

MIT
