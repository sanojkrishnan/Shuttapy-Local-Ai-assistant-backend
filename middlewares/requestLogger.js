const logger = require("../utils/logger");

//logs every requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  logger.info(
    `Incoming request: ${req.method} ${req.originalUrl} from ${req.ip}`,
  );

  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;

    logger.info(
      `Response completed ${req.method} ${req.originalUrl} - ${res.statusCode}`,
    );
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
