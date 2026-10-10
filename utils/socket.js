const { Server } = require("socket.io");

const logger = require("./logger");
const config = require("../config/config");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.CORS.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info("Socket.IO initialized successfully");
  return io;
};

// send an event to every connected client
const notifyAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

const getConnectedCount = () => {
  return io ? io.engine.clientsCount : 0;
};

module.exports = {
  initializeSocket,
  notifyAll,
  getConnectedCount,
};
