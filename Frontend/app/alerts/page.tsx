"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Bell, Loader2, AlertTriangle, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { RootState } from "@/lib/store";
import { fetchNotifications, markNotificationsAsRead, confirmMatch } from "@/services/notification.service";
import { setNotifications, markNotificationsAsRead as markAsRead } from "@/lib/slices/dataSlice";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Notification } from "@/lib/slices/dataSlice";
import { PageLoader } from "@/components/ui/page-loader";
import { toast } from "sonner";
import { refreshUserData } from "@/services/user.service";

export default function AlertsPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { notifications } = useSelector((state: RootState) => state.data);
  const { isLoggedIn } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [processingNotifications, setProcessingNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const { notifications: notifs, pagination } = await fetchNotifications(currentPage, 10);
        dispatch(setNotifications(notifs));
        setTotalPages(pagination.pages);
      } catch (error) {
        // console.error("Error loading notifications:", error);
      } finally {
        setIsLoading(false);
        setIsPageLoading(false);
      }
    };

    loadNotifications();
  }, [isLoggedIn, currentPage, dispatch, router]);

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await markNotificationsAsRead(notificationIds);
      dispatch(markAsRead(notificationIds));
    } catch (error) {
      // console.error("Error marking notifications as read:", error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Don't navigate if this is a match notification that requires confirmation
    if (notification.type === 'MATCH_FOUND' && notification.requiresConfirmation && !notification.confirmed) {
      return;
    }

    // Mark as read if not already read
    if (!notification.isRead) {
      handleMarkAsRead([notification._id]);
    }

    // Log notification for debugging
    console.log("Notification clicked in alerts page:", notification);

    // Navigate to the appropriate page with the specific ID
    if (notification.type === 'MATCH_FOUND' && notification.matchData) {
      // For match notifications, redirect to the user's own listing that was matched
      if (notification.matchData.missingPersonId) {
        router.push(`/missing/${notification.matchData.missingPersonId}`);
      } else if (notification.matchData.sightingReportId) {
        router.push(`/report/${notification.matchData.sightingReportId}`);
      }
    } else if (notification.relatedModel === "MissingPerson" && notification.relatedId) {
      // Handle the case where relatedId might be an object with _id property or a string
      let missingPersonId = notification.relatedId;
      if (typeof notification.relatedId === 'object' && notification.relatedId !== null) {
        // @ts-ignore - We're checking at runtime if _id exists
        missingPersonId = notification.relatedId._id || notification.relatedId;
      }
      router.push(`/missing/${missingPersonId}`);
    } else if (notification.relatedModel === "SightingReport" && notification.relatedId) {
      // Handle the case where relatedId might be an object with _id property or a string
      let reportId = notification.relatedId;
      if (typeof notification.relatedId === 'object' && notification.relatedId !== null) {
        // @ts-ignore - We're checking at runtime if _id exists
        reportId = notification.relatedId._id || notification.relatedId;
      }
      router.push(`/report/${reportId}`);
    } else if (notification.type === "STATUS_UPDATE") {
      // For status updates, go to the dashboard resolved cases tab
      router.push(`/dashboard?tab=resolved`);
    }
  };

  const handleConfirmMatch = async (notificationId: string, confirm: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click event

    try {
      setProcessingNotifications(prev => [...prev, notificationId]);

      await confirmMatch(notificationId, confirm);

      // Refresh notifications after confirmation
      const { notifications: notifs } = await fetchNotifications(currentPage, 10);
      dispatch(setNotifications(notifs));

      // If match was confirmed, refresh user data to update dashboard with resolved listings
      if (confirm) {
        await refreshUserData(dispatch);
      }

      toast(confirm ? "Match confirmed" : "Match rejected", {
        description: confirm
          ? "The case has been marked as resolved and the relevant parties have been notified."
          : "The match has been rejected."
      });
    } catch (error: any) {
      // console.error("Error confirming match:", error);
      toast.error("Error", {
        description: error.message || "There was a problem processing your request. Please try again."
      });
    } finally {
      setProcessingNotifications(prev => prev.filter(id => id !== notificationId));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MISSING_PERSON":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "SIGHTING_REPORT":
        return <Bell className="h-5 w-5 text-yellow-500" />;
      case "MATCH_FOUND":
        return <Check className="h-5 w-5 text-green-500" />;
      case "STATUS_UPDATE":
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "MISSING_PERSON":
        return "Missing Person";
      case "SIGHTING_REPORT":
        return "Sighting Report";
      case "MATCH_FOUND":
        return "Match Found";
      case "STATUS_UPDATE":
        return "Status Update";
      default:
        return "Notification";
    }
  };

  const filteredNotifications = activeTab === "all"
    ? notifications
    : notifications.filter(notification => notification.type === activeTab);

  if (isPageLoading) {
    return <PageLoader message="Loading notifications..." />;
  }

  return (
    <div className="container py-6 sm:py-10 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full px-2 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="max-w-full">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2 break-words">
              Stay updated with the latest alerts and potential matches
            </p>
          </div>
          <Button variant="outline" className="gap-2 text-xs sm:text-sm w-full sm:w-auto flex-shrink-0">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="whitespace-nowrap">Subscribe to Alerts</span>
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto pb-1 -mx-4 px-4 w-full">
            <div className="min-w-full">
              <TabsList className="mb-4 w-full flex whitespace-nowrap overflow-x-auto scrollbar-hide">
                <TabsTrigger value="all" className="text-xs sm:text-sm flex-shrink-0">All</TabsTrigger>
                <TabsTrigger value="MISSING_PERSON" className="text-xs sm:text-sm flex-shrink-0">Missing Persons</TabsTrigger>
                <TabsTrigger value="SIGHTING_REPORT" className="text-xs sm:text-sm flex-shrink-0">Sightings</TabsTrigger>
                <TabsTrigger value="MATCH_FOUND" className="text-xs sm:text-sm flex-shrink-0">Matches</TabsTrigger>
                <TabsTrigger value="STATUS_UPDATE" className="text-xs sm:text-sm flex-shrink-0">Updates</TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-3">
                      <div className="flex justify-between flex-wrap gap-2">
                        <Skeleton className="h-4 sm:h-6 w-24 sm:w-32" />
                        <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-2 sm:pt-3">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Skeleton className="h-16 w-16 sm:h-24 sm:w-24 rounded-lg mx-auto sm:mx-0" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                          <Skeleton className="h-3 sm:h-4 w-full" />
                          <Skeleton className="h-3 sm:h-4 w-3/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 sm:p-8 text-center">
                <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No Notifications</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                  You don&apos;t have any notifications yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredNotifications.map((notification) => (
                  <Card
                    key={notification._id}
                    className={`hover:shadow-md transition-shadow cursor-pointer max-w-full ${
                      !notification.isRead ? "border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 w-full">
                        <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg break-words max-w-full">
                          <span className="flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <span className="break-words overflow-hidden text-ellipsis">{notification.title}</span>
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {notification.isGlobal && (
                            <Badge variant="outline" className="text-xs">Global</Badge>
                          )}
                          <CardDescription className="text-xs whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="w-fit text-xs mt-1 sm:mt-2">
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-2 sm:pt-3">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
                        {notification.image ? (
                          <div className="relative h-16 w-16 sm:h-24 sm:w-24 rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                            <Image
                              src={notification.image}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 64px, (max-width: 768px) 96px, 96px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-16 w-16 sm:h-24 sm:w-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                            <span className="scale-75 sm:scale-100">
                              {getNotificationIcon(notification.type)}
                            </span>
                          </div>
                        )}
                        <div className="space-y-2 w-full overflow-hidden">
                          <p className="text-xs sm:text-sm break-words overflow-wrap-anywhere">{notification.message}</p>
                          {!notification.isRead && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}

                          {/* Confirm/Not Confirm buttons for match notifications */}
                          {notification.type === 'MATCH_FOUND' &&
                           notification.requiresConfirmation &&
                           !notification.confirmed && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="default"
                                className="flex items-center gap-1"
                                onClick={(e) => handleConfirmMatch(notification._id, true, e)}
                                disabled={processingNotifications.includes(notification._id)}
                              >
                                <ThumbsUp className="h-3 w-3" />
                                <span>Confirm Match</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={(e) => handleConfirmMatch(notification._id, false, e)}
                                disabled={processingNotifications.includes(notification._id)}
                              >
                                <ThumbsDown className="h-3 w-3" />
                                <span>Not a Match</span>
                              </Button>
                              {processingNotifications.includes(notification._id) && (
                                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                              )}
                            </div>
                          )}

                          {/* Show confirmation status if already processed */}
                          {notification.type === 'MATCH_FOUND' &&
                           notification.requiresConfirmation &&
                           notification.confirmed !== undefined && (
                            <Badge variant={notification.confirmed ? "default" : "destructive"} className="mt-2">
                              {notification.confirmed ? "Match Confirmed" : "Match Rejected"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {totalPages > 1 && (
          <div className="flex justify-center gap-1 sm:gap-2 mt-4 sm:mt-6 w-full flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0"
            >
              Previous
            </Button>
            <span className="flex items-center justify-center px-2 sm:px-3 text-xs sm:text-sm min-w-[100px] text-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || isLoading}
              className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 flex-shrink-0"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
