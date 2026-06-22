import { toast } from "sonner";

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  SERVER = "SERVER",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION = "PERMISSION",
  UNKNOWN = "UNKNOWN",
}

/**
 * Interface for standardized error objects
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: string | string[] | Record<string, any>;
  originalError?: any;
}

/**
 * Parse API error responses into a standardized format
 */
export const parseApiError = async (error: any, response?: Response): Promise<AppError> => {
  // Network errors (no response)
  if (!response) {
    return {
      type: ErrorType.NETWORK,
      message: "Network error. Please check your connection.",
      originalError: error,
    };
  }

  // Try to parse the response as JSON
  let errorData;
  try {
    errorData = await response.json();
  } catch (e) {
    // If we can't parse JSON, use status text
    return {
      type: ErrorType.UNKNOWN,
      message: response.statusText || "An unknown error occurred",
      originalError: error,
    };
  }

  // Map HTTP status codes to error types
  switch (response.status) {
    case 400:
      return {
        type: ErrorType.VALIDATION,
        message: errorData.message || "Invalid request",
        details: errorData.error || errorData.errors,
        originalError: error,
      };
    case 401:
    case 403:
      return {
        type: ErrorType.AUTHENTICATION,
        message: errorData.message || "Authentication error",
        originalError: error,
      };
    case 404:
      return {
        type: ErrorType.NOT_FOUND,
        message: errorData.message || "Resource not found",
        originalError: error,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: ErrorType.SERVER,
        message: errorData.message || "Server error",
        originalError: error,
      };
    default:
      return {
        type: ErrorType.UNKNOWN,
        message: errorData.message || "An unknown error occurred",
        originalError: error,
      };
  }
};

/**
 * Handle errors with appropriate actions based on error type
 */
export const handleError = (error: AppError | Error | unknown, showToast = true): AppError => {
  let appError: AppError;

  // Convert to AppError if it's not already
  if ((error as AppError).type) {
    appError = error as AppError;
  } else if (error instanceof Error) {
    appError = {
      type: ErrorType.UNKNOWN,
      message: error.message || "An unknown error occurred",
      originalError: error,
    };
  } else {
    appError = {
      type: ErrorType.UNKNOWN,
      message: "An unknown error occurred",
      originalError: error,
    };
  }

  // Log the error for debugging
  console.error("Error:", appError);

  // Show toast notification if requested
  if (showToast) {
    toast.error(appError.message, {
      description: typeof appError.details === "string" ? appError.details : undefined,
    });
  }

  // Special handling for authentication errors
  if (appError.type === ErrorType.AUTHENTICATION) {
    // Clear tokens and redirect to login if needed
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
  }

  return appError;
};

/**
 * Safely fetch data with error handling
 */
export const safeFetch = async <T>(
  url: string,
  options?: RequestInit,
  errorMessage?: string
): Promise<T> => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await parseApiError(null, response);
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    if ((error as AppError).type) {
      throw error;
    }
    
    const appError: AppError = {
      type: ErrorType.UNKNOWN,
      message: errorMessage || "Failed to fetch data",
      originalError: error,
    };
    
    throw appError;
  }
};
