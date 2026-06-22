"use client";

import React from "react";
import { AlertTriangle, XCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorType } from "@/utils/errorHandler";
import { Button } from "./button";

interface ErrorDisplayProps {
  error?: {
    type?: ErrorType;
    message: string;
    details?: string | string[] | Record<string, any>;
  } | null;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showIcon?: boolean;
  showRetry?: boolean;
  showDismiss?: boolean;
}

export function ErrorDisplay({
  error,
  className,
  onRetry,
  onDismiss,
  showIcon = true,
  showRetry = false,
  showDismiss = true,
}: ErrorDisplayProps) {
  if (!error) return null;

  const getIcon = () => {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case ErrorType.AUTHENTICATION:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case ErrorType.SERVER:
        return <XCircle className="h-5 w-5 text-red-500" />;
      case ErrorType.NETWORK:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case ErrorType.NOT_FOUND:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
      case ErrorType.AUTHENTICATION:
        return "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700";
      case ErrorType.SERVER:
        return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
      case ErrorType.NETWORK:
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
      case ErrorType.NOT_FOUND:
        return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
      default:
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
    }
  };

  const getTextColor = () => {
    switch (error.type) {
      case ErrorType.VALIDATION:
        return "text-amber-800 dark:text-amber-200";
      case ErrorType.AUTHENTICATION:
        return "text-red-900 dark:text-red-100";
      case ErrorType.SERVER:
        return "text-red-800 dark:text-red-200";
      case ErrorType.NETWORK:
        return "text-amber-800 dark:text-amber-200";
      case ErrorType.NOT_FOUND:
        return "text-blue-800 dark:text-blue-200";
      default:
        return "text-amber-800 dark:text-amber-200";
    }
  };

  const renderDetails = () => {
    if (!error.details) return null;

    if (typeof error.details === "string") {
      return <p className="text-sm mt-1">{error.details}</p>;
    }

    if (Array.isArray(error.details)) {
      return (
        <ul className="list-disc list-inside text-sm mt-1 space-y-1">
          {error.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="list-disc list-inside text-sm mt-1 space-y-1">
        {Object.entries(error.details).map(([key, value]) => (
          <li key={key}>
            <span className="font-medium">{key}:</span> {value}
          </li>
        ))}
      </ul>
    );
  };

  // Add animation for authentication errors
  const isAuthError = error.type === ErrorType.AUTHENTICATION;

  return (
    <div
      className={cn(
        "border rounded-md p-4 relative",
        getBackgroundColor(),
        getTextColor(),
        isAuthError && "border-2 shadow-md",
        className
      )}
      role="alert"
    >
      <div className="flex items-start">
        {showIcon && (
          <div className={cn("flex-shrink-0 mr-3", isAuthError && "animate-pulse")}>
            {getIcon()}
          </div>
        )}
        <div className="flex-1">
          <p className={cn("font-medium", isAuthError && "font-bold")}>{error.message}</p>
          {renderDetails()}

          {(showRetry || showDismiss) && (
            <div className="flex gap-2 mt-3">
              {showRetry && onRetry && (
                <Button
                  size="sm"
                  variant={isAuthError ? "default" : "outline"}
                  onClick={onRetry}
                  className="text-xs"
                >
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>

        {showDismiss && onDismiss && (
          <button
            type="button"
            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-gray-300"
            onClick={onDismiss}
            aria-label="Dismiss"
          >
            <span className="sr-only">Dismiss</span>
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
