import ApiResponse from '../utils/apiResponse.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error("Error:", err.message);
  console.error("Stack:", err.stack);

  // Determine error type and format response accordingly
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Server Error';
  let errorDetails = err.errors || null;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    errorMessage = `Resource not found with id of ${err.value}`;
    errorDetails = 'The requested resource does not exist or has been removed';
  }

  // Mongoose validation error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Validation Error';
    errorDetails = Object.values(err.errors).map(val => val.message);
  }

  // Mongoose duplicate key
  else if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    errorMessage = `${field} already exists`;
    errorDetails = `The ${field} you provided is already in use`;
  }

  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorMessage = 'Invalid token';
    errorDetails = 'Your session is invalid. Please log in again.';
  }

  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token expired';
    errorDetails = 'Your session has expired. Please log in again.';
  }

  // Cloudinary errors
  else if (err.name === 'CloudinaryError') {
    statusCode = 500;
    errorMessage = 'File upload failed';
    errorDetails = 'There was a problem uploading your file. Please try again.';
  }

  // Authentication errors
  else if (statusCode === 401) {
    errorDetails = errorDetails || 'Authentication failed. Please check your credentials.';
  }

  // Not found errors
  else if (statusCode === 404) {
    errorDetails = errorDetails || 'The requested resource could not be found.';
  }

  // Server errors
  else if (statusCode >= 500) {
    errorDetails = errorDetails || 'An unexpected error occurred on the server. Please try again later.';
  }

  // Return formatted error response
  return ApiResponse.error(res, {
    statusCode,
    message: errorMessage,
    error: errorDetails
  });
};

export default errorHandler;