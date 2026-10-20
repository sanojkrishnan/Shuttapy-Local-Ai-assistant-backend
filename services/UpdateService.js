const { OllamaService } = require("./ollamaService");


class UpdateService {
  static async checkForUpdates({ force = false } = {}) {
    const ollama = await OllamaService.checkForUpdates({ force });
    return { ollama };
  }
}

module.exports = UpdateService;
