const config = require("../config/config");

const CONNECTION_TIMEOUT = 5 * 60 * 1000;
const FIRST_OUTPUT_TIMEOUT = 5 * 60 * 1000;
const STREAM_IDLE_TIMEOUT = 2 * 60 * 1000;

function readWithTimeout(reader, timeoutMs, phase) {
  let timer;

  return Promise.race([
    reader.read(),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            "Ollama timed out while ${phase} after ${Math.round( timeoutMs / 1000, )} seconds.",
          ),
        );
      }, timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function sendToOllama(messages, onChunk) {
  const controller = new AbortController();

  let connectionTimer;
  let reader;
  let firstOutputReceived = false;
  let fullReply = "";
  let buffer = "";

  try {
    connectionTimer = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);

    const response = await fetch(`${config.OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(connectionTimer);
    connectionTimer = undefined;

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama error (${response.status}): ${detail}`);
    }

    if (!response.body) {
      throw new Error("Ollama returned no response stream.");
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder();

    function processLine(line) {
      if (!line.trim()) return;

      const data = JSON.parse(line);

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.message?.content) {
        const chunk = data.message.content;

        fullReply += chunk;
        onChunk?.(chunk);
      }
    }

    while (true) {
      const timeoutMs = firstOutputReceived
        ? STREAM_IDLE_TIMEOUT
        : FIRST_OUTPUT_TIMEOUT;

      const phase = firstOutputReceived
        ? "waiting for the next output chunk"
        : "waiting for the first output";

      const { value, done } = await readWithTimeout(reader, timeoutMs, phase);

      if (done) break;

      if (!value || value.length === 0) continue;

      firstOutputReceived = true;
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
  } catch (error) {
    if (reader) {
      try {
        await reader.cancel(error);
      } catch {
        // The stream may already be closed.
      }
    }

    if (error.name === "AbortError" && controller.signal.aborted) {
      throw new Error(
        "Timed out while connecting to Ollama. Check that Ollama is running and the model is available.",
      );
    }

    throw error;
  } finally {
    clearTimeout(connectionTimer);

    if (reader) {
      try {
        reader.releaseLock();
      } catch {
        // The reader may already have been released.
      }
    }
  }
}

module.exports = sendToOllama;
