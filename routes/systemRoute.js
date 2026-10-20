const express = require("express");
const UpdateController = require("../controller/UpdateController");
const router = express.Router();

router.get("/update", UpdateController.updateCheck);

module.exports = router;
