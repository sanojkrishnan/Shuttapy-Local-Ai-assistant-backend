const express = require("express");
const router = express.Router();
const ChatController = require("../controller/ChatController");

router.post("/fetch", ChatController.makeChat);

module.exports = router;
