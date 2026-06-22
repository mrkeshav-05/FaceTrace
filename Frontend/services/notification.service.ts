import { Notification } from "@/lib/slices/dataSlice";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const fetchNotifications = async (page = 1, limit = 10): Promise<{ notifications: Notification[], pagination: any }> => {
  try {
    const response = await fetch(`${API_URL}/notifications?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

export const sendMatchAlert = async (id1: string, id2: string, source: 'missing' | 'report' = 'report'): Promise<{ success: boolean, message?: string }> => {
  try {
    // console.log("Sending match alert with params:", { id1, id2, source });

    // Determine which parameter is which based on the source
    // For missing/[id] page: id1 is missingPersonId, id2 is matchId (sighting report)
    // For report/[id] page: id1 is missingPersonId, id2 is matchId (sighting report)
    // The parameters are now consistent between both pages
    const payload = { missingPersonId: id1, matchId: id2, source };

    // console.log("Sending payload to backend:", payload);

    const response = await fetch(`${API_URL}/notifications/match-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    // console.log("Match alert response:", { status: response.status, data });

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Failed to send match alert"
      };
    }

    return {
      success: true,
      message: data.message || "Alert sent successfully"
    };
  } catch (error) {
    console.error("Error sending match alert:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred"
    };
  }
};

export const fetchUnreadCount = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_URL}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch unread count");
    }

    const data = await response.json();
    return data.data.count;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }
};

export const markNotificationsAsRead = async (notificationIds: string[]): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/notifications/mark-read`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({ notificationIds }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark notifications as read");
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete notification");
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

export const confirmMatch = async (notificationId: string, confirm: boolean): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/notifications/confirm-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({
        notificationId,
        confirm
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to confirm match");
    }

    const data = await response.json();
    return data.data.confirmed;
  } catch (error) {
    console.error("Error confirming match:", error);
    return false;
  }
};
