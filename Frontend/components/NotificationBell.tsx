"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { RootState } from "@/lib/store";
import { fetchNotifications, fetchUnreadCount, markNotificationsAsRead } from "@/services/notification.service";
import { setNotifications, setUnreadCount, markNotificationsAsRead as markAsRead } from "@/lib/slices/dataSlice";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocket } from "@/contexts/SocketContext";

export default function NotificationBell() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { socket } = useSocket();
  const { notifications, unreadCount } = useSelector((state: RootState) => state.data);
  const { isLoggedIn } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications and unread count
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const count = await fetchUnreadCount();
        dispatch(setUnreadCount(count));

        if (isOpen) {
          const { notifications: notifs } = await fetchNotifications(1, 10);
          dispatch(setNotifications(notifs));
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [isLoggedIn, isOpen, dispatch]);

  // Listen for new notifications from socket
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification: any) => {
      // Refresh unread count
      fetchUnreadCount().then(count => {
        dispatch(setUnreadCount(count));
      });
    };

    socket.on("notification:new", handleNewNotification);
    socket.on("notification:global", handleNewNotification);

    return () => {
      socket.off("notification:new", handleNewNotification);
      socket.off("notification:global", handleNewNotification);
    };
  }, [socket, dispatch]);

  // Mark notifications as read when popover is opened
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);

    if (open && unreadCount > 0 && notifications.length > 0) {
      const unreadIds = notifications
        .filter(notification => !notification.isRead)
        .map(notification => notification._id);

      if (unreadIds.length > 0) {
        try {
          await markNotificationsAsRead(unreadIds);
          dispatch(markAsRead(unreadIds));
        } catch (error) {
          console.error("Error marking notifications as read:", error);
        }
      }
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push("/alerts");
  };

  const handleNotificationClick = (notification: any) => {
    setIsOpen(false);

    // Log notification for debugging
    console.log("Notification clicked:", notification);

    // Handle different notification types
    if (notification.type === 'MATCH_FOUND') {
      // For match notifications, redirect to the user's own listing that was matched
      if (notification.matchData && typeof notification.matchData === 'object' && notification.matchData.missingPersonId) {
        // If this is a match for a missing person listing created by the user
        router.push(`/missing/${notification.matchData.missingPersonId}`);
      } else if (notification.matchData && typeof notification.matchData === 'object' && notification.matchData.sightingReportId) {
        // If this is a match for a sighting report created by the user
        router.push(`/report/${notification.matchData.sightingReportId}`);
      } else {
        // Fallback to alerts page if no specific listing is found
        router.push("/alerts");
      }
    } else if (notification.relatedModel === "MissingPerson" && notification.relatedId) {
      // For notifications related to a missing person listing
      // Handle the case where relatedId might be an object with _id property or a string
      let missingPersonId = notification.relatedId;
      if (typeof notification.relatedId === 'object' && notification.relatedId !== null) {
        // @ts-ignore - We're checking at runtime if _id exists
        missingPersonId = notification.relatedId._id || notification.relatedId;
      }
      router.push(`/missing/${missingPersonId}`);
    } else if (notification.relatedModel === "SightingReport" && notification.relatedId) {
      // For notifications related to a sighting report
      // Handle the case where relatedId might be an object with _id property or a string
      let reportId = notification.relatedId;
      if (typeof notification.relatedId === 'object' && notification.relatedId !== null) {
        // @ts-ignore - We're checking at runtime if _id exists
        reportId = notification.relatedId._id || notification.relatedId;
      }
      router.push(`/report/${reportId}`);
    } else {
      // For all other notifications, redirect to the alerts page
      router.push("/alerts");
    }
  };

  if (!isLoggedIn) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h4 className="font-medium">Notifications</h4>
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? "bg-gray-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {notification.image ? (
                      <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 relative">
                        <Image
                          src={notification.image}
                          alt="Notification image"
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleViewAll}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
