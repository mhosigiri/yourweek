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
import EnhancedInput from "../ui/EnhancedInput";
import { EmailIcon, PasswordIcon, VerifyIcon } from "../ui/IconSet";
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
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
          errorMessage = "Incorrect email or password. Please try again.";
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
          // Remove Firebase-specific error details from user-facing messages
          errorMessage = "Authentication error. Please try again.";
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

      // Provide user-friendly error messages
      let errorMessage = "Failed to verify code. Please try again.";

      if (err.message.includes("expired")) {
        errorMessage =
          "Verification code has expired. Please request a new code.";
      } else if (err.message.includes("Invalid verification code")) {
        errorMessage = "Invalid verification code. Please check and try again.";
      } else if (err.message.includes("User session expired")) {
        errorMessage = "Your session has expired. Please log in again.";
      }

      setError(errorMessage);
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

      // Provide user-friendly error messages
      let errorMessage =
        "Failed to resend verification code. Please try again.";

      if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      }

      setError(errorMessage);
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

      // Provide user-friendly error messages
      let errorMessage = "Failed to send reset email. Please try again.";

      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many requests. Please try again later.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white px-6 py-12 shadow-md rounded-lg max-w-md w-full mx-auto relative overflow-hidden">
      {/* Abstract shapes */}
      <div className="absolute top-0 right-0 bg-blue-100 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-50"></div>
      <div className="absolute bottom-0 left-0 bg-purple-100 w-24 h-24 rounded-full -ml-12 -mb-12 opacity-50"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-sm relative">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-lg flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-bold">SP</span>
          </div>
        </div>

        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          {verificationRequired
            ? "Verify Your Email"
            : "Sign in to Social-Plan"}
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

            <EnhancedInput
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
              icon={<VerifyIcon />}
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
            <EnhancedInput
              id="email"
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EmailIcon />}
            />

            <EnhancedInput
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<PasswordIcon />}
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
