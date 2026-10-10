const { OLLAMA_MODEL, OLLAMA_URL } = require("../config/config");

//this will start the ollama local ai model
async function sendToOllama(messages) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status}`);
  }

  const data = await response.json();

  return data.message?.content ?? "";
}

module.exports = { sendToOllama };
