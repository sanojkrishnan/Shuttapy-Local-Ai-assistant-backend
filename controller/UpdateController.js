const BaseController = require("./BaseController");
const UpdateService = require("../services/UpdateService");

class UpdateController extends BaseController {
  static updateCheck = BaseController.asyncHandler(async (req, res) => {
    // GET /api/system/update?refresh=true skips the cache
    const result = await UpdateService.checkForUpdates({
      force: req.query.refresh === "true",
    });

    BaseController.logAction("UPDATE_CHECK", null, {
      ollamaUpdateAvailable: result.ollama?.updateAvailable,
      modelUpdatesAvailable: result.ollama?.modelUpdatesAvailable,
    });

    BaseController.sendSuccess(
      res,
      "Update check completed successfully",
      result,
      200,
    );
  });
}

module.exports = UpdateController;
