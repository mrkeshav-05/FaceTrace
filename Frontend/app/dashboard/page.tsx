"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowRight,
  Clock,
  Activity,
  PieChart,
  Bell,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ErrorDisplay } from "@/components/ui/error-display";
import { ErrorType } from "@/utils/errorHandler";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { setUser } from "@/lib/slices/authSlice";
import { PageLoader } from "@/components/ui/page-loader";
import { refreshUserData } from "@/services/user.service";

// Define interfaces for reported and missing cases based on your data structure
interface ReportedCase {
  _id: string;
  name: string;
  location: string;
  status: string;
  createdAt: string;
  description: string;
  photos: string[];
}

interface MissingCase {
  _id: string;
  name: string;
  age: number;
  gender: string;
  createdAt: string;
  missingDate: string;
  description: string;
  lastSeenLocation: string;
  photos: string[];
  status: string;
}

// Define interface for the User object
interface User {
  username: string;
  email: string;
  fullname: string;
  gender: string;
  avatar: string;
  createdAt: string;
  reportedCases: ReportedCase[];
  missingCases: MissingCase[];
}

// Create a fallback/mock user data object that matches the User interface
const mockUserData: User = {
  username: "manu",
  email: "manu@gmail.com",
  fullname: "manish",
  gender: "Others",
  avatar: "",
  createdAt: "2025-02-11T23:21:17.868Z",
  reportedCases: [
    {
      _id: "67af50f1e89e03bf4c10f4d4",
      name: "Unknown",
      location: "Lucknow",
      status: "pending",
      createdAt: "2025-02-14T14:19:29.688Z",
      description: "sldkvjhbsjkanhj",
      photos: [
        "https://res.cloudinary.com/dlhgzwwdx/image/upload/v1739542768/Absens_HOF/x6oe6q54wgfhofgpeigj.jpg",
      ],
    },
  ],
  missingCases: [
    {
      _id: "67af51a1e89e03bf4c10f4d9",
      name: "Manish Kumar",
      age: 18,
      gender: "Male",
      createdAt: "2025-02-14T14:22:25.224Z",
      missingDate: "2025-02-06T00:00:00.000Z",
      description: "No description provided",
      lastSeenLocation: "Lucknow",
      photos: [
        "https://res.cloudinary.com/dlhgzwwdx/image/upload/v1739542944/Absens_HOF/hn7tnhhpeurssuhmwjgk.jpg",
      ],
      status: "missing",
    },
  ],
};

// Define the shape of your Redux state (adjust as needed)
interface RootState {
  auth: {
    user: User | null;
  };
}

// Define an interface for the editable profile portion of the user
interface UserProfile {
  fullname: string;
  email: string;
  gender: string;
  avatar: string;
}

