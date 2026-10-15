const { checkHealth } = require("../controller/OllamaController.js");
const { getResources } = require("../controller/systemController");
const { isValidAck } = require("../validation/systemValidation");

const registerSystemSocketRoutes = (socket) => {
  socket.on("system:get", (ack) => {
    if (!isValidAck(ack)) return;
    getResources(ack);
  });
};

const registerShuttapySocketRoutes = (socket) => {
  socket.on("shuttapy:health", (ack) => {
    if (!checkHealth(ack)) return;
    ack;
  });
};

module.exports = { registerSystemSocketRoutes, registerShuttapySocketRoutes };
