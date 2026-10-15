const BaseController = require("./BaseController");
const ChatService = require("../services/ChatService");
const { chatSchema } = require("../validation/chatValidation");

class ChatController extends BaseController {
  static makeChat = BaseController.asyncHandler(async (req, res) => {
    // 1. Validate the incoming message.
    const validatedData = BaseController.validateRequest(chatSchema, req.body);

    // 2. Start the streaming HTTP response.
    BaseController.startTextStream(res);

    try {
      // 3. Generate the reply and forward every chunk.
      await ChatService.makeChat({
        ...validatedData,

        onChunk: (chunk) => {
          BaseController.sendStreamChunk(res, chunk);
        },
      });

      // 4. Preserve your existing action logging.
      BaseController.logAction("CHAT_MESSAGE", null, {
        messageLength: validatedData.message.length,
      });

      // 5. Finish the response after generation completes.
      BaseController.endStream(res);
    } catch (error) {
      // Once streaming starts, a JSON error response
      // cannot safely be sent on the same response.
      if (res.headersSent) {
        if (!res.destroyed && !res.writableEnded) {
          res.destroy(error);
        }
        return;
      }

      throw error;
    }
  });
}

module.exports = ChatController;
