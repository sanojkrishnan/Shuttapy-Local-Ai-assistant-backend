const logger = require("../utils/logger");
const { systemService } = require("../services/systemStatsService");

const getResources = async (ack) => {
  try {
    ack(await systemService.getResources());
  } catch (error) {
    logger.error("Failed to read system resources:", error);
    ack({ error: "Failed to read system resources" });
  }
};

module.exports = { getResources };