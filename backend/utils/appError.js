/**
 * Custom Error class for handling application-specific errors with HTTP status codes.
 * This allows the central error handling middleware to return appropriate responses.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as operational error

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
