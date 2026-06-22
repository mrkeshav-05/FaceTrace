"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { MapPin, Eye, User, Search, Filter, ArrowLeft, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { PageLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import { toast } from "sonner";

interface MissingPerson {
  _id: string;
  name: string;
  age: number;
  lastSeenLocation: string;
  missingDate: string;
  description: string;
  photos?: string[];
  reportedBy?: {
    _id: string;
    username: string;
  } | string;
  status: string;
  createdAt: string;
}

export default function AllMissingPersonsPage() {
  const router = useRouter();
  const [missingPersons, setMissingPersons] = useState<MissingPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  const { isLoggedIn } = useSelector((state: RootState) => state.auth);
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const fetchMissingPersons = async () => {
      setIsLoading(true);
      try {
        // If user is logged in, fetch only their own missing persons
        if (isLoggedIn && user) {
          // Fetch user's own missing persons
          const response = await fetch(`${API_URL}/missing-persons/user`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setMissingPersons(data.data);
          } else {
            // console.error("Failed to fetch missing persons");
            toast.error("Error", {
              description: "Failed to fetch missing persons. Please try again."
            });
          }
        } else {
          // If not logged in, redirect to login page
          router.push("/login");
        }
      } catch (error) {
        // console.error("Error fetching missing persons:", error);
        toast.error("Error", {
          description: "An error occurred while fetching missing persons. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMissingPersons();
  }, [API_URL, isLoggedIn, user, router]);

  const handleViewDetails = (personId: string) => {
    router.push(`/missing/${personId}`);
  };

  // Filter missing persons based on search term and status
  const filteredMissingPersons = missingPersons.filter((person) => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.lastSeenLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      person.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <PageLoader message="Loading missing person listings..." />;
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8">
        <div className="flex items-center gap-2 mb-4 sm:mb-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">My Missing Person Listings</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or location..."
              className="pl-8 w-full sm:w-[250px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="bg-background border rounded-md px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="missing">Missing</option>
              <option value="found">Found</option>
            </select>
          </div>
        </div>
      </div>

      {filteredMissingPersons.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Search className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Missing Person Listings Found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "You haven't created any missing person listings yet."}
          </p>
          <Button onClick={() => router.push("/find")}>
            Report Missing Person
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMissingPersons.map((person) => (
            <div
              key={person._id}
              className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDetails(person._id)}
            >
              {/* Status Badge */}
              <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-medium ${
                person.status.toLowerCase() === "found"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {person.status}
              </div>

              {/* Image Container - Larger and more prominent */}
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                {person.photos && person.photos.length > 0 ? (
                  <>
                    <Image
                      src={person.photos[0] || "/placeholder.svg"}
                      alt={`Photo of ${person.name}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      priority
                      onError={(e) => {
                        // When image fails to load, replace with placeholder
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = "/placeholder.svg";
                      }}
                    />
                    {person.photos.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        +{person.photos.length - 1}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <User className="h-12 w-12 mx-auto mb-2" />
                      <p className="text-sm">No photos</p>
                    </div>
                  </div>
                )}

                {/* Overlay with essential info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <h3 className="text-white font-semibold text-lg truncate mb-1">{person.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/90 text-xs">
                    {person.age && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Age: {person.age}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {person.lastSeenLocation}
                    </span>
                    {typeof person.reportedBy === 'object' && person.reportedBy && (
                      <span className="flex items-center gap-1">
                        By: {person.reportedBy.username}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Details Button - Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(person._id);
                  }}
                >
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    View Details
                  </span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
