const config = require("../config/config");
const { createAuthLimiter } = require("../middlewares/setup");
const chatRoute = require("./chatRoute");
const systemRoute = require("./systemRoute.js");
const { systemSocketRoutes } = require("./systemSocket.js");

const setupRoutes = (app) => {
  //main protected routes
  const authLimiter = createAuthLimiter();
  const shouldUseAuthLimiter = config.NODE_ENV === "production";
  const limiter = shouldUseAuthLimiter ? [authLimiter] : [];

  app.use("/api/chat", ...limiter, chatRoute);
  app.use("/api/system", ...limiter, systemRoute);
};

const registerSocketRoutes = (io) => {
  io.on("connection", (socket) => {
    systemSocketRoutes(socket);
  });
};

module.exports = {
  setupRoutes,
  registerSocketRoutes,
};
