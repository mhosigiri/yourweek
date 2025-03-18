"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmail,
  resetPassword,
  auth,
  db,
  generateVerificationCode as generateCode,
} from "@/lib/firebase";
import { sendVerificationEmail } from "@/lib/emailService";
import Input from "../ui/Input";
import Button from "../ui/Button";
import {
  doc,
  getDoc,
  DocumentSnapshot,
  DocumentData,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged, UserCredential } from "firebase/auth";
import { setSessionCookie } from "@/lib/auth/authHelpers";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resetSent, setResetSent] = useState<boolean>(false);
  const [verificationRequired, setVerificationRequired] =
    useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Check network status
  useEffect(() => {
    // Set initial online status
    setIsOffline(typeof window !== "undefined" && !navigator.onLine);

    // Add event listeners for online/offline events
    const handleOnline = (): void => {
      setIsOffline(false);
      setError("");
    };
    const handleOffline = (): void => {
      setIsOffline(true);
      setError("");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isOffline) {
      setError(
        "Cannot log in while offline. Please check your internet connection."
      );
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmail(email, password);
      const user = userCredential.user;
      setUserId(user.uid);

      // Set the session cookie for middleware-based protection
      await setSessionCookie();

      // Check if email is verified in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        throw new Error("User data not found");
      }

      const userData = userDoc.data();

      if (!userData.emailVerified) {
        setVerificationRequired(true);
        // Generate and send a new verification code
        const code = generateCode();
        const codeExpires = new Date();
        codeExpires.setMinutes(codeExpires.getMinutes() + 10);

        await setDoc(
          doc(db, "users", user.uid),
          {
            verificationCode: code,
            verificationCodeExpires: codeExpires,
            lastCodeSent: serverTimestamp(),
          },
          { merge: true }
        );

        await sendVerificationEmail(email, code);
        setError("Please verify your email address to continue.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMessage = "Failed to login. Please try again.";

      switch (err.code) {
        case "auth/user-not-found":
          errorMessage =
            "No account found with this email. Please sign up first.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password. Please try again.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        case "auth/network-request-failed":
          errorMessage =
            "Network error. Please check your internet connection.";
          break;
        default:
          errorMessage = err.message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isOffline) {
      setError(
        "Cannot verify email while offline. Please check your internet connection."
      );
      setLoading(false);
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter the 6-digit verification code");
      setLoading(false);
      return;
    }

    try {
      if (!userId) {
        throw new Error("User session expired. Please log in again.");
      }

      const userDoc = await getDoc(doc(db, "users", userId));

      if (!userDoc.exists()) {
        throw new Error("User data not found");
      }

      const userData = userDoc.data();
      const codeExpires = userData.verificationCodeExpires?.toDate();

      if (!codeExpires || codeExpires < new Date()) {
        throw new Error(
          "Verification code has expired. Please request a new code."
        );
      }

      if (userData.verificationCode !== verificationCode) {
        throw new Error("Invalid verification code");
      }

      await setDoc(
        doc(db, "users", userId),
        {
          emailVerified: true,
          verifiedAt: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Email verification error:", err);
      setError(err.message || "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    if (!userId) {
      setError("User session expired. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      const codeExpires = new Date();
      codeExpires.setMinutes(codeExpires.getMinutes() + 10);

      await setDoc(
        doc(db, "users", userId),
        {
          verificationCode: code,
          verificationCodeExpires: codeExpires,
          lastCodeSent: serverTimestamp(),
        },
        { merge: true }
      );

      await sendVerificationEmail(email, code);
      setError("");
    } catch (err: any) {
      console.error("Error resending code:", err);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (
    e: React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    e.preventDefault();

    // Check if offline
    if (isOffline) {
      setError(
        "Cannot reset password while offline. Please check your internet connection."
      );
      return;
    }

    if (!email) {
      setError("Please enter your email to reset your password");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      setError("");
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white px-6 py-12 shadow-md rounded-lg max-w-md w-full mx-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          {verificationRequired ? "Verify Your Email" : "Sign in to YourWeek"}
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {isOffline && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4 mb-6">
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
                <p className="text-sm">
                  You're currently offline. Some features may be limited.
                </p>
              </div>
            </div>
          </div>
        )}

        {resetSent ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">
              Password reset email sent! Check your inbox.
            </p>
            <Button onClick={() => setResetSent(false)}>Back to Login</Button>
          </div>
        ) : verificationRequired ? (
          <form className="space-y-6" onSubmit={handleVerifyEmail}>
            <p className="text-sm text-gray-600">
              We've sent a verification code to{" "}
              <span className="font-medium">{email}</span>. Please enter it
              below to verify your account.
            </p>

            <Input
              id="verificationCode"
              label="Verification Code"
              type="text"
              required
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                )
              }
              placeholder="Enter 6-digit code"
            />

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Resend code
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={isOffline || verificationCode.length !== 6}
              >
                Verify Email
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleLogin}>
            <Input
              id="email"
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="font-semibold text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={isOffline}
              >
                Sign in
              </Button>
            </div>
          </form>
        )}

        <p className="mt-10 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold leading-6 text-blue-600 hover:text-blue-500"
          >
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
