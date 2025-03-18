"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import SignupForm from "../components/auth/SignupForm";
import { useAuth } from "../context/AuthContext";

export default function SignupPage(): React.ReactNode {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  );
}
