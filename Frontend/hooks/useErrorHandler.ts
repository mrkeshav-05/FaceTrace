"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ErrorType } from "@/utils/errorHandler";

export interface ErrorState {
  message: string;
  type?: ErrorType;
  details?: string | string[] | Record<string, any>;
}

interface UseErrorHandlerOptions {
  showToast?: boolean;
  redirectOnAuthError?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, redirectOnAuthError = true } = options;
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = (
    err: unknown,
    customMessage?: string
  ): ErrorState => {
    let errorState: ErrorState;

    // Handle different error types
    if ((err as ErrorState).type) {
      // Already in our format
      errorState = err as ErrorState;
    } else if (err instanceof Response) {
      // Fetch Response object
      errorState = {
        message: customMessage || `Error: ${err.status} ${err.statusText}`,
        type: err.status === 401 || err.status === 403 
          ? ErrorType.AUTHENTICATION 
          : err.status === 404 
            ? ErrorType.NOT_FOUND 
            : err.status >= 500 
              ? ErrorType.SERVER 
              : ErrorType.UNKNOWN
      };
    } else if (err instanceof Error) {
      // Standard Error object
      errorState = {
        message: customMessage || err.message,
        type: err.name === "TypeError" && err.message.includes("fetch") 
          ? ErrorType.NETWORK 
          : ErrorType.UNKNOWN,
        details: err.stack
      };
    } else if (typeof err === "string") {
      // String error
      errorState = {
        message: err,
        type: ErrorType.UNKNOWN
      };
    } else {
      // Unknown error type
      errorState = {
        message: customMessage || "An unknown error occurred",
        type: ErrorType.UNKNOWN,
        details: JSON.stringify(err)
      };
    }

    // Set the error state
    setError(errorState);

    // Show toast if enabled
    if (showToast) {
      toast.error(errorState.message, {
        description: typeof errorState.details === "string" ? errorState.details : undefined,
      });
    }

    // Handle authentication errors
    if (redirectOnAuthError && 
        errorState.type === ErrorType.AUTHENTICATION && 
        typeof window !== "undefined") {
      // Clear tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      
      // Redirect to login
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return errorState;
  };

  const clearError = () => setError(null);

  return {
    error,
    setError,
    handleError,
    clearError
  };
}
