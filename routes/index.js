const config = require("../config/config");
const { createAuthLimiter } = require("../middlewares/setup");
const chatRoute = require("./chatRoute");
const { systemSocketRoutes } = require("../routes/systemSocket.js");

const setupRoutes = (app) => {
  //main protected routes
  const authLimiter = createAuthLimiter();
  const shouldUseAuthLimiter = config.NODE_ENV === "production";

  app.use("/api/chat", ...(shouldUseAuthLimiter ? [authLimiter] : []), chatRoute);
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
