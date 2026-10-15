require("dotenv").config();

module.exports = {
  PORT: process.env.PORT,

  MONGO_URI: process.env.MONGO_URI,

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

  OLLAMA_URL: process.env.OLLAMA_URL,

  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
};
