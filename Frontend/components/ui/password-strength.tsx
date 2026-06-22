"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  // Calculate password strength
  const getStrength = (password: string): number => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) strength += 1; // Has uppercase
    if (/[a-z]/.test(password)) strength += 1; // Has lowercase
    if (/[0-9]/.test(password)) strength += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) strength += 1; // Has special char
    
    return strength;
  };

  const strength = getStrength(password);
  
  // Don't show for empty passwords
  if (!password) return null;

  const getStrengthLabel = (strength: number): string => {
    if (strength === 0) return "Very Weak";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    if (strength === 4) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = (strength: number): string => {
    if (strength <= 1) return "bg-red-500";
    if (strength === 2) return "bg-orange-500";
    if (strength === 3) return "bg-yellow-500";
    if (strength === 4) return "bg-green-500";
    return "bg-green-600";
  };

  return (
    <div className={cn("mt-1", className)}>
      <div className="flex h-1.5 w-full space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-full flex-1 rounded-full transition-colors",
              i < strength ? getStrengthColor(strength) : "bg-gray-200 dark:bg-gray-700"
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Password strength: <span className="font-medium">{getStrengthLabel(strength)}</span>
      </p>
    </div>
  );
}
