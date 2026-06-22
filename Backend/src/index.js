import connectDB from './config/db.js';
import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { initializeSocketIO } from './socket/socket.js';

// Load environment variables first
// dotenv.config({
//   path: path.resolve(__dirname, '/.env') // Adjusted path based on typical project structure
// });

// console.log('Cloudinary Config:', {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET
// });


// Verify environment variables
// console.log('Environment variables:', {
//   MONGO_URI: process.env.MONGODB_URI,
//   NODE_ENV: process.env.NODE_ENV,
//   PORT: process.env.PORT
// });

// Database connection and server start
connectDB()
  .then(() => {
    const port = process.env.PORT || 5000;

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Make io available globally
    global.io = io;

    // Initialize Socket.IO handlers
    initializeSocketIO(io);

    // Start the server
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Socket.IO initialized`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  });