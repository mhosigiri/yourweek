# Social-Plan Authentication System

This document explains the Social-Plan application's authentication system and how to set it up.

## Overview

Social-Plan uses Firebase Authentication for user management, with custom email verification through SendGrid. The system provides:

- Email/password user registration and login
- Optional email verification with a 6-digit code
- Persistent authentication with offline support
- Password reset functionality

## Setup Instructions

1. **Environment Variables**

   Copy the `.env.local.example` file to `.env.local` and fill in your Firebase and SendGrid credentials:

   ```bash
   cp .env.local.example .env.local
   ```

2. **Firebase Setup**

   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Email/Password authentication in the Firebase console
   - Copy your Firebase config values to the `.env.local` file

3. **SendGrid Setup**

   - Create a SendGrid account at [sendgrid.com](https://sendgrid.com)
   - Create an API key with email sending permissions
   - Add the API key to your `.env.local` file
   - Verify a sender email or domain in SendGrid

## Authentication Flow

1. **Signup**:

   - User fills out the signup form with email and password
   - Firebase creates the user account
   - A 6-digit verification code is generated and sent via email
   - User can verify immediately or skip verification

2. **Verification**:

   - User enters the 6-digit code received by email
   - Code is validated against the stored code in Firestore
   - User's account is marked as verified if correct

3. **Login**:

   - User enters email and password
   - Firebase authenticates the user
   - User is redirected to the dashboard

4. **Protected Routes**:
   - All authenticated users can access protected routes, regardless of verification status
   - Offline users with cached authentication can still access protected content

## Development Mode

In development mode, actual emails are not sent. Instead, verification codes are logged to the console for testing.

## Customization

- Modify the email templates in `lib/emailService.js`
- Adjust verification requirements in `SignupForm.js`
- Edit authentication styles in the respective component files

## Offline Support

The application includes robust offline support:

- Authentication state is cached
- Protected routes display an offline indicator
- Login and signup are disabled when offline
- Previously authenticated users retain access when offline

## Dependencies

- Firebase: Authentication and database
- SendGrid: Email delivery
- Axios: HTTP requests
- Next.js: Application framework
