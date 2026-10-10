const express = require("express");
const http = require("http");
const logger = require("./utils/logger");
const { setupRoutes } = require("./routes");
const { initializeSocket } = require("./utils/socket");
const config = require("./config/config");
const DBConnect = require("./config/database");
const { setupMiddleware } = require("./middlewares/setup");
const { errorHandler, notFound } = require("./middlewares/errorHanndler");

class Server {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app); // HTTP server wrapping Express because we are using socket io
    this.port = config.PORT;
  }

  // this makes all the connections for db middleware routes etc
  async initialize() {
    try {
      await DBConnect.connect(); // mongodb connection. DBconnect
      setupMiddleware(this.app); // setting middlewares (cors and others)
      setupRoutes(this.app); //calling all routes
      this.app.use(notFound); //if anu unknown rout is came
      this.app.use(errorHandler); //error handle

      initializeSocket(this.server); // initialize socket io

      logger.info("Server initialized successfully"); //logs all activities
    } catch (error) {
      //error catch
      logger.error("Server initialization failed:", error);
      process.exit(1); //stops server immediately. the number 1 tells the system what happened ( 1 for "stopped deu to error ")
    }
  }

  //start
  async start() {
    await this.initialize(); //here we run all the connections in the initialize function

    this.server.listen(this.port, async () => {
      logger.info(
        `Server running in ${config.NODE_ENV || "production"} mode on port ${this.port}`,
      );
    });
    this.setupGraceFullShutdown(); //shutdown gracefully when exit the server
  }

  //shutdown
  setupGraceFullShutdown() {
    const graceFullShutdown = async (signal) => {
      logger.info(`${signal} received. Self dying gracefully...(:`);

      // close socket.io first
      if (this.io) {
        this.io.close(() => {
          logger.info("Socket.IO closed!");
        });
      }

      // force close all keep-alive connections
      this.server.closeAllConnections(); // this is the key fix

      //  now server.close() will actually fire
      this.server.close(async () => {
        logger.info("HTTP server closed!");

        await DBConnect.disconnect();
        logger.info("DB disconnected. Graceful shutdown completed!");
        logger.info("Safe and clean exit");

        process.exit(0);
      });

      // forced exit fallback if something hangs
      const forceExit = setTimeout(() => {
        logger.warn("Forced shutdown after timeout");
        process.exit(1);
      }, 5000);

      forceExit.unref();
    };
    process.on("SIGTERM", () => graceFullShutdown("SIGTERM")); //process.on is listening to the OS.. SIGTERM = please stop gracefully
    process.on("SIGINT", () => graceFullShutdown("SIGINT")); //SIGINT= please stop
  }
}
const appServer = new Server(); // this will run the Server class's constructor function create the new object as the class do
appServer.start(); // this will do the entire boot sequence

module.exports = appServer.app; //exports express
