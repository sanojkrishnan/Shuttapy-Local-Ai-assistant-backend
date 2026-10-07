require("dotenv").config();

module.exports = {
  PORT: process.env.PORT,

  MONGO_URL: process.env.MONGO_URL,

  CORS: {
    ORIGIN: process.env.CORS_STR,
    CREDENTIALS: true,
    METHODS: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization", "X-Requested-With"],
  },
  NODE_ENV: process.env.NODE_ENV,

  RATE_LIMIT: {
    //to limit api calling
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100,
    AUTH_MAX_REQUESTS: 5,
  },
  //jwt
  JWT_SECRET: {
    USER_SECRET: process.env.JWT_USER_SECRET,
    EXPIRE_IN: process.env.JWT_EXPIRES_IN,
  },
};
