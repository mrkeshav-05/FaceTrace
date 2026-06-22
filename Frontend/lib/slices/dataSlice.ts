import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  _id: string;
  recipient: string;
  type: 'MISSING_PERSON' | 'SIGHTING_REPORT' | 'MATCH_FOUND' | 'STATUS_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  relatedId?: string;
  relatedModel?: string;
  image?: string;
  isRead: boolean;
  isGlobal: boolean;
  requiresConfirmation?: boolean;
  confirmed?: boolean;
  matchData?: {
    missingPersonId?: string;
    sightingReportId?: string;
    matchId?: string;
    sourceId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface DataState {
  alerts: any[];
  reportedCases: any[];
  missingCases: any[];
  selectedMissingPerson: any | null;
  notifications: Notification[];
  unreadCount: number;
}

const initialState: DataState = {
  alerts: [],
  reportedCases: [],
  missingCases: [],
  selectedMissingPerson: [],
  notifications: [],
  unreadCount: 0,
};

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<any[]>) => {
      state.alerts = action.payload;
    },
    setReportedCases: (state, action: PayloadAction<any[]>) => {
      state.reportedCases = action.payload;
    },
    setMissingCases: (state, action: PayloadAction<any[]>) => {
      state.missingCases = action.payload;
    },
    setSelectedMissingPerson: (state, action: PayloadAction<any | null>) => {
      state.selectedMissingPerson = action.payload;
    },
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications = [action.payload, ...state.notifications];
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    markNotificationsAsRead: (state, action: PayloadAction<string[]>) => {
      state.notifications = state.notifications.map(notification =>
        action.payload.includes(notification._id)
          ? { ...notification, isRead: true }
          : notification
      );
      state.unreadCount = state.notifications.filter(n => !n.isRead).length;
    },
  },
});

export const {
  setAlerts,
  setReportedCases,
  setMissingCases,
  setSelectedMissingPerson,
  setNotifications,
  addNotification,
  setUnreadCount,
  markNotificationsAsRead,
} = dataSlice.actions;
export default dataSlice.reducer;
