const {
  sendSuccess,
  sendError,
  sendValidationError,
} = require("../utils/response");

const { ValidationError } = require("../utils/errors");
const logger = require("../utils/logger");

// A base class that all other controllers extend
// to share common functionality.
class BaseController {
  static asyncHandler(fn) {
    // Catches errors from synchronous code and async handlers.
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validates request body against a Joi schema.
  static validateRequest(schema, data) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join(", ");

      throw new ValidationError(messages, error.details);
    }

    return value;
  }

  static handleValidationError(res, error) {
    return sendValidationError(res, error);
  }

  static sendSuccess(res, message, data = null, statusCode = 200) {
    return sendSuccess(res, message, data, statusCode);
  }

  static sendError(res, message, statusCode = 500, details = null) {
    return sendError(res, message, statusCode, details);
  }

  // Starts an HTTP text stream.
  // Call this before writing any streamed chunks.
  static startTextStream(res, statusCode = 200) {
    if (res.headersSent) {
      throw new Error("Response headers have already been sent.");
    }

    res.status(statusCode);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");

    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    // Do not set Content-Length for a streamed response.
    return res;
  }

  // Writes a text chunk to the HTTP response.
  static sendStreamChunk(res, chunk) {
    if (res.destroyed || res.writableEnded) {
      return false;
    }

    return res.write(chunk);
  }

  // Ends the streamed response.
  static endStream(res) {
    if (!res.destroyed && !res.writableEnded) {
      res.end();
    }
  }

  static logAction(action, user = null, details = {}) {
    const logData = {
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };

    if (user) {
      logData.user = {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
      };
    }

    logger.info(`Controller Action: ${action}`, logData);
  }

  // Strips sensitive fields before sending user data.
  static sanitizeUser(user) {
    if (!user) return null;

    const sanitized = user.toObject ? user.toObject() : { ...user };

    delete sanitized.password;
    delete sanitized.__v;

    return sanitized;
  }
}

module.exports = BaseController;
