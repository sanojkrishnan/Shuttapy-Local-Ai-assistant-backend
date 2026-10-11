const { OLLAMA_URL, OLLAMA_MODEL } = require("../config/config");

const shuttapyHealthService = {
  // never throws, always returns the status object
  async getStatus() {
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
            item.name.startsWith(`${OLLAMA_MODEL}:`),
        );

        model = modelExists ? "available" : "missing";
      }
    } catch {
      // stays offline
    }

    const ready = ollama === "online" && model === "available";

    return { backend: "online", ollama, model, ready };
  },
};

module.exports = { shuttapyHealthService };
