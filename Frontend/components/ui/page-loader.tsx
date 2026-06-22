"use client";

import React from "react";
import { Loader } from "@/components/ui/loader";

interface PageLoaderProps {
  message?: string;
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function PageLoader({ 
  message = "Loading...", 
  size = "lg",
  className = ""
}: PageLoaderProps) {
  return (
    <div className={`container mx-auto py-10 flex justify-center items-center min-h-[50vh] ${className}`}>
      <div className="text-center">
        <div className="mx-auto flex justify-center">
          <Loader size={size} />
        </div>
        {message && (
          <p className="mt-4 text-muted-foreground text-sm sm:text-base animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
