"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { AlertTriangle } from "lucide-react";
import { setUser } from "@/lib/slices/authSlice";
import { ErrorDisplay } from "@/components/ui/error-display";
import { ErrorType } from "@/utils/errorHandler";
import { toast } from "sonner";
import { PasswordStrength } from "@/components/ui/password-strength";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; type?: ErrorType } | null>(null);
  const [otpError, setOtpError] = useState<{ message: string; type?: ErrorType } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch(); // Add this
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setOtpError(null);

    // Validate password
    if (password.length < 6) {
      setError({
        message: "Password must be at least 6 characters long",
        type: ErrorType.VALIDATION
      });
      setIsLoading(false);
      return;
    }

    try {
      // Verify OTP first
      const otpVerified = await checkOtp();
      if (!otpVerified) {
        setOtpError({
          message: "Please verify your OTP before registering",
          type: ErrorType.VALIDATION
        });
        setIsLoading(false);
        return;
      }

      // Register the user
      const response = await fetch(`${API_URL}/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname: fullName, email, password }),
        credentials: "include",
      });

      const data = await response.json();
      // console.log("Registration response:", data); // For debugging

      if (data.success) {
        // Show success toast
        toast.success("Registration successful!", {
          description: "Welcome to ABSENS. You are now logged in."
        });

        // Save user data and tokens
        dispatch(setUser(data.data.user));
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.data.user));

        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Handle standardized error format
        let errorMessage = data.message || "Registration failed. Please try again.";
        let errorType = ErrorType.SERVER;

        // Check for specific error conditions
        if (response.status === 409 ||
            errorMessage.toLowerCase().includes("already exists") ||
            errorMessage.toLowerCase().includes("already registered")) {
          errorMessage = "This email is already registered. Please use a different email or login.";
          errorType = ErrorType.VALIDATION;
        } else if (response.status === 400) {
          errorType = ErrorType.VALIDATION;
        }

        setError({
          message: errorMessage,
          type: errorType
        });
      }
    } catch (err) {
      // Handle network errors
      if (!navigator.onLine) {
        setError({
          message: "No internet connection. Please check your network and try again.",
          type: ErrorType.NETWORK
        });
      } else {
        setError({
          message: "An error occurred while connecting to the server. Please try again.",
          type: ErrorType.UNKNOWN
        });
      }
      // console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getOTP = async () => {
    // Validate email first
    if (!email || !email.includes('@')) {
      setError({
        message: "Please enter a valid email address",
        type: ErrorType.VALIDATION
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setOtpError(null);

    try {
      const response = await fetch(`${API_URL}/user/get-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await response.json();
      // console.log("Get OTP response:", data); // For debugging

      if (data.success) {
        // Show success toast
        toast.success("OTP Sent", {
          description: `A verification code has been sent to ${email}. Please check your inbox.`
        });
      } else {
        // Handle standardized error format
        let errorMessage = data.message || "Failed to send OTP. Please try again.";
        let errorType = ErrorType.SERVER;

        if (response.status === 429) {
          errorMessage = "Too many requests. Please try again later.";
        } else if (response.status === 400) {
          errorType = ErrorType.VALIDATION;
        }

        setError({
          message: errorMessage,
          type: errorType
        });
      }
    } catch (err) {
      // Handle network errors
      if (!navigator.onLine) {
        setError({
          message: "No internet connection. Please check your network and try again.",
          type: ErrorType.NETWORK
        });
      } else {
        setError({
          message: "An error occurred while connecting to the server. Please try again.",
          type: ErrorType.UNKNOWN
        });
      }
      // console.error("OTP request error:", err);
      toast.error("OTP Request Error", {
        description: "Failed to send OTP. Please try again later."
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check OTP
  const checkOtp = async () => {
    // Validate OTP
    if (!otp || otp.trim() === '') {
      setOtpError({
        message: "Please enter the OTP sent to your email",
        type: ErrorType.VALIDATION
      });
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/user/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
        credentials: "include",
      });

      const data = await response.json();
      // console.log("OTP verification response:", data); // For debugging

      if (data.success) {
        setOtpVerified(true);
        setOtpError(null);
        // Show success toast
        toast.success("OTP Verified", {
          description: "Your email has been verified successfully."
        });
        return true;
      } else {
        // Handle standardized error format
        let errorMessage = data.message || "Failed to verify OTP. Please try again.";

        // Check for specific error conditions
        if (response.status === 400 ||
            errorMessage.toLowerCase().includes("invalid") ||
            errorMessage.toLowerCase().includes("otp")) {
          errorMessage = "Invalid OTP. Please check and try again.";
        } else if (response.status === 404 || errorMessage.toLowerCase().includes("expired")) {
          errorMessage = "OTP not found or expired. Please request a new OTP.";
        }

        setOtpError({
          message: errorMessage,
          type: ErrorType.VALIDATION
        });
        return false;
      }
    } catch (err) {
      // Handle network errors
      if (!navigator.onLine) {
        setOtpError({
          message: "No internet connection. Please check your network and try again.",
          type: ErrorType.NETWORK
        });
      } else {
        setOtpError({
          message: "An error occurred while verifying OTP. Please try again.",
          type: ErrorType.UNKNOWN
        });
      }
      // console.error("OTP verification error:", err);
      toast.error("Verification Error", {
        description: "Failed to verify OTP. Please try again."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-20">
      <div className="flex justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-6">
        Sign up for ABSENS
      </h1>
      {error && (
        <ErrorDisplay
          error={error}
          className="mb-4"
          onDismiss={() => setError(null)}
          showRetry={error.type === ErrorType.NETWORK}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            // Retry the network request
            checkOtp().then(verified => {
              if (verified) {
                fetch(`${API_URL}/user/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ fullname: fullName, email, password }),
                  credentials: "include",
                })
                .then(response => response.json())
                .then(data => {
                  setIsLoading(false);
                  if (data.success) {
                    toast.success("Registration successful!", {
                      description: "Welcome to ABSENS. You are now logged in."
                    });
                    dispatch(setUser(data.data.user));
                    localStorage.setItem("accessToken", data.data.accessToken);
                    localStorage.setItem("refreshToken", data.data.refreshToken);
                    localStorage.setItem("user", JSON.stringify(data.data.user));
                    router.push("/dashboard");
                  } else {
                    setError({
                      message: data.message || "Registration failed. Please try again.",
                      type: ErrorType.SERVER
                    });
                  }
                })
                .catch(() => {
                  setIsLoading(false);
                  toast.error("Connection Error", {
                    description: "An error occurred while connecting to the server. Please try again."
                  });
                  setError({
                    message: "An error occurred while connecting to the server. Please try again.",
                    type: ErrorType.UNKNOWN
                  });
                });
              } else {
                setIsLoading(false);
              }
            });
          }}
        />
      )}
      {otpError && (
        <ErrorDisplay
          error={otpError}
          className="mb-4"
          onDismiss={() => setOtpError(null)}
          showRetry={otpError.type === ErrorType.NETWORK}
          onRetry={() => checkOtp()}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="button" onClick={getOTP} className="bg-primary">
              Get OTP
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Input
              id="otp"
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength password={password} />
          <p className="text-xs text-gray-500 mt-1">
            Password must be at least 6 characters long
          </p>
        </div>
        <Button
          type="submit"
          className="w-full bg-primary"
          disabled={isLoading}
        >
          {isLoading ? <Loader size="sm" /> : "Sign Up"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
