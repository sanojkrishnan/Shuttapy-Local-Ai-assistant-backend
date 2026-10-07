const logger = require("../utils/logger");
const { sendError } = require("../utils/response");
const { AppError } = require("../utils/errors");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(`Error ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  if (err.name === "CastError") {
    const message = "Resource not found";
    return sendError(res, message, 404);
  }

  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return sendError(res, message, 400);
  }

  if (err.name === "ValidationError" && err.errors) {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return sendError(res, "Validation Error", 400, errors);
  }

  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token", 401);
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, "Token expired", 401);
  }

  return sendError(
    res,
    error.message || "Server Error",
    error.statusCode || 500,
  );
};

const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  logger.warn(message, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  sendError(res, message, 404);
};

module.exports = {
  errorHandler,
  notFound,
};
