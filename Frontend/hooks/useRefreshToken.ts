"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout, setUser, updateIsLoggedIn } from "@/lib/slices/authSlice";
import { useRouter } from "next/navigation";

interface RefreshResponseData {
  accessToken: string;
  refreshToken?: string;
  user?: any; // Replace `any` with your User type if available.
}

interface RefreshResponse {
  data: RefreshResponseData;
}

const useRefreshToken = (): void => {
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    // Refresh interval in milliseconds (every 12 hours)
    // This ensures the token is refreshed well before it expires
    const intervalTime = 12 * 60 * 60 * 1000;

    // Also refresh token on user activity
    const updateLastActivity = () => {
      localStorage.setItem("lastActivity", Date.now().toString());
    };

    // Track user activity
    window.addEventListener("click", updateLastActivity);
    window.addEventListener("keypress", updateLastActivity);
    window.addEventListener("scroll", updateLastActivity);
    window.addEventListener("mousemove", updateLastActivity);

    // Set initial activity timestamp
    updateLastActivity();

    const interval = setInterval(async () => {
      try {
        const storedRefreshToken = localStorage.getItem("refreshToken");
        if (!storedRefreshToken) {
          throw new Error("No refresh token available");
        }

        // Check if user has been inactive for more than 7 days
        const lastActivity = localStorage.getItem("lastActivity");
        if (lastActivity) {
          const inactiveTime = Date.now() - parseInt(lastActivity);
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

          if (inactiveTime > sevenDaysInMs) {
            throw new Error("Session expired due to inactivity");
          }
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/user/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
            credentials: "include",
          }
        );

        if (response.ok) {
          const data: RefreshResponse = await response.json();
          // Save the new access token in localStorage.
          localStorage.setItem("accessToken", data.data.accessToken);

          // Save the new refresh token if provided
          if (data.data.refreshToken) {
            localStorage.setItem("refreshToken", data.data.refreshToken);
          }

          // Optionally update the user in global state if user data is provided.
          if (data.data.user) {
            dispatch(setUser(data.data.user));
          }

          // Update the global isLoggedIn state based on the new access token.
          dispatch(updateIsLoggedIn());

          // Update the last activity timestamp
          localStorage.setItem("lastActivity", Date.now().toString());
        } else {
          // If the refresh call fails, treat it as session expired.
          throw new Error("Session expired");
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
        // Dispatch logout action and redirect to login page.
        dispatch(logout());
        router.push("/login");
        // Clear the interval so no further attempts are made.
        clearInterval(interval);
      }
    }, intervalTime);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", updateLastActivity);
      window.removeEventListener("keypress", updateLastActivity);
      window.removeEventListener("scroll", updateLastActivity);
      window.removeEventListener("mousemove", updateLastActivity);
    };
  }, [dispatch, router]);
};

export default useRefreshToken;
