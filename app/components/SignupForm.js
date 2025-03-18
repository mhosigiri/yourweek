"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, generateVerificationCode } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { sendVerificationEmail } from "@/lib/emailService";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { isOnline } = useAuth();

  // Handle signup submission
  const handleSignup = async (e) => {
    e.preventDefault();

    // Check for internet connection
    if (!isOnline) {
      setError("You're currently offline. Please connect to the internet to sign up.");
      return;
    }

    // Validate form inputs
    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    if (password.length < 6) {
      return setError("Password should be at least 6 characters");
    }

    try {
      setError("");
      setLoading(true);

      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      const user = userCredential.user;

      // Generate a random 6-digit code
      const code = generateVerificationCode();
      setVerificationCode(code);
      
      // Store user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: serverTimestamp(),
        verificationCode: code,
        codeCreatedAt: serverTimestamp(),
        verified: false
      });

      // Send verification email with the code
      const emailSent = await sendVerificationEmail(email, code);
      
      if (!emailSent) {
        throw new Error("Failed to send verification email");
      }

      // Show verification form 
      setShowVerification(true);
      // Start 60 second countdown for resend
      setCountdown(60);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      console.error("Signup error:", error);

      let errorMessage = "Failed to create an account.";
      
      // Different error messages based on error code
      switch(error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email is already in use.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address.";
          break;
        case 'auth/weak-password':
          errorMessage = "Password is too weak. It should be at least 6 characters.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection.";
          break;
        default:
          errorMessage = error.message || "Failed to create an account. Please try again.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle verification code submission
  const handleVerify = async (e) => {
    e.preventDefault();

    if (userCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    if (userCode !== verificationCode) {
      setError("Invalid verification code. Please try again.");
      return;
    }

    try {
      setLoading(true);

      // User verified, update status in Firestore
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), 
          { verified: true },
          { merge: true }
        );
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Verification error:", error);
      setError("Failed to verify your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle resending verification code
  const handleResendCode = async () => {
    if (!isOnline) {
      setError("You're offline. Please connect to the internet to resend the code.");
      return;
    }

    try {
      setLoading(true);
      
      // Generate a new code
      const newCode = generateVerificationCode();
      setVerificationCode(newCode);
      
      // Update code in Firestore
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), 
          { 
            verificationCode: newCode,
            codeCreatedAt: serverTimestamp()
          },
          { merge: true }
        );
      }

      // Send new verification email
      await sendVerificationEmail(email, newCode);
      
      // Reset countdown
      setCountdown(60);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setError(""); // Clear any previous errors
    } catch (error) {
      console.error("Error resending code:", error);
      setError("Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  // Skip verification and go to dashboard
  const skipVerification = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {showVerification ? "Verify Your Email" : "Create your account"}
          </h2>
          
          {showVerification && (
            <p className="mt-2 text-center text-sm text-gray-600">
              We've sent a 6-digit code to{" "}
              <span className="font-medium text-indigo-600">{email}</span>
            </p>
          )}
          
          {!isOnline && (
            <div className="mt-2 text-center text-sm text-red-600 bg-red-100 p-2 rounded-md">
              You are currently offline. {showVerification 
                ? "Verification requires an internet connection." 
                : "Sign up is unavailable."}
            </div>
          )}
        </div>

        {!showVerification ? (
          // Signup Form
          <form className="mt-8 space-y-6" onSubmit={handleSignup}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || !isOnline}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || !isOnline}
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || !isOnline}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !isOnline}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading || !isOnline
                    ? "bg-indigo-400"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                ) : null}
                Sign up
              </button>
            </div>
            <div className="text-sm text-center">
              <Link
                href="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        ) : (
          // Verification Form
          <form className="mt-8 space-y-6" onSubmit={handleVerify}>
            <div>
              <label htmlFor="verification-code" className="sr-only">
                Verification Code
              </label>
              <input
                id="verification-code"
                name="verification-code"
                type="text"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter 6-digit code"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                disabled={loading || !isOnline}
              />
            </div>

            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

            <div>
              <button
                type="submit"
                disabled={loading || !isOnline || userCode.length !== 6}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading || !isOnline || userCode.length !== 6
                    ? "bg-indigo-400"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {loading ? (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </span>
                ) : null}
                Verify Email
              </button>
            </div>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || countdown > 0 || !isOnline}
                className="font-medium text-indigo-600 hover:text-indigo-500 disabled:text-gray-400"
              >
                {countdown > 0
                  ? `Resend code in ${countdown}s`
                  : "Didn't receive a code? Resend"}
              </button>
            </div>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={skipVerification}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Skip verification for now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 