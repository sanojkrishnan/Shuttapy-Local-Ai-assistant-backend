const BaseController = require("./BaseController");
const logger = require("../utils/logger");
const { systemService } = require("../services/systemStatsService");

class SystemController extends BaseController {
  static async getResources(ack) {
    try {
      const startTime = Date.now();

      const data = await systemService.getResources();

      logger.info(`system:get took ${Date.now() - startTime}ms`);

      if (typeof ack === "function") {
        ack(data);
      }
    } catch (error) {
      logger.error("Failed to read system resources:", error);

      if (typeof ack === "function") {
        ack({ error: "Failed to read system resources" });
      }
    }
  }
}

module.exports = SystemController;
