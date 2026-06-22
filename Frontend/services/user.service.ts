"use client";

import { setUser } from "@/lib/slices/authSlice";
import { Dispatch } from "redux";

/**
 * Fetches the latest user data from the backend and updates the Redux store
 * @param dispatch Redux dispatch function
 * @returns Promise that resolves to true if successful, false otherwise
 */
export const refreshUserData = async (dispatch: Dispatch): Promise<boolean> => {
  try {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    const accessToken = localStorage.getItem("accessToken");
    
    if (!accessToken) {
      console.error("No access token found");
      return false;
    }
    
    const response = await fetch(`${API_URL}/user/profile`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      console.error("Failed to fetch user data:", response.statusText);
      return false;
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Update Redux store with fresh user data
      dispatch(setUser(data.data));
      
      // Also update localStorage
      localStorage.setItem("user", JSON.stringify(data.data));
      
      return true;
    } else {
      console.error("API returned unsuccessful response:", data.message);
      return false;
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
    return false;
  }
};
