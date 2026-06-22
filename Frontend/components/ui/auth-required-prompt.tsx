"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

interface AuthRequiredPromptProps {
  message?: string;
  className?: string;
}

export function AuthRequiredPrompt({
  message = "You need to be logged in to perform this action.",
  className = "",
}: AuthRequiredPromptProps) {
  return (
    <div className={`bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">{message}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <Button asChild size="sm" className="flex items-center gap-1">
              <Link href="/login">
                <LogIn className="h-4 w-4 mr-1" />
                Log In
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex items-center gap-1">
              <Link href="/signup">
                <UserPlus className="h-4 w-4 mr-1" />
                Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
