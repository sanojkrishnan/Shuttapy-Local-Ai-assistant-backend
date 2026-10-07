const { ErrorUtils } = require("./errors");

//response formatter class  
class ResponseFormatter {
  static success(res, message, data = null, statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    if (data !== null) {
      response.data = data;
    }

    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  static error(res, error, statusCode = null) {
    const formattedError = ErrorUtils.formatError(error);
    const finalStatusCode = statusCode || formattedError.error.statusCode;

    const response = {
      ...formattedError,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    return res.status(finalStatusCode).json(response);
  }

  static validationError(res, validationResult) {
    const errors = validationResult.details.map((detail) => ({
      field: detail.path[0],
      message: detail.message,
      value: detail.context?.value,
    }));

    const response = {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: errors,
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    return res.status(400).json(response);
  }

  static paginated(res, message, data, pagination) {
    return this.success(res, message, data, 200, {
      pagination: {
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        totalItems: pagination.totalItems || pagination.totalUsers,
        itemsPerPage: pagination.limit,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
      },
    });
  }

  static file(res, filePath, filename = null, options = {}) {
    const downloadOptions = {
      dotfiles: "deny",
      headers: {
        "x-timestamp": Date.now(),
        "x-sent": true,
      },
      ...options,
    };

    if (filename) {
      downloadOptions.headers["content-disposition"] =
        `attachment; filename="${filename}"`;
    }

    return res.download(filePath, filename, downloadOptions, (err) => {
      if (err) {
        return this.error(res, err);
      }
    });
  }

  static created(res, message, data = null) {
    return this.success(res, message, data, 201);
  }

  static accepted(res, message, data = null) {
    return this.success(res, message, data, 202);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static notFound(res, message = "Resource not found") {
    const response = {
      success: false,
      error: {
        message,
        code: "NOT_FOUND",
        statusCode: 404,
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    return res.status(404).json(response);
  }

  static unauthorized(res, message = "Authentication required") {
    const response = {
      success: false,
      error: {
        message,
        code: "UNAUTHORIZED",
        statusCode: 401,
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    return res.status(401).json(response);
  }

  static forbidden(res, message = "Access denied") {
    const response = {
      success: false,
      error: {
        message,
        code: "FORBIDDEN",
        statusCode: 403,
      },
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null,
    };

    return res.status(403).json(response);
  }
}

const sendSuccess = (res, message, data = null, statusCode = 200) => {
  return ResponseFormatter.success(res, message, data, statusCode);
};

const sendError = (res, message, statusCode = 500, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return ResponseFormatter.error(res, error, statusCode);
};

const sendValidationError = (res, validationResult) => {
  return ResponseFormatter.validationError(res, validationResult);
};

module.exports = {
  ResponseFormatter,
  sendSuccess,
  sendError,
  sendValidationError,
};
