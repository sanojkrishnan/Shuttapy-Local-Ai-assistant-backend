const express = require("express");
const cors = require("cors"); //controls which domains can access the API
const rateLimit = require("express-rate-limit"); //limits how many requests an IP can make
const config = require("../config/config");
const { default: helmet } = require("helmet"); //sets secure HTTP headers to protect against common attacks
const requestLogger = require("./requestLogger");

// runs once at server startup
const setupMiddleware = (app) => {
  app.use(
    helmet({
      //Adds security headers automatically. The cross-origin policy allows resources (like images) to be loaded across different origins.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const limiter = rateLimit({
    //if the given limit is exceeded
    windowMs: config.RATE_LIMIT.WINDOW_MS,
    max: config.RATE_LIMIT.MAX_REQUESTS,
    message: {
      success: false,
      message: "Too many requests from this IP, please try again later.", //give this message and stop providing data
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter); //middleware added

  const corsOptions = { //cors middleware object
    origin: config.CORS.ORIGIN,
    credentials: config.CORS.CREDENTIALS,
    optionsSuccessStatus: 200,
    methods: config.CORS.METHODS,
    allowedHeaders: config.CORS.ALLOWED_HEADERS,
  };
  app.use(cors(corsOptions)); //cors middleware added
 
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(requestLogger); //custom logger that logs every incoming requests 

  app.get("/health", (req, res) => {   //A simple endpoint that returns server status — used by monitoring tools or load balancers to check if the server is alive. Returns uptime, timestamp, and environment.
    res.status(200).json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
    });
  });
};

const createAuthLimiter = () => {  //stricter limiter for auth routes
  return rateLimit({
    windowMs: config.RATE_LIMIT.WINDOW_MS,
    max: config.RATE_LIMIT.AUTH_MAX_REQUESTS,
    message: {
      success: false,
      message: "Too many authentication attempts, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  setupMiddleware,
  createAuthLimiter,
};
