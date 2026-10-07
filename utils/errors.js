

// Used for managing errors in the application ()
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ErrorFactory {
  static validation(message, details) {
    return new ValidationError(message, details);
  }

  static authentication(message) {
    return new AuthenticationError(message);
  }

  static authorization(message) {
    return new AuthorizationError(message);
  }

  static notFound(message) {
    return new NotFoundError(message);
  }

  static conflict(message) {
    return new ConflictError(message);
  }

  static rateLimit(message) {
    return new RateLimitError(message);
  }

  static database(message) {
    return new DatabaseError(message);
  }

  static generic(message, statusCode, code) {
    return new AppError(message, statusCode, code);
  }
}

class ErrorUtils {
  static isOperational(error) {
    return error instanceof AppError && error.isOperational;
  }

  static extractMessage(error) {
    if (error instanceof AppError) {
      return error.message;
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return messages.join(', ');
    }

    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return `${field} already exists`;
      }
      return 'Database operation failed';
    }

    if (error.name === 'JsonWebTokenError') {
      return 'Invalid token';
    }

    if (error.name === 'TokenExpiredError') {
      return 'Token expired';
    }

    return error.message || 'Internal server error';
  }

  static getStatusCode(error) {
    if (error instanceof AppError) {
      return error.statusCode;
    }

    if (error.name === 'ValidationError') {
      return 400;
    }

    if (error.name === 'MongoError' && error.code === 11000) {
      return 409;
    }

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return 401;
    }

    return 500;
  }

  static formatError(error) {
    const message = this.extractMessage(error);
    const statusCode = this.getStatusCode(error);
    
    const formattedError = {
      success: false,
      error: {
        message,
        code: error.code || 'UNKNOWN_ERROR',
        statusCode
      }
    };

    if (error instanceof ValidationError && error.details) {
      formattedError.error.details = error.details;
    }

    if (process.env.NODE_ENV === 'development') {
      formattedError.error.stack = error.stack;
    }

    return formattedError;
  }

  static logError(error, logger, context = {}) {
    const logData = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode || this.getStatusCode(error),
      stack: error.stack,
      ...context
    };

    if (this.isOperational(error) && error.statusCode < 500) {
      logger.warn('Operational error:', logData);
    } else {
      logger.error('System error:', logData);
    }
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ErrorFactory,
  ErrorUtils
};