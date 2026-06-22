// Socket.IO initialization and event handlers
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Store active connections
const activeConnections = new Map();

export const initializeSocketIO = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Find user
      const user = await User.findById(decoded._id).select('-password -refreshToken');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user?._id || 'Anonymous'}`);
    
    // Store user connection
    if (socket.user?._id) {
      activeConnections.set(socket.user._id.toString(), socket.id);
    }
    
    // Join user to their personal room
    if (socket.user?._id) {
      socket.join(`user:${socket.user._id}`);
    }
    
    // Join global notifications room
    socket.join('global:notifications');
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?._id || 'Anonymous'}`);
      
      // Remove from active connections
      if (socket.user?._id) {
        activeConnections.delete(socket.user._id.toString());
      }
    });
    
    // Handle read notifications
    socket.on('notifications:read', async (notificationIds) => {
      // Logic to mark notifications as read will be implemented in the notification controller
    });
  });
};

// Helper function to send notification to a specific user
export const sendNotificationToUser = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('notification:new', notification);
};

// Helper function to send global notification
export const sendGlobalNotification = (io, notification) => {
  io.to('global:notifications').emit('notification:global', notification);
};

// Export active connections map for use in other parts of the application
export const getActiveConnections = () => activeConnections;
