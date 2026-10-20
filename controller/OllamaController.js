const logger = require("../utils/logger");
const { OLLAMA_MODEL } = require("../config/config");
const ShuttapyHealthCheckService = require("../services/ShuttapyHealthCheckService");

const errorFor = (status) =>
  status.ollama !== "online"
    ? "Local AI (Ollama) is not reachable"
    : `Model "${OLLAMA_MODEL}" is not installed in Ollama`;

const checkHealth = async (ack) => {
  try {
    const status = await ShuttapyHealthCheckService.getStatus();

    if (!status.ready) {
      logger.warn("Shuttapy health check: not ready", status);
      return ack({ error: errorFor(status) });
    }

    ack(status);
  } catch (error) {
    logger.error("Shuttapy health check failed:", error);
    ack({ error: "Health check failed" });
  }
};

module.exports = { checkHealth };
