class ApiResponse {
    static success(res, { statusCode = 200, message = "Success", data = null }) {
      const response = {
        success: true,
        message,
        ...(data && { data }),
        timestamp: new Date().toISOString()
      };

      return res.status(statusCode).json(response);
    }

    static error(res, { statusCode = 500, message = "Error", error = null }) {
      // Always include error details in the response for better frontend error handling
      const response = {
        success: false,
        message,
        ...(error && { error }), // Include error details regardless of environment
        timestamp: new Date().toISOString()
      };

      return res.status(statusCode).json(response);
    }
  }

  export default ApiResponse;