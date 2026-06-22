"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MapPin, Calendar, X, Maximize2, ArrowLeft, Search, User, Bell, AlertCircle } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { sendMatchAlert } from "@/services/notification.service";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { RootState } from "@/lib/store";
import { Slider } from "@/components/ui/slider";

interface User {
  _id: string;
  username: string;
  fullname?: string;
}

interface ReportedCase {
  _id: string;
  name: string;
  location: string;
  createdAt: string;
  description: string;
  photos?: string[];
  reportedBy?: User | string;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const { id } = useParams(); // Retrieve the report ID from the URL
  const [report, setReport] = useState<ReportedCase | null>(null);
  const [loading, setLoading] = useState(true);
  // Change matchingResults from an array to a single object
  const [matchingResults, setMatchingResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [matchThreshold, setMatchThreshold] = useState<number>(70); // Default to 70%
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  useEffect(() => {
    if (localStorage.getItem("user") === null) {
      router.push("/login");
      return;
    }
    if (id) {
      const fetchReport = async () => {
        try {
          const response = await fetch(`${API_URL}/sightings/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setReport(data.data);
          } else {
            // console.error("Failed to fetch report");
            toast.error("Error", {
              description: "Failed to fetch report details. Please try again."
            });
          }
        } catch (error) {
          // console.error("Error fetching report:", error);
          toast.error("Error", {
            description: "An error occurred while fetching report details."
          });
        } finally {
          setLoading(false);
        }
      };

      fetchReport();
    }
  }, [id, router, API_URL]);

  const handleSearchMatches = async (person: ReportedCase): Promise<void> => {
    setIsSearching(true);
    setMatchingResults([]); // Reset matching results
    try {
      const formData: FormData = new FormData();
      formData.append("user_id", person._id);
      person.photos?.forEach((photoUrl: string) => {
        formData.append("image_urls", photoUrl);
      });

      // Add reporter_id to filter out own listings
      if (person.reportedBy) {
        formData.append("reporter_id", person.reportedBy.toString());
      }

      // Add threshold parameter (convert from percentage to decimal)
      formData.append("threshold", (matchThreshold / 100).toString());

      const FIND_MISSING_API_URL = process.env.NEXT_PUBLIC_IMAGE_RECOGNITION_URL;
      const response: Response = await fetch(
        `${FIND_MISSING_API_URL}/search-report-missing`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        toast.error("Search Failed", {
          description: "Failed to send image data to search API. Please try again."
        });
        throw new Error("Failed to send image URLs to API");
      }

      const responseData: any = await response.json();

      if (responseData.success === false) {
        // No matches found
        toast.info("No Matches Found", {
          description: "No matching results were found. Try adjusting the threshold or check back later."
        });
        return;
      }

      // Check if we have any matches
      if (!responseData.match || responseData.match.length === 0) {
        toast.info("No Matches Found", {
          description: "No matching results were found. Try adjusting the threshold or check back later."
        });
        setMatchingResults([]);
        return;
      }

      // Process all matches (up to 3)
      const matchPromises = responseData.match.map(async (match: any) => {
        // Extract the ID as a string to ensure it's properly formatted
        const matchId = String(match.id);

        // Fetch matching result using the received ID
        const matchingResponse = await fetch(`${API_URL}/missing-persons/${matchId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (!matchingResponse.ok) {
          return null;
        }

        const matchingData = await matchingResponse.json();
        return matchingData.data || null;
      });

      // Wait for all fetch operations to complete
      const results = await Promise.all(matchPromises);

      // Filter out any null results
      const validResults = results.filter(result => result !== null);

      setMatchingResults(validResults);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // console.error("Error in handleSearchMatches:", error.message);
        toast.error("Search Error", {
          description: `Error searching for matches: ${error.message}`
        });
      } else {
        // console.error("Unknown error in handleSearchMatches");
        toast.error("Search Error", {
          description: "An unknown error occurred while searching for matches."
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <Loader size="lg" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">No Report Data Found</h2>
          <p className="text-gray-500 mb-6">The requested report information could not be found.</p>
          <Button onClick={() => router.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
      <Button onClick={() => router.back()} className="mb-4 sm:mb-6">
        <span className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </span>
      </Button>
      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6 md:px-8">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl break-words">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
            <span className="truncate">{report.name || "Reported Case"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 md:px-8">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
            <div className="space-y-3">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-1" />
                    <span className="flex-grow break-words">{report.location}</span>
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0 mt-1" />
                    <span className="flex-grow">
                      Reported on: {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line break-words">{report.description}</p>
              </div>
            </div>
            <div>
              {report.photos && report.photos.length > 0 ? (
                <div className="grid gap-2 xs:gap-3 sm:gap-4 grid-cols-2">
                  {report.photos.map((photo: string, index: number) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => setSelectedImage(photo)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src={photo || "/placeholder.svg"}
                          alt={`Photo ${index + 1}`}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, 300px"
                          className="rounded-lg object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          priority
                          onError={(e) => {
                            // When image fails to load, replace with placeholder
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white h-6 w-6 sm:h-8 sm:w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-500">No photos available</p>
                </div>
              )}
            </div>
          </div>
          {/* Match Threshold Slider */}
          <div className="mt-8 sm:mt-10">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                  <label htmlFor="match-threshold" className="text-sm font-medium">
                    Match Threshold: {matchThreshold}%
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Higher values show more accurate matches
                  </span>
                </div>
                <Slider
                  id="match-threshold"
                  min={50}
                  max={95}
                  step={5}
                  value={[matchThreshold]}
                  onValueChange={(value) => setMatchThreshold(value[0])}
                  className="w-full"
                  disabled={isSearching}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span>95%</span>
                </div>
              </div>

              {/* Search for Matches Button */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                <Button
                  onClick={() => handleSearchMatches(report)}
                  disabled={isSearching}
                  className="w-full sm:w-auto"
                >
                  {isSearching ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin">
                        <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <span>Searching...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>Search for Matches</span>
                    </span>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Search for potential matches in missing persons database
                </p>
              </div>
            </div>
          </div>
          {isSearching && (
            <div className="mt-6 flex justify-center">
              <div className="p-8 text-center">
                <div className="animate-pulse">
                  <Loader size="lg" />
                </div>
                <p className="mt-4 text-muted-foreground animate-pulse">
                  Searching for matches in our database...
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  This may take a moment as we analyze images
                </p>
              </div>
            </div>
          )}
          {!isSearching && (
            <div className="mt-8">
              {matchingResults.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg sm:text-xl font-semibold">Matching Results ({matchingResults.length})</h3>
                  {matchingResults.map((result, index) => (
                    <MatchingResult key={result._id || index} result={result} />
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-500">No matches found.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try searching again or check back later for new missing person reports.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl p-0 overflow-hidden bg-transparent border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <DialogClose className="absolute top-2 right-2 z-10 rounded-full p-2 bg-black/50 text-white hover:bg-black/70">
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </DialogClose>
            {selectedImage && (
              <div className="relative w-full max-h-[85vh] flex items-center justify-center p-2 sm:p-4">
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={selectedImage || "/placeholder.svg"}
                    alt="Enlarged photo"
                    width={1200}
                    height={800}
                    sizes="(max-width: 640px) 95vw, (max-width: 768px) 90vw, (max-width: 1024px) 85vw, 1200px"
                    className="object-contain max-h-[85vh] rounded-lg shadow-xl"
                    priority
                    onError={(e) => {
                      // When image fails to load, replace with placeholder
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      target.src = "/placeholder.svg";
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Shared image modal component for all matching results
const MatchResultImageModal = ({ selectedImage, setSelectedImage }: { selectedImage: string | null, setSelectedImage: (image: string | null) => void }) => {
  if (!selectedImage) return null;

  return (
    <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-4xl p-0 overflow-hidden bg-transparent border-none">
        <div className="relative w-full h-full flex items-center justify-center">
          <DialogClose className="absolute top-2 right-2 z-10 rounded-full p-2 bg-black/50 text-white hover:bg-black/70">
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </DialogClose>
          <div className="relative w-full max-h-[85vh] flex items-center justify-center p-2 sm:p-4">
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={selectedImage || "/placeholder.svg"}
                alt="Enlarged photo"
                width={1200}
                height={800}
                sizes="(max-width: 640px) 95vw, (max-width: 768px) 90vw, (max-width: 1024px) 85vw, 1200px"
                className="object-contain max-h-[85vh] rounded-lg shadow-xl"
                priority
                onError={(e) => {
                  // When image fails to load, replace with placeholder
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite loop
                  target.src = "/placeholder.svg";
                }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Alert confirmation dialog component
const AlertConfirmationDialog = ({
  open,
  setOpen,
  isSending,
  onConfirm
}: {
  open: boolean,
  setOpen: (open: boolean) => void,
  isSending: boolean,
  onConfirm: () => void
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Send Alert</DialogTitle>
        <DialogDescription>
          Are you sure you want to send an alert for this match? This will notify the user who listed this missing person about the potential match with your sighting report. They will need to confirm the match.
        </DialogDescription>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSending}
            className="flex items-center gap-2"
          >
            {isSending ? (
              <>
                <Loader size="sm" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4" />
                <span>Send Alert</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MatchingResult = ({ result }: { result: any | null }) => {
  const [selectedMatchImage, setSelectedMatchImage] = useState<string | null>(null);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);
  const [resultOwnerId, setResultOwnerId] = useState<string | null>(null);
  const { id: reportId } = useParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const [report, setReport] = useState<any>(null);

  // Fetch the report details to check ownership
  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;

      try {
        const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
        const response = await fetch(`${API_URL}/sightings/${reportId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setReport(data.data);
        }
      } catch (error) {
        // console.error("Error fetching report:", error);
        toast.error("Error", {
          description: "Failed to fetch report details for ownership check."
        });
      }
    };

    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  useEffect(() => {
    if (result && user) {
      // Check if the result belongs to the current user
      let ownerIdValue = null;

      if (result.reportedBy) {
        ownerIdValue = typeof result.reportedBy === 'object'
          ? result.reportedBy._id
          : result.reportedBy;
      }

      // Set the resultOwnerId state
      setResultOwnerId(ownerIdValue);

      // In the report page, we need to check if the current user is the one who created the report
      const reportOwner = typeof report?.reportedBy === 'object'
        ? report?.reportedBy?._id
        : report?.reportedBy;

      // The user can't send an alert if they own the missing person result
      const isOwn = ownerIdValue === user.id;

      // Also check if the reporter of the result is the same as the reporter of the report
      const isSameReporter = ownerIdValue && reportOwner && ownerIdValue === reportOwner;

      // For debugging purposes
      // console.log("Ownership check in report/[id] page:", {
      //   resultOwnerId: ownerIdValue,
      //   reportOwner,
      //   userId: user.id,
      //   isOwn,
      //   isSameReporter,
      //   isOwnListing: isOwn || isSameReporter
      // });

      // Set isOwnListing to true if either condition is met
      setIsOwnListing(isOwn || isSameReporter);
    }
  }, [result, user, report]);

  if (!result) {
    return <p className="text-center text-gray-500">No matching result found.</p>;
  }

  const handleSendAlert = async () => {
    if (!reportId || !result._id) return;

    // console.log("Sending alert from report page with IDs:", {
    //   reportId: reportId as string,
    //   resultId: result._id,
    //   reportedBy: result.reportedBy ? result.reportedBy._id || result.reportedBy : "unknown"
    // });

    setIsSendingAlert(true);
    try {
      // For report page, we need to send the missing person ID first, then the sighting report ID
      // We also pass 'report' as the source to indicate we're on the report page
      const response = await sendMatchAlert(result._id, reportId as string, 'report');

      if (response.success) {
        toast.success("Alert Sent Successfully", {
          description: "The alert has been sent to the user who listed this missing person. They will be notified to confirm the match."
        });
        setShowAlertDialog(false);
      } else {
        // console.error("Failed to send alert:", response);
        toast.error("Failed to send alert", {
          description: response.message || "There was an error sending the alert. Please try again."
        });
      }
    } catch (error) {
      // console.error("Error sending alert:", error);
      toast.error("Error", {
        description: "An unexpected error occurred while sending the alert. Please try again later."
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-base sm:text-lg mb-2 break-words">{result.name}</h4>
                <div className="space-y-2">
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                    <User className="h-4 w-4 flex-shrink-0 mt-1" />
                    <span className="flex-grow">Age: {result.age}, Gender: {result.gender}</span>
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-1" />
                    <span className="flex-grow break-words">Last seen: {result.lastSeenLocation}</span>
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0 mt-1" />
                    <span className="flex-grow">
                      Missing since: {new Date(result.missingDate).toLocaleDateString()}
                    </span>
                  </p>
                  {result.reportedBy && (
                    <p className="text-sm sm:text-base text-muted-foreground flex items-start gap-2">
                      <User className="h-4 w-4 flex-shrink-0 mt-1" />
                      <span className="flex-grow break-words">
                        Listed by: {result.reportedBy.username || result.reportedBy.fullname || "Anonymous"}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-sm sm:text-base text-gray-700 whitespace-pre-line break-words">{result.description}</p>
              </div>

              {/* Send Alert Button */}
              {isOwnListing ? (
                <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">
                    {resultOwnerId === user?.id
                      ? "You cannot send an alert to your own missing person listing"
                      : "Cannot send alert to your own listing"}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAlertDialog(true)}
                  className="w-full flex items-center justify-center gap-2"
                  variant="secondary"
                >
                  <Bell className="h-4 w-4" />
                  <span>Send Alert</span>
                </Button>
              )}
            </div>
            <div>
              {result.photos && result.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {result.photos.map((photo: string, photoIndex: number) => (
                    <div
                      key={photoIndex}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => setSelectedMatchImage(photo)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Image
                          src={photo || "/placeholder.svg"}
                          alt={`Missing person photo ${photoIndex + 1}`}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, 200px"
                          className="rounded-lg object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            // When image fails to load, replace with placeholder
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-gray-500">No photos available</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      <MatchResultImageModal
        selectedImage={selectedMatchImage}
        setSelectedImage={setSelectedMatchImage}
      />

      {/* Alert Dialog */}
      <AlertConfirmationDialog
        open={showAlertDialog}
        setOpen={setShowAlertDialog}
        isSending={isSendingAlert}
        onConfirm={handleSendAlert}
      />
    </>
  );
};
