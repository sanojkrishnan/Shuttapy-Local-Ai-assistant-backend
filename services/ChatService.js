const logger = require("../utils/logger");
const sendToOllama = require("../utils/sendToOllama");

class ChatService {
  static async makeChat({ message, onChunk }) {
    try {
      const reply = await sendToOllama(
        [{ role: "user", content: message }],
        onChunk,
      );

      return { reply };
    } catch (error) {
      logger.error("Chat error:", error);
      throw error;
    }
  }
}

module.exports = ChatService;