const DashboardPage: React.FC = () => {
  // Initialize router for navigation
  const router = useRouter();
  const dispatch = useDispatch();

  // Retrieve authenticated user from Redux store; fallback to mockUserData if not available
  const loggedInUser = useSelector((state: RootState) => state.auth.user);
  const currentUser: User = loggedInUser || mockUserData;

  // Get the tab from URL query parameter
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const tabParam = searchParams.get('tab');

  // Local state for active tab and profile editing
  const [activeTab, setActiveTab] = useState<string>(tabParam || "overview");
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPageLoading, setIsPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<{ message: string; type?: ErrorType } | null>(null);

  // Combined resolved cases
  const resolvedCases = [
    ...currentUser.reportedCases
      .filter(c => c.status.toLowerCase() === "resolved" || c.status.toLowerCase() === "verified")
      .map(c => ({ ...c, caseType: 'reported' })),
    ...currentUser.missingCases
      .filter(c => c.status.toLowerCase() === "found")
      .map(c => ({ ...c, caseType: 'missing' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    fullname: currentUser.fullname,
    email: currentUser.email,
    gender: currentUser.gender,
    avatar:
      currentUser.avatar ||
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80",
  });

  // Navigation handlers
  const handleViewMissingCase = (caseId: string) => {
    router.push(`/missing/${caseId}`);
  };

  const handleViewReportedCase = (caseId: string) => {
    router.push(`/report/${caseId}`);
  };

  // Helper function to combine and sort both types of cases for the overview
  const getCombinedRecentActivity = () => {
    // Create a combined array of both case types with a type indicator
    const reportedWithType = currentUser.reportedCases.map(item => ({
      ...item,
      caseType: 'reported',
      date: new Date(item.createdAt),
    }));

    const missingWithType = currentUser.missingCases.map(item => ({
      ...item,
      caseType: 'missing',
      date: new Date(item.createdAt),
    }));

    // Combine both arrays and sort by date (most recent first)
    const combined = [...reportedWithType, ...missingWithType]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5); // Get only the 5 most recent activities

    return combined;
  };

  useEffect(() => {
    setEditedProfile({
      fullname: currentUser.fullname,
      email: currentUser.email,
      gender: currentUser.gender,
      avatar:
        currentUser.avatar ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80",
    });
  }, [currentUser]);

  // Fetch latest user data when dashboard loads
  useEffect(() => {
    const fetchLatestUserData = async () => {
      try {
        setIsPageLoading(true);
        // Refresh user data from the backend
        await refreshUserData(dispatch);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchLatestUserData();
  }, [dispatch]);

  // Handler for updating the profile
  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!editedProfile.fullname.trim()) {
        setError({
          message: "Full name is required",
          type: ErrorType.VALIDATION
        });
        setIsLoading(false);
        return;
      }

      if (!editedProfile.email.trim() || !editedProfile.email.includes('@')) {
        setError({
          message: "Valid email is required",
          type: ErrorType.VALIDATION
        });
        setIsLoading(false);
        return;
      }

      // Make API call to update profile
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
      const response = await fetch(`${API_URL}/user/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
        },
        body: JSON.stringify({
          fullname: editedProfile.fullname,
          email: editedProfile.email,
          gender: editedProfile.gender
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Show success toast
        toast.success("Profile Updated", {
          description: "Your profile has been updated successfully."
        });

        // Update local storage with new user data
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUser = {
          ...user,
          fullname: editedProfile.fullname,
          email: editedProfile.email,
          gender: editedProfile.gender
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update Redux state
        dispatch(setUser(updatedUser));

        setIsEditingProfile(false);
      } else {
        // Handle error response
        setError({
          message: data.message || "Failed to update profile",
          type: ErrorType.SERVER
        });
      }
    } catch (err) {
      // Handle network errors
      if (!navigator.onLine) {
        setError({
          message: "No internet connection. Please check your network and try again.",
          type: ErrorType.NETWORK
        });
      } else {
        setError({
          message: "An error occurred while updating your profile. Please try again.",
          type: ErrorType.UNKNOWN
        });
      }
      console.error("Profile update error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for avatar changes
  const handleAvatarChange = (newAvatarUrl: string) => {
    setEditedProfile(prev => ({
      ...prev,
      avatar: newAvatarUrl
    }));
  };

  // Handler for input changes in the profile form
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isPageLoading) {
    return <PageLoader message="Loading your dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6">
            {!isEditingProfile ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
                  <div className="flex-shrink-0">
                    <AvatarUpload
                      currentAvatar={currentUser.avatar}
                      size="md"
                    />
                  </div>
                  <div className="text-center sm:text-left w-full">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                      {currentUser.fullname}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 break-words">@{currentUser.username}</p>
                    <p className="text-sm sm:text-base text-gray-600 break-words">{currentUser.email}</p>
                    <div className="mt-2 flex justify-center sm:justify-start items-center">
                      <span className="px-3 py-1 rounded-full text-xs sm:text-sm bg-blue-100 text-blue-800">
                        {currentUser.gender}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1">
                      Member since:{" "}
                      {new Date(currentUser.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="absolute right-0 top-0 p-2 hover:bg-gray-100 rounded-full z-10"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                </button>
                <form onSubmit={handleProfileUpdate} className="mt-4 sm:mt-6">
                  {error && (
                    <ErrorDisplay
                      error={error}
                      className="mb-4"
                      onDismiss={() => setError(null)}
                      showRetry={error.type === ErrorType.NETWORK}
                      onRetry={() => handleProfileUpdate}
                    />
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col items-center md:items-start">
                      <AvatarUpload
                        currentAvatar={editedProfile.avatar}
                        onAvatarChange={handleAvatarChange}
                        size="md"
                      />
                    </div>
                    <div className="space-y-4 w-full">
                      <div>
                        <label
                          htmlFor="fullname"
                          className="block text-xs sm:text-sm font-medium text-gray-700"
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="fullname"
                          name="fullname"
                          value={editedProfile.fullname}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-xs sm:text-sm font-medium text-gray-700"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={editedProfile.email}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="gender"
                          className="block text-xs sm:text-sm font-medium text-gray-700"
                        >
                          Gender
                        </label>
                        <select
                          id="gender"
                          name="gender"
                          value={editedProfile.gender}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs sm:text-sm"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center text-xs sm:text-sm"
                        >
                          {isLoading ? (
                            <>
                              <span className="animate-spin mr-2">
                                <svg className="h-3 w-3 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </span>
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 md:ml-4">
                <p className="text-xs sm:text-sm text-gray-600">Total Cases</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">
                  {currentUser.reportedCases.length +
                    currentUser.missingCases.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-500 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 md:ml-4">
                <p className="text-xs sm:text-sm text-gray-600">Reported Cases</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">
                  {
                    currentUser.reportedCases.filter(
                      (c) => c.status.toLowerCase() === "pending"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-green-500 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 md:ml-4">
                <p className="text-xs sm:text-sm text-gray-600">Resolved Cases</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">
                  {
                    currentUser.reportedCases.filter(
                      (c) => c.status.toLowerCase() === "resolved" || c.status.toLowerCase() === "verified"
                    ).length +
                    currentUser.missingCases.filter(
                      (c) => c.status.toLowerCase() === "found"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 md:p-6">
            <div className="flex items-center">
              <Search className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500 flex-shrink-0" />
              <div className="ml-2 sm:ml-3 md:ml-4">
                <p className="text-xs sm:text-sm text-gray-600">Missing Cases</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">
                  {currentUser.missingCases.filter(c => c.status.toLowerCase() === "missing").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex -mb-px whitespace-nowrap min-w-full">
              <button
                onClick={() => {
                  setActiveTab("overview");
                  router.push("/dashboard?tab=overview", { scroll: false });
                }}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${
                  activeTab === "overview"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => {
                  setActiveTab("reported");
                  router.push("/dashboard?tab=reported", { scroll: false });
                }}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${
                  activeTab === "reported"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Reported Cases
              </button>
              <button
                onClick={() => {
                  setActiveTab("missing");
                  router.push("/dashboard?tab=missing", { scroll: false });
                }}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${
                  activeTab === "missing"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Missing Cases
              </button>
              <button
                onClick={() => {
                  setActiveTab("resolved");
                  router.push("/dashboard?tab=resolved", { scroll: false });
                }}
                className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium ${
                  activeTab === "resolved"
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Resolved Cases
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Activity Summary */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {getCombinedRecentActivity().length > 0 ? (
                      getCombinedRecentActivity().map((item) => (
                        <div
                          key={item._id}
                          className="p-4 bg-gray-50 rounded-lg shadow hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => item.caseType === 'missing'
                            ? handleViewMissingCase(item._id)
                            : handleViewReportedCase(item._id)
                          }
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {item.caseType === 'missing' ? (
                                <Search className="h-6 w-6 text-purple-500" />
                              ) : (
                                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">
                                  {item.caseType === 'missing' ? 'Missing Person' : 'Reported Sighting'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2">
                                {item.date.toLocaleDateString()}
                              </span>
                              <Clock className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <div className="flex items-center text-primary hover:text-primary/80 text-sm font-medium">
                              View details <ArrowRight className="ml-1 h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No recent activity found.</p>
                    )}
                  </div>
                </div>

                {/* Statistics Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Case Status Distribution */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 mr-1 sm:mr-2 flex-shrink-0" />
                        <h4 className="text-sm sm:text-md font-medium">Case Status</h4>
                      </div>
                      <div className="flex items-center justify-around py-2 sm:py-4">
                        <div className="text-center px-1">
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-500">
                            {currentUser.reportedCases.filter(c => c.status.toLowerCase() === "pending").length}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">Pending</div>
                        </div>
                        <div className="text-center px-1">
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-green-500">
                            {currentUser.reportedCases.filter(c => c.status.toLowerCase() === "resolved" || c.status.toLowerCase() === "verified").length +
                             currentUser.missingCases.filter(c => c.status.toLowerCase() === "found").length}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">Resolved</div>
                        </div>
                        <div className="text-center px-1">
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-red-500">
                            {currentUser.missingCases.filter(c => c.status.toLowerCase() === "missing").length}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">Missing</div>
                        </div>
                      </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
                      <div className="flex items-center mb-3 sm:mb-4">
                        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500 mr-1 sm:mr-2 flex-shrink-0" />
                        <h4 className="text-sm sm:text-md font-medium">Activity Summary</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs sm:text-sm text-gray-600">Total Cases</span>
                          <span className="text-xs sm:text-sm font-medium">{currentUser.reportedCases.length + currentUser.missingCases.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2.5">
                          <div className="bg-indigo-600 h-1.5 sm:h-2.5 rounded-full" style={{ width: '100%' }}></div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs sm:text-sm text-gray-600">Reported Sightings</span>
                          <span className="text-xs sm:text-sm font-medium">{currentUser.reportedCases.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2.5">
                          <div className="bg-yellow-500 h-1.5 sm:h-2.5 rounded-full" style={{
                            width: `${currentUser.reportedCases.length > 0
                              ? (currentUser.reportedCases.length / (currentUser.reportedCases.length + currentUser.missingCases.length) * 100)
                              : 0}%`
                          }}></div>
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs sm:text-sm text-gray-600">Missing Persons</span>
                          <span className="text-xs sm:text-sm font-medium">{currentUser.missingCases.length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2.5">
                          <div className="bg-purple-500 h-1.5 sm:h-2.5 rounded-full" style={{
                            width: `${currentUser.missingCases.length > 0
                              ? (currentUser.missingCases.length / (currentUser.reportedCases.length + currentUser.missingCases.length) * 100)
                              : 0}%`
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <Link href="/report" className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition-shadow flex items-center">
                      <div className="bg-yellow-100 p-2 sm:p-3 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-medium">Report Sighting</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Report a missing person sighting</p>
                      </div>
                    </Link>

                    <Link href="/find" className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition-shadow flex items-center">
                      <div className="bg-purple-100 p-2 sm:p-3 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                        <Search className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-medium">Find Missing</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Report a missing person</p>
                      </div>
                    </Link>

                    <Link href="/alerts" className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition-shadow flex items-center">
                      <div className="bg-blue-100 p-2 sm:p-3 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                        <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-medium">View Alerts</h4>
                        <p className="text-xs sm:text-sm text-gray-500">Check recent alerts</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* View All Listings Section */}
                <div>
                  <h3 className="text-lg font-medium mb-3 sm:mb-4">My Listings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Link href="/my-missing" className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition-shadow flex items-center">
                      <div className="bg-indigo-100 p-2 sm:p-3 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                        <Search className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-medium">My Missing Person Listings</h4>
                        <p className="text-xs sm:text-sm text-gray-500">View all your missing person listings</p>
                      </div>
                    </Link>

                    <Link href="/my-reports" className="bg-white p-3 sm:p-4 rounded-lg shadow hover:shadow-md transition-shadow flex items-center">
                      <div className="bg-green-100 p-2 sm:p-3 rounded-full mr-2 sm:mr-3 flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                      </div>
                      <div>
                        <h4 className="text-sm sm:text-base font-medium">My Reported Sightings</h4>
                        <p className="text-xs sm:text-sm text-gray-500">View all your reported sightings</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reported" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Reported Cases</h3>
                <div className="space-y-4">
                  {currentUser.reportedCases.map((caseItem) => (
                    <div
                      key={caseItem._id}
                      className="p-4 bg-gray-50 rounded-lg shadow hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleViewReportedCase(caseItem._id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-6 w-6 text-yellow-500" />
                          <p className="text-sm font-medium text-gray-900">
                            {caseItem.name}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            caseItem.status.toLowerCase() === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {caseItem.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Reported on:{" "}
                        {new Date(caseItem.createdAt).toLocaleDateString()}
                      </p>
                      <p className="mt-2 text-gray-700">
                        {caseItem.description}
                      </p>
                      <p className="mt-2 text-gray-600">
                        <strong>Location: </strong>
                        {caseItem.location}
                      </p>
                      {caseItem.photos.length > 0 && (
                        <div className="mt-2 flex space-x-2">
                          {caseItem.photos.map((photo, index) => (
                            <Image
                              key={index}
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="h-16 w-16 rounded object-cover"
                              height={64}
                              width={64}
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex justify-end">
                        <div className="flex items-center text-primary hover:text-primary/80 text-sm font-medium">
                          View details <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "missing" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Missing Cases</h3>
                <div className="space-y-4">
                  {currentUser.missingCases.map((caseItem) => (
                    <div
                      key={caseItem._id}
                      className="p-4 bg-gray-50 rounded-lg shadow hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleViewMissingCase(caseItem._id)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Search className="h-6 w-6 text-purple-500" />
                          <p className="text-sm font-medium text-gray-900">
                            {caseItem.name}
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                          {caseItem.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Missing Date:{" "}
                        {new Date(caseItem.missingDate).toLocaleDateString()}
                      </p>
                      <p className="mt-2 text-gray-700">
                        {caseItem.description}
                      </p>
                      <p className="mt-2 text-gray-600">
                        <strong>Last Seen: </strong>
                        {caseItem.lastSeenLocation}
                      </p>
                      <p className="mt-2 text-gray-600">
                        <strong>Age: </strong>
                        {caseItem.age}
                      </p>
                      <p className="mt-2 text-gray-600">
                        <strong>Gender: </strong>
                        {caseItem.gender}
                      </p>
                      {caseItem.photos.length > 0 && (
                        <div className="mt-2 flex space-x-2">
                          {caseItem.photos.map((photo, index) => (
                            <Image
                              key={index}
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="h-16 w-16 rounded object-cover"
                              height={64}
                              width={64}
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex justify-end">
                        <div className="flex items-center text-primary hover:text-primary/80 text-sm font-medium">
                          View details <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "resolved" && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Resolved Cases</h3>
                {resolvedCases.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50 rounded-lg">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Resolved Cases</h4>
                    <p className="text-gray-500">You don&apos;t have any resolved cases yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {resolvedCases.map((caseItem) => (
                      <div
                        key={caseItem._id}
                        className="p-4 bg-gray-50 rounded-lg shadow hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => caseItem.caseType === 'missing'
                          ? handleViewMissingCase(caseItem._id)
                          : handleViewReportedCase(caseItem._id)
                        }
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            {caseItem.caseType === 'missing' ? (
                              <Search className="h-6 w-6 text-purple-500" />
                            ) : (
                              <AlertTriangle className="h-6 w-6 text-yellow-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{caseItem.name}</p>
                              <p className="text-xs text-gray-500">
                                {caseItem.caseType === 'missing' ? 'Missing Person' : 'Reported Sighting'}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                            {caseItem.status}
                          </span>
                        </div>

                        {caseItem.caseType === 'missing' ? (
                          <>
                            <p className="text-sm text-gray-500 mt-2">
                              Missing Date: {new Date((caseItem as MissingCase).missingDate).toLocaleDateString()}
                            </p>
                            <p className="mt-2 text-gray-600">
                              <strong>Last Seen: </strong>
                              {(caseItem as MissingCase).lastSeenLocation}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 mt-2">
                              Reported on: {new Date(caseItem.createdAt).toLocaleDateString()}
                            </p>
                            <p className="mt-2 text-gray-600">
                              <strong>Location: </strong>
                              {(caseItem as ReportedCase).location}
                            </p>
                          </>
                        )}

                        <p className="mt-2 text-gray-700">
                          {caseItem.description}
                        </p>

                        {caseItem.photos && caseItem.photos.length > 0 && (
                          <div className="mt-2 flex space-x-2">
                            {caseItem.photos.map((photo, index) => (
                              <Image
                                key={index}
                                src={photo}
                                alt={`Photo ${index + 1}`}
                                className="h-16 w-16 rounded object-cover"
                                height={64}
                                width={64}
                              />
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex justify-end">
                          <div className="flex items-center text-primary hover:text-primary/80 text-sm font-medium">
                            View details <ArrowRight className="ml-1 h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
