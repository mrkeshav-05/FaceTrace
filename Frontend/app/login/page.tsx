"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ message: string; type?: ErrorType; details?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: { auth: { user: any } }) => state.auth.user);
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  // Redirect to dashboard if the user is already logged in.
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/user/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        }
      );

      const data = await response.json();
      // console.log("Login response:", data); // For debugging

      if (data.success) {
        // Show success toast
        toast.success("Login Successful", {
          description: "Welcome back to ABSENS!"
        });

        // Save user object and tokens in localStorage.
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("accessToken", data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken);

        // Update the global auth state.
        dispatch(setUser(data.data.user));

        router.push("/dashboard");
      } else {
        // Handle API errors with standardized format
        let errorMessage = data.message || "Login failed. Please try again.";
        let errorType = ErrorType.SERVER;
        let errorDetails = null;

        // Check for specific error messages and status codes
        if (response.status === 401) {
          errorMessage = "Incorrect password. Please try again.";
          errorType = ErrorType.AUTHENTICATION;
        } else if (response.status === 404) {
          errorMessage = "User not found. Please check your email or sign up.";
          errorType = ErrorType.AUTHENTICATION;
        } else if (
          errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("credentials")
        ) {
          errorMessage = "Incorrect email or password. Please try again.";
          errorType = ErrorType.AUTHENTICATION;
        } else if (errorMessage.toLowerCase().includes("password")) {
          errorMessage = "Incorrect password. Please try again.";
          errorType = ErrorType.AUTHENTICATION;
        } else if (errorMessage.toLowerCase().includes("not found")) {
          errorMessage = "User not found. Please check your email or sign up.";
          errorType = ErrorType.AUTHENTICATION;
        } else if (response.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
          errorType = ErrorType.SERVER;
        }

        setError({
          message: errorMessage,
          type: errorType,
          details: errorDetails
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
      // console.error("Login error:", err);
      toast.error("Login Error", {
        description: "An error occurred during login. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md mb-20">
      <div className="flex justify-center mb-6">
        <AlertTriangle className="h-12 w-12 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-center mb-6">Login to ABSENS</h1>
      {error && (
        <ErrorDisplay
          error={error}
          className="mb-4"
          onDismiss={() => setError(null)}
          showRetry={error.type === ErrorType.NETWORK}
          onRetry={() => {
            setIsLoading(true);
            setError(null);
            // Retry the login without the event object
            fetch(`${API_URL}/user/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
              credentials: "include",
            })
            .then(response => {
              return response.json().then(data => ({ data, response }));
            })
            .then(({ data, response }) => {
              setIsLoading(false);
              if (data.success) {
                toast.success("Login Successful", {
                  description: "Welcome back to ABSENS!"
                });
                localStorage.setItem("user", JSON.stringify(data.data.user));
                localStorage.setItem("accessToken", data.data.accessToken);
                localStorage.setItem("refreshToken", data.data.refreshToken);
                dispatch(setUser(data.data.user));
                router.push("/dashboard");
              } else {
                // Handle API errors with standardized format
                let errorMessage = data.message || "Login failed. Please try again.";
                let errorType = ErrorType.SERVER;
                let errorDetails = null;

                // Check for specific error messages and status codes
                if (response.status === 401) {
                  errorMessage = "Incorrect password. Please try again.";
                  errorType = ErrorType.AUTHENTICATION;
                } else if (response.status === 404) {
                  errorMessage = "User not found. Please check your email or sign up.";
                  errorType = ErrorType.AUTHENTICATION;
                } else if (
                  errorMessage.toLowerCase().includes("invalid") ||
                  errorMessage.toLowerCase().includes("credentials")
                ) {
                  errorMessage = "Incorrect email or password. Please try again.";
                  errorType = ErrorType.AUTHENTICATION;
                } else if (errorMessage.toLowerCase().includes("password")) {
                  errorMessage = "Incorrect password. Please try again.";
                  errorType = ErrorType.AUTHENTICATION;
                } else if (errorMessage.toLowerCase().includes("not found")) {
                  errorMessage = "User not found. Please check your email or sign up.";
                  errorType = ErrorType.AUTHENTICATION;
                }

                setError({
                  message: errorMessage,
                  type: errorType,
                  details: errorDetails
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
          }}
        />
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-primary"
          disabled={isLoading}
        >
          {isLoading ? <Loader size="sm" /> : "Login"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
