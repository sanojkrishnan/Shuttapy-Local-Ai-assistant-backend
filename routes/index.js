const config = require("../config/config");
const { createAuthLimiter } = require("../middlewares/setup");
const chatRoute = require("./chatRoute");

const setupRoutes = (app) => {
  //main protected routes
  const authLimiter = createAuthLimiter();
  const shouldUseAuthLimiter = config.NODE_ENV === "production";

  app.use("/api/", ...(shouldUseAuthLimiter ? [authLimiter] : []), chatRoute);
};

module.exports = {
  setupRoutes,
};
