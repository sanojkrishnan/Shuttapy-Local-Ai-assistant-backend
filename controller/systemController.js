const logger = require("../utils/logger");
const { systemService } = require("../services/systemStatsService");

const getResources = async (ack) => {
  try {
    const t = Date.now();
    const data = await systemService.getResources();
    logger.info(`system:get took ${Date.now() - t}ms`);
    ack(data);
  } catch (error) {
    logger.error("Failed to read system resources:", error);
    ack({ error: "Failed to read system resources" });
  }
};

module.exports = { getResources };
