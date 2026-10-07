const mongoose = require("mongoose");
const config = require("./config");
const logger = require("../utils/logger");

class DatabaseConnection {
  //class for creating db connection
  constructor() {
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        logger.info("Database is already connected");
      }
      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      };
      await mongoose.connect(config.MONGO_URL, options); //mongodb connection
      this.isConnected = true;
      logger.info("MongoDB connected successfully");
      mongoose.connection.on("error", (err) => {
        logger.error("MongoDB connection error:", err);
        this.isConnected = false;
      });
      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      logger.error("MongoDB connection failed:", error);
      process.exit(1);
    }
  }
  async disconnect() {
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("MongoDB disconnected gracefully");
    } catch (error) {
      logger.error("Error during MongoDB disconnect:", error);
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }
}

const DBConnect = new DatabaseConnection();

process.on("SIGINT", async () => {
  //SIGINT = please stop working
  await DBConnect.disconnect();
  process.exit(0);
});

module.exports = DBConnect;
