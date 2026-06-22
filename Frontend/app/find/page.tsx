"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/ui/loader";
import { useSelector, useDispatch } from "react-redux";
import { AuthRequiredPrompt } from "@/components/ui/auth-required-prompt";
import { PageLoader } from "@/components/ui/page-loader";
import { refreshUserData } from "@/services/user.service";
import { toast } from "sonner";

type MissingPerson = {
  _id: string;
  name: string;
  age: number;
  lastSeenLocation: string;
  missingDate: string;
  description: string;
  photos: string[];
  reportedBy?: string;
};

export default function FindPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFastAPI, setIsProcessingFastAPI] = useState(false);
  const [isRefreshingUserData, setIsRefreshingUserData] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Get authentication state from Redux
  const isLoggedIn = useSelector((state: { auth: { isLoggedIn: boolean } }) => state.auth.isLoggedIn);

  // Fetch access token from localStorage and handle page loading
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setAccessToken(token);
    }

    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    lastSeenLocation: "",
    missingDate: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles([...selectedFiles, ...newFiles]);
      const newUrls = newFiles.map((file) => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newUrls]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const callFastAPIBackend = async (person: MissingPerson): Promise<void> => {
    try {
      const formData: FormData = new FormData();
      formData.append("user_id", person._id);

      person.photos.forEach((photoUrl: string) => {
        formData.append("image_urls", photoUrl);
      });

      // Add reporter_id to identify who reported this missing person
      if (person.reportedBy) {
        formData.append("reporter_id", person.reportedBy.toString());
      }

      const FIND_MISSING_API_URL = process.env.NEXT_PUBLIC_IMAGE_RECOGNITION_URL;

      const response: Response = await fetch(
        `${FIND_MISSING_API_URL}/save-find-missing`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send image URLs to API");
      }

      const responseData: any = await response.json();
      // console.log("FastAPI response:", responseData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in callFastAPIBackend:", error.message);
      } else {
        console.error("Unknown error in callFastAPIBackend");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is logged in
    if (!isLoggedIn || !accessToken) {
      toast.error("Authentication Required", {
        description: "You must be logged in to submit a report."
      });
      return;
    }

    setIsSubmitting(true);

    const reportData = new FormData();
    reportData.append("name", `${formData.firstName} ${formData.lastName}`);
    reportData.append("age", formData.age);
    reportData.append("gender", formData.gender);
    reportData.append("missingDate", formData.missingDate);
    reportData.append("lastSeenLocation", formData.lastSeenLocation);
    reportData.append("description", formData.description);
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    selectedFiles.forEach((file) => {
      reportData.append("photos", file);
    });

    try {
      const response = await fetch(`${API_URL}/missing-persons/`, {
        method: "POST",
        body: reportData,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Call FastAPI backend with returned data and wait for it to finish
        setIsProcessingFastAPI(true);
        await callFastAPIBackend(data.data);
        setIsProcessingFastAPI(false);

        // Show success message
        toast.success("Report Submitted", {
          description: "Your missing person report has been submitted successfully."
        });

        // Refresh user data in Redux store before redirecting
        setIsRefreshingUserData(true);
        const refreshSuccess = await refreshUserData(dispatch);
        setIsRefreshingUserData(false);

        if (refreshSuccess) {
          // Redirect to dashboard with updated data
          router.push("/dashboard");
        } else {
          // If refresh fails, still redirect but to the my-missing page
          router.push("/my-missing");
        }
      } else {
        toast.error("Submission Failed", {
          description: data.message || "Failed to submit report. Please try again."
        });
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Error", {
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSubmitting(false);
      setIsProcessingFastAPI(false);
      setIsRefreshingUserData(false);
    }
  };

  if (isPageLoading) {
    return <PageLoader message="Loading form..." />;
  }

  return (
    <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-10 max-w-full overflow-x-hidden">
      <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6 sm:space-y-8">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Find Missing Person
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Please provide as much information as possible.
          </p>
        </div>

        {/* Personal Information */}
        <div className="space-y-4 sm:space-y-6 w-full">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Personal Information</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 w-full">
            <div className="space-y-2 w-full">
              <label htmlFor="firstName" className="text-sm font-medium block text-foreground">First Name</label>
              <Input
                id="firstName"
                placeholder="First Name"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="lastName" className="text-sm font-medium block text-foreground">Last Name</label>
              <Input
                id="lastName"
                placeholder="Last Name"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="age" className="text-sm font-medium block text-foreground">Age</label>
              <Input
                id="age"
                type="number"
                placeholder="Age"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="gender" className="text-sm font-medium block text-foreground">Gender</label>
              <Input
                id="gender"
                placeholder="Gender"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
          </div>
        </div>

        {/* Last Seen Information */}
        <div className="space-y-4 sm:space-y-6 w-full">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Last Seen Information</h2>
          <div className="space-y-4 w-full">
            <div className="space-y-2 w-full">
              <label htmlFor="lastSeenLocation" className="text-sm font-medium block text-foreground">Last Known Location</label>
              <Input
                id="lastSeenLocation"
                placeholder="Last Known Location"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="missingDate" className="text-sm font-medium block text-foreground">Missing Date</label>
              <Input
                id="missingDate"
                type="date"
                onChange={handleChange}
                className="w-full max-w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <label htmlFor="description" className="text-sm font-medium block text-foreground">Description</label>
              <Textarea
                id="description"
                placeholder="Physical appearance, clothing worn, circumstances of disappearance..."
                rows={4}
                onChange={handleChange}
                className="w-full max-w-full resize-y"
              />
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-4 sm:space-y-6 w-full">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Photos</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4 w-full">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 flex-shrink-0">
                <Image
                  src={url || "/placeholder.svg"}
                  alt="Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>
            ))}
          </div>
          <label className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 cursor-pointer border-2 border-dashed border-border p-3 sm:p-4 rounded-lg hover:bg-muted/50 w-full">
            <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
            <span className="text-sm sm:text-base text-foreground">Click to upload photos</span>
            <input
              id="photo"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Upload clear, recent photos to improve identification chances.
          </p>
        </div>

        {/* Loader for FastAPI processing */}
        {isProcessingFastAPI && (
          <div className="text-center mt-4 text-sm sm:text-base w-full">
            <Loader size="sm" />
            <span className="ml-2">Processing image recognition...</span>
          </div>
        )}

        {/* Authentication Prompt */}
        {!isLoggedIn && (
          <AuthRequiredPrompt
            message="You need to be logged in to report a missing person."
            className="mb-4"
          />
        )}

        {/* Submit Button */}
        <div className="pt-2 sm:pt-4 w-full flex justify-center">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto sm:min-w-[200px] flex justify-center"
            disabled={isSubmitting || isProcessingFastAPI || isRefreshingUserData || !isLoggedIn}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <Loader size="sm" />
                <span>Submitting...</span>
              </div>
            ) : isProcessingFastAPI ? (
              <div className="flex items-center justify-center gap-2">
                <Loader size="sm" />
                <span>Processing...</span>
              </div>
            ) : isRefreshingUserData ? (
              <div className="flex items-center justify-center gap-2">
                <Loader size="sm" />
                <span>Updating...</span>
              </div>
            ) : !isLoggedIn ? (
              "Login to Submit"
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
