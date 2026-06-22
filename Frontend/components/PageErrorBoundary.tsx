"use client";

import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import { usePathname } from "next/navigation";

interface PageErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * A wrapper component that provides error boundary functionality for pages
 * It resets the error state when the pathname changes
 */
export default function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  const pathname = usePathname();
  const [key, setKey] = React.useState(pathname);

  // Reset the error boundary when the pathname changes
  React.useEffect(() => {
    setKey(pathname);
  }, [pathname]);

  return <ErrorBoundary key={key}>{children}</ErrorBoundary>;
}
