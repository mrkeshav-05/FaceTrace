"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, SearchIcon, X } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader } from "@/components/ui/loader"
import { useSelector, useDispatch } from "react-redux"
import { AuthRequiredPrompt } from "@/components/ui/auth-required-prompt"
import { PageLoader } from "@/components/ui/page-loader"
import { refreshUserData } from "@/services/user.service"
import { toast } from "sonner"

// Define types
interface SearchResult {
  _id: string
  name: string
  age: number
  missingDate: string
  lastSeenLocation: string
  photos: string[]
}

interface MissingPerson {
  _id: string
  name: string
  age: number
  missingDate: string
  lastSeenLocation: string
  photos: string[]
  reportedBy?: string
}

interface SearchParams {
  name: string
  description: string
  location: string
}

export default function ReportPage() {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    name: "",
    description: "",
    location: "",
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isProcessingFastAPI, setIsProcessingFastAPI] = useState(false)
  const [isRefreshingUserData, setIsRefreshingUserData] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const router = useRouter()
  const dispatch = useDispatch()
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL

  // Get authentication state from Redux
  const isLoggedIn = useSelector((state: { auth: { isLoggedIn: boolean } }) => state.auth.isLoggedIn)

  // Fetch access token from localStorage and handle page loading
  useEffect(() => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      setAccessToken(token)
    }

    // Simulate loading delay
    const timer = setTimeout(() => {
      setIsPageLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSearchParams((prev) => ({ ...prev, [name]: value }))
  }

  // Handle multiple file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...files])
      setPreviewUrls((prevUrls) => [
        ...prevUrls,
        ...files.map((file) => URL.createObjectURL(file)),
      ])
    }
  }

  // Remove a selected image
  const removeImage = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
    setPreviewUrls((prevUrls) => prevUrls.filter((_, i) => i !== index))
  }

  const callFastAPIBackend = async (person: MissingPerson): Promise<void> => {
    try {
      // Create a FormData instance.
      const formData: FormData = new FormData()
      formData.append("user_id", person._id)

      // Append each image URL to the formData using the same key "image_urls".
      person.photos.forEach((photoUrl: string) => {
        formData.append("image_urls", photoUrl)
      })

      // Add reporter_id to identify who reported this sighting
      if (person.reportedBy) {
        formData.append("reporter_id", person.reportedBy.toString())
      }

      const FIND_MISSING_API_URL = process.env.NEXT_PUBLIC_IMAGE_RECOGNITION_URL

      const response: Response = await fetch(
        `${FIND_MISSING_API_URL}/save-report-missing`,
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error("Failed to send image URLs to API")
      }

      const responseData: any = await response.json()
      // console.log("API response:", responseData)
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in callFastAPIBackend:", error.message)
      } else {
        console.error("Unknown error in callFastAPIBackend")
      }
    }
  }

  // Handle search request (POST request to create sighting report)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if user is logged in
    if (!isLoggedIn || !accessToken) {
      toast.error("Authentication Required", {
        description: "You must be logged in to submit a report."
      })
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()

      // Append text fields if they have values
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) formData.append(key, value)
      })

      // Append multiple images
      selectedFiles.forEach((file) => {
        formData.append("photos", file)
      })

      const response = await fetch(`${API_URL}/sightings`, {
        method: "POST",
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: formData,
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(errorMessage || "Failed to submit sighting report")
      }

      const data = await response.json()
      const person = data.data

      // Call the FastAPI backend after the first call succeeds
      setIsProcessingFastAPI(true)
      await callFastAPIBackend(person)
      setIsProcessingFastAPI(false)

      // Show success message
      toast.success("Report Submitted", {
        description: "Your sighting report has been submitted successfully."
      })

      // Refresh user data in Redux store before redirecting
      setIsRefreshingUserData(true)
      const refreshSuccess = await refreshUserData(dispatch)
      setIsRefreshingUserData(false)

      if (refreshSuccess) {
        // Redirect to dashboard with updated data
        router.push("/dashboard")
      } else {
        // If refresh fails, still redirect but to the my-reports page
        router.push("/my-reports")
      }
    } catch (error) {
      console.error("Submission error:", error)
      toast.error("Error", {
        description: "An unexpected error occurred. Please try again."
      })
    } finally {
      setIsSubmitting(false)
      setIsProcessingFastAPI(false)
      setIsRefreshingUserData(false)
    }
  }

  if (isPageLoading) {
    return (
      <PageLoader
        message="Loading report form..."
      />
    );
  }

  return (
    <div className="container px-4 sm:px-6 md:px-8 py-6 sm:py-10 max-w-full overflow-x-hidden">
      <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Report Missing Person
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Provide details to report a missing person sighting.
          </p>
        </div>

        {/* Input Fields */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full">
          <div className="space-y-2 w-full">
            <Label htmlFor="name" className="text-sm font-medium block">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter name (optional)"
              value={searchParams.name}
              onChange={handleInputChange}
              className="w-full max-w-full"
            />
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="location" className="text-sm font-medium block">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="Enter sighting location"
              value={searchParams.location}
              onChange={handleInputChange}
              className="w-full max-w-full"
            />
          </div>
          <div className="space-y-2 sm:col-span-2 w-full">
            <Label htmlFor="description" className="text-sm font-medium block">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Additional details about the person"
              value={searchParams.description}
              onChange={handleInputChange}
              className="w-full max-w-full"
            />
          </div>
        </div>

        {/* Upload Section */}
        <div className="mt-4 sm:mt-6 w-full">
          <Label htmlFor="searchPhoto" className="text-sm font-medium block mb-2">Photos</Label>
          <label
            htmlFor="searchPhoto"
            className="flex flex-col items-center justify-center w-full h-48 sm:h-64 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50"
          >
            {previewUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 w-full">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative flex justify-center">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 flex-shrink-0">
                      <Image
                        src={url || "/placeholder.svg"}
                        alt={`Selected file ${index + 1}`}
                        className="object-cover rounded-lg"
                        layout="fill"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center w-full">
                <Upload className="h-8 w-8 sm:h-12 sm:w-12 mb-2 sm:mb-3 text-muted-foreground flex-shrink-0" />
                <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG (MAX. 10MB)
                </p>
              </div>
            )}
            <input
              id="searchPhoto"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Upload clear photos to help with identification.
          </p>
        </div>

        {/* Loader for FastAPI processing */}
        {isProcessingFastAPI && (
          <div className="text-center mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="animate-pulse">
                <Loader size="sm" />
              </div>
              <span className="text-sm sm:text-base font-medium text-blue-700 animate-pulse">
                Processing image recognition...
              </span>
            </div>
            <p className="text-xs text-blue-600">
              We&apos;re analyzing your images with our AI system. This may take a moment.
            </p>
          </div>
        )}

        {/* Authentication Prompt */}
        {!isLoggedIn && (
          <AuthRequiredPrompt
            message="You need to be logged in to submit a missing person report."
            className="mb-4"
          />
        )}

        {/* Submit Button */}
        <div className="flex justify-center mt-6 w-full">
          <Button
            size="lg"
            className="gap-2 w-full sm:w-auto sm:min-w-[200px] flex justify-center"
            onClick={handleSubmit}
            disabled={isSubmitting || isProcessingFastAPI || isRefreshingUserData || !isLoggedIn}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin">
                  <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-sm sm:text-base">Submitting report...</span>
              </div>
            ) : isProcessingFastAPI ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin">
                  <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-sm sm:text-base">Processing...</span>
              </div>
            ) : isRefreshingUserData ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin">
                  <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-sm sm:text-base">Updating...</span>
              </div>
            ) : !isLoggedIn ? (
              <span className="text-sm sm:text-base">Login to Submit</span>
            ) : (
              <>
                <SearchIcon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">Submit Report</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
