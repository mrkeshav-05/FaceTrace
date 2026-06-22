"use client";

import { ErrorType } from "@/utils/errorHandler";

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
  requiresAuth?: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    type: ErrorType;
    details?: any;
  } | null;
  status: number;
}

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Generic API service with built-in error handling
 */
export const apiService = {
  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  },

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  },

  /**
   * Generic request method with error handling
   */
  async request<T>(
    endpoint: string,
    { params, requiresAuth = true, ...customConfig }: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    // Build URL with query parameters
    const url = new URL(`${API_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Default headers
    const headersObj: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add custom headers if provided
    if (customConfig.headers) {
      const customHeaders = customConfig.headers as Record<string, string>;
      Object.keys(customHeaders).forEach(key => {
        headersObj[key] = customHeaders[key];
      });
    }

    // Add auth token if required
    if (requiresAuth) {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headersObj["Authorization"] = `Bearer ${token}`;
      }
    }

    // Convert to HeadersInit
    const headers: HeadersInit = headersObj;

    // Prepare config
    const config: RequestInit = {
      ...customConfig,
      headers,
    };

    try {
      // Check for network connectivity
      if (!navigator.onLine) {
        return {
          data: null,
          error: {
            message: "No internet connection. Please check your network and try again.",
            type: ErrorType.NETWORK,
          },
          status: 0,
        };
      }

      // Make the request
      const response = await fetch(url.toString(), config);

      // Parse the response
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle successful response
      if (response.ok) {
        return {
          data,
          error: null,
          status: response.status,
        };
      }

      // Handle error response
      let errorType: ErrorType;
      switch (response.status) {
        case 400:
          errorType = ErrorType.VALIDATION;
          break;
        case 401:
        case 403:
          errorType = ErrorType.AUTHENTICATION;
          break;
        case 404:
          errorType = ErrorType.NOT_FOUND;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = ErrorType.SERVER;
          break;
        default:
          errorType = ErrorType.UNKNOWN;
      }

      return {
        data: null,
        error: {
          message: data.message || response.statusText || "An error occurred",
          type: errorType,
          details: data.error || data.errors || data,
        },
        status: response.status,
      };
    } catch (error) {
      // Handle fetch errors
      return {
        data: null,
        error: {
          message: (error as Error)?.message || "Network error occurred",
          type: ErrorType.NETWORK,
          details: error,
        },
        status: 0,
      };
    }
  },
};
