const { Router } = require("express");
const { chatController, healthChecker } = require("../controller/chatController");

const router = Router();

router.post("/", chatController);

router.get("/health", healthChecker);

module.exports = router;