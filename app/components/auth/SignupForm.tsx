"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUser,
  auth,
  phoneSignIn,
  db,
  generateVerificationCode as generateCode,
} from "@/lib/firebase";
import { sendVerificationEmail } from "@/lib/emailService";
import { createUserProfile } from "@/lib/services/userProfileService";
import {
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  sendEmailVerification,
  updateProfile,
  signInWithEmailAndPassword,
  ApplicationVerifier,
  ConfirmationResult,
  UserCredential,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  DocumentData,
} from "firebase/firestore";

interface InputProps {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  id,
  label,
  type,
  required = false,
  placeholder = "",
  value,
  onChange,
}) => {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
    </div>
  );
};

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  type = "button",
  className = "",
  loading = false,
  disabled = false,
  children,
  onClick,
}) => {
  return (
    <button
      type={type}
      className={`relative py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <span className="absolute left-3 inset-y-0 flex items-center">
          <svg
            className="h-4 w-4 animate-spin text-white"
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
      )}
      {children}
    </button>
  );
};

const SignupForm: React.FC = () => {
  const [isEmail, setIsEmail] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [verificationStep, setVerificationStep] = useState<number>(0);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [emailVerificationCode, setEmailVerificationCode] =
    useState<string>("");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [lastCodeSent, setLastCodeSent] = useState<Date | null>(null);
  const recaptchaVerifierRef = useRef<ApplicationVerifier | null>(null);
  const router = useRouter();

  // Check network status
  useEffect(() => {
    setIsOffline(typeof window !== "undefined" && !navigator.onLine);
    const handleOnline = () => {
      setIsOffline(false);
      setError("");
    };
    const handleOffline = () => {
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

  // Handle resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCountdown]);

  // Set up reCAPTCHA verifier
  useEffect(() => {
    // Only set up recaptcha when phone tab is active and verification step is 0
    if (
      !isEmail &&
      verificationStep === 0 &&
      typeof window !== "undefined" &&
      !isOffline
    ) {
      // Clean up any existing recaptcha verifier
      if (recaptchaVerifierRef.current) {
        try {
          // Cast to any to access the clear method
          (recaptchaVerifierRef.current as any).clear();
        } catch (error) {
          console.error("Error clearing reCAPTCHA:", error);
        }
      }

      // Create a new recaptcha verifier
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(
          auth,
          "recaptcha-container",
          {
            size: "normal",
            callback: () => {
              // reCAPTCHA solved, allow signInWithPhoneNumber
              console.log("reCAPTCHA verified");
            },
            "expired-callback": () => {
              // Response expired. Ask user to solve reCAPTCHA again
              setError("reCAPTCHA expired. Please refresh and try again.");
            },
          }
        );

        // Render the reCAPTCHA
        (recaptchaVerifierRef.current as any).render();
      } catch (error) {
        console.error("Error creating reCAPTCHA:", error);
        setError(
          "Error setting up phone verification. Please try again later."
        );
      }
    }

    return () => {
      // Cleanup function
      if (recaptchaVerifierRef.current) {
        try {
          (recaptchaVerifierRef.current as any).clear();
          recaptchaVerifierRef.current = null;
        } catch (error) {
          console.error("Error clearing reCAPTCHA:", error);
        }
      }
    };
  }, [isEmail, verificationStep, isOffline]);

  const validateEmail = (email: string): boolean => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(password);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - should be improved for production
    return /^\+[1-9]\d{10,14}$/.test(phone);
  };

  const canResendCode = (): boolean => {
    if (!lastCodeSent) return true;
    const timeSinceLastSend = Date.now() - lastCodeSent.getTime();
    return timeSinceLastSend >= 60000; // 1 minute cooldown
  };

  const handleSignup = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isOffline) {
      setError(
        "Cannot sign up while offline. Please check your internet connection."
      );
      setLoading(false);
      return;
    }

    if (isEmail) {
      if (!validateEmail(email)) {
        setError("Please enter a valid email address");
        setLoading(false);
        return;
      }

      if (!validatePassword(password)) {
        setError(
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number"
        );
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      try {
        const userCredential = await createUser(email, password);
        const user = userCredential.user;
        setUserId(user.uid);

        const code = generateCode();
        const codeExpires = new Date();
        codeExpires.setMinutes(codeExpires.getMinutes() + 10); // 10 minutes expiration

        // Create or update user record in Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: email,
          emailVerified: false,
          verificationCode: code,
          verificationCodeExpires: codeExpires,
          createdAt: serverTimestamp(),
          lastCodeSent: serverTimestamp(),
        });

        // Create complete user profile using our service
        await createUserProfile(user.uid, {
          displayName: email.split("@")[0], // Use the part before @ as initial display name
          email: email,
          emailVerified: false,
        });

        await sendVerificationEmail(email, code);
        setLastCodeSent(new Date());
        setVerificationStep(1);
      } catch (err: any) {
        console.error("Signup error:", err);
        let errorMessage = "Failed to create account. Please try again.";

        switch (err.code) {
          case "auth/email-already-in-use":
            errorMessage =
              "This email is already registered. Please sign in instead.";
            break;
          case "auth/invalid-email":
            errorMessage = "Invalid email address.";
            break;
          case "auth/weak-password":
            errorMessage =
              "Password is too weak. Please use a stronger password.";
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
    } else {
      if (!validatePhone(phoneNumber)) {
        setError("Please enter a valid phone number (format: +1234567890)");
        setLoading(false);
        return;
      }

      try {
        if (!recaptchaVerifierRef.current) {
          throw new Error(
            "reCAPTCHA not initialized. Please refresh the page."
          );
        }

        const confirmationResult: ConfirmationResult = await phoneSignIn(
          phoneNumber,
          recaptchaVerifierRef.current
        );
        setVerificationId(confirmationResult.verificationId);
        setVerificationStep(2); // Show OTP input
      } catch (err: any) {
        console.error("Phone verification error:", err);
        setError(
          err.message || "Failed to send verification code. Please try again."
        );
      } finally {
        setLoading(false);
      }
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

    if (!emailVerificationCode || emailVerificationCode.length !== 6) {
      setError("Please enter the 6-digit verification code");
      setLoading(false);
      return;
    }

    try {
      if (!userId) {
        throw new Error("User ID not found");
      }

      const userDoc = doc(db, "users", userId);
      const userSnapshot = await getDoc(userDoc);

      if (!userSnapshot.exists()) {
        throw new Error("User data not found");
      }

      const userData = userSnapshot.data();
      const codeExpires = userData.verificationCodeExpires?.toDate();

      if (!codeExpires || codeExpires < new Date()) {
        throw new Error(
          "Verification code has expired. Please request a new code."
        );
      }

      if (userData.verificationCode !== emailVerificationCode) {
        throw new Error("Invalid verification code");
      }

      // Update user verification status
      await setDoc(
        userDoc,
        {
          emailVerified: true,
          verifiedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also update the profile in our user profiles collection
      await setDoc(
        doc(db, "users", userId),
        {
          emailVerified: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Email verification error:", err);
      setError(err.message || "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Check if offline
    if (isOffline) {
      setError(
        "Cannot verify phone number while offline. Please check your internet connection."
      );
      setLoading(false);
      return;
    }

    if (!verificationCode || verificationCode.length < 6) {
      setError("Please enter the 6-digit verification code");
      setLoading(false);
      return;
    }

    try {
      if (!verificationId) {
        throw new Error("Verification session expired. Please try again.");
      }

      // Create the credentials
      const credential = PhoneAuthProvider.credential(
        verificationId,
        verificationCode
      );
      const userCredential = await signInWithCredential(auth, credential);

      try {
        // Store the user data in Firestore
        await setDoc(
          doc(db, "users", userCredential.user.uid),
          {
            phoneNumber: phoneNumber,
            phoneVerified: true,
            verifiedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Create a complete user profile using our service
        await createUserProfile(userCredential.user.uid, {
          displayName: phoneNumber,
          email: `${phoneNumber.replace(/[+\s]/g, "")}@phone.yourweek.app`,
          emailVerified: true,
        });

        router.push("/dashboard");
      } catch (firestoreError: any) {
        console.error(
          "Firestore error during phone verification:",
          firestoreError
        );

        // If the error is because we're offline, we'll just proceed
        if (
          firestoreError.code === "failed-precondition" ||
          firestoreError.message?.includes("offline")
        ) {
          // We're already authenticated, so allow the user to proceed
          router.push("/dashboard");
        } else {
          setError("Error saving verification data. Please try again.");
        }
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setError(err.message || "Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async (): Promise<void> => {
    if (!canResendCode()) {
      setError(
        `Please wait ${Math.ceil(
          resendCountdown / 60
        )} seconds before requesting a new code.`
      );
      return;
    }

    if (!userId) {
      setError("User session expired. Please sign up again.");
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
      setLastCodeSent(new Date());
      setResendCountdown(60);
      setError("");
    } catch (err: any) {
      console.error("Error resending code:", err);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white px-6 py-12 shadow-md rounded-lg max-w-md w-full mx-auto">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Create your YourWeek account
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
                  You're currently offline. Sign up requires an internet
                  connection.
                </p>
              </div>
            </div>
          </div>
        )}

        {verificationStep === 0 && (
          <>
            <div className="mb-4 flex border rounded overflow-hidden">
              <button
                className={`flex-1 py-2 px-4 focus:outline-none ${
                  isEmail ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
                onClick={() => setIsEmail(true)}
                type="button"
              >
                Email
              </button>
              <button
                className={`flex-1 py-2 px-4 focus:outline-none ${
                  !isEmail ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
                onClick={() => setIsEmail(false)}
                type="button"
                disabled={isOffline}
              >
                Phone
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSignup}>
              {isEmail ? (
                <>
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

                  <Input
                    id="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Input
                    id="phoneNumber"
                    label="Phone Number"
                    type="tel"
                    required
                    placeholder="+1234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />

                  <div id="recaptcha-container" className="my-4"></div>
                </>
              )}

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={isOffline}
                >
                  {isEmail ? "Sign up with Email" : "Send Verification Code"}
                </Button>
              </div>
            </form>
          </>
        )}

        {verificationStep === 1 && (
          <div>
            <p className="text-green-600 mb-4">
              We've sent a verification code to your email:{" "}
              <strong>{email}</strong>
            </p>
            <p className="mb-4 text-gray-700">
              Please enter the 6-digit verification code below.
            </p>
            <form className="space-y-6" onSubmit={handleVerifyEmail}>
              <Input
                id="emailVerificationCode"
                label="Verification Code"
                type="text"
                required
                value={emailVerificationCode}
                onChange={(e) => setEmailVerificationCode(e.target.value)}
              />

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={isOffline}
                >
                  Verify Email
                </Button>
              </div>

              <div className="text-center text-sm text-gray-500">
                <span>Didn't receive a code? </span>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className={`font-semibold text-blue-600 hover:text-blue-500 ${
                    isOffline ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isOffline}
                >
                  Resend Code
                </button>
              </div>
            </form>
          </div>
        )}

        {verificationStep === 2 && (
          <div>
            <p className="mb-4 text-gray-700">
              We've sent a verification code to {phoneNumber}. Please enter the
              code below.
            </p>
            <form className="space-y-6" onSubmit={handleVerifyOTP}>
              <Input
                id="verificationCode"
                label="Verification Code"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={isOffline}
                >
                  Verify and Sign up
                </Button>
              </div>
            </form>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold leading-6 text-blue-600 hover:text-blue-500"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupForm;
