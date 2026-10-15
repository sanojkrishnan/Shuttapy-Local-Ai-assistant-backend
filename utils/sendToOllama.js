const config = require("../config/config");

async function sendToOllama(messages, onChunk) {
  const response = await fetch(`${config.OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.OLLAMA_MODEL,
      messages,
      stream: true,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama error (${response.status}): ${detail}`);
  }

  if (!response.body) {
    throw new Error("Ollama returned no response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullReply = "";

  function processLine(line) {
    if (!line.trim()) return;

    const data = JSON.parse(line);

    if (data.message?.content) {
      const chunk = data.message.content;
      fullReply += chunk;
      onChunk?.(chunk);
    }

    if (data.error) {
      throw new Error(data.error);
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      processLine(buffer);
    }

    return fullReply;
  } finally {
    reader.releaseLock();
  }
}

module.exports = sendToOllama;
