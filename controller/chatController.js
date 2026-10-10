
const sendToOllama = require("../services/ollamaService.js");
const chatSchema = require("../validation/chatValidation.js");
const { OLLAMA_URL, OLLAMA_MODEL } = require("../config/config");

async function chatController(req, res) {
  const { error, value } = chatSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: "Invalid chat request",
    });
  }

  try {
    const reply = await sendToOllama(value.messages);
    return res.json({ reply });
  } catch (error) {
    console.error("Shuttapy chat error:", error.message);

    return res.status(502).json({
      error: "Unable to get a response from the AI model.",
    });
  }
}

async function healthChecker(req, res) {
  // Declare the variables before using them.
  let ollama = "offline";
  let model = "unknown";

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (response.ok) {
      ollama = "online";

      const data = await response.json();
      const models = data.models || [];

      const modelExists = models.some(
        (item) =>
          item.name === OLLAMA_MODEL ||
          item.name.startsWith(`${OLLAMA_MODEL}:`)
      );

      model = modelExists ? "available" : "missing";
    }
  } catch (error) {
    console.error("Ollama health check failed:", error.message);
  }

  const ready = ollama === "online" && model === "available";

  return res.status(ready ? 200 : 503).json({
    backend: "online",
    ollama,
    model,
    ready,
  });
}

module.exports = { chatController, healthChecker };
