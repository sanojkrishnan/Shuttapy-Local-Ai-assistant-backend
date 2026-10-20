const { checkHealth } = require("../controller/OllamaController.js");
const SystemController = require("../controller/SystemController.js");
const { isValidAck } = require("../validation/systemValidation");

const registerSystemSocketRoutes = (socket) => {
  socket.on("system:get", (ack) => {
    if (!isValidAck(ack)) return;
    SystemController.getResources(ack);
  });
};

const registerShuttapySocketRoutes = (socket) => {
  socket.on("shuttapy:health", (ack) => {
    if (!checkHealth(ack)) return;
    ack;
  });
};

module.exports = { registerSystemSocketRoutes, registerShuttapySocketRoutes };
