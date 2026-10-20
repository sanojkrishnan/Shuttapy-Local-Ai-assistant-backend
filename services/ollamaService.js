const crypto = require("crypto");
const { OLLAMA_URL } = require("../config/config");

class OllamaService {
  static GITHUB_RELEASE_URL =
    "https://api.github.com/repos/ollama/ollama/releases/latest";
  static REGISTRY_URL = "https://registry.ollama.ai/v2";
  static CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  static REQUEST_TIMEOUT_MS = 10000;
  static cache = null;

  // fetch with a timeout that throws on non-OK responses
  static async request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(OllamaService.REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`${new URL(url).host} responded with ${res.status}`);
    }
    return res;
  }

  static parseVer(v) {
    return v
      .replace(/^v/, "")
      .split("-")[0] // ignore pre-release suffixes like -rc1
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  }

  static isNewer(latest, current) {
    const a = OllamaService.parseVer(latest);
    const b = OllamaService.parseVer(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if ((a[i] || 0) > (b[i] || 0)) return true;
      if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
  }

  static async checkOllamaBinary() {
    const [localRes, remoteRes] = await Promise.all([
      OllamaService.request(`${OLLAMA_URL}/api/version`),
      OllamaService.request(OllamaService.GITHUB_RELEASE_URL, {
        headers: {
          "User-Agent": "shuttapy",
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    const { version: current } = await localRes.json();
    const { tag_name: latest } = await remoteRes.json();

    if (!current || !latest) {
      throw new Error("Could not read Ollama version information");
    }

    return {
      currentVersion: current,
      latestVersion: latest.replace(/^v/, ""),
      updateAvailable: OllamaService.isNewer(latest, current),
    };
  }

  static normalizeDigest(digest) {
    return String(digest || "").replace(/^sha256:/, "");
  }

  static async getRemoteDigest(fullName) {
    // "llama3:8b" -> library/llama3 : 8b ; "user/model:tag" stays namespaced
    const [name, tag = "latest"] = fullName.split(":");

    // models pulled from other hosts (hf.co/..., etc.) aren't on the Ollama registry
    if (name.split("/")[0].includes(".")) {
      throw new Error("Not hosted on the Ollama registry");
    }

    const repo = name.includes("/") ? name : `library/${name}`;

    const res = await OllamaService.request(
      `${OllamaService.REGISTRY_URL}/${repo}/manifests/${tag}`,
      {
        headers: {
          Accept: "application/vnd.docker.distribution.manifest.v2+json",
        },
      },
    );

    // prefer the digest the registry reports, fall back to hashing the manifest
    const headerDigest = res.headers.get("docker-content-digest");
    if (headerDigest) return OllamaService.normalizeDigest(headerDigest);

    const body = Buffer.from(await res.arrayBuffer());
    return crypto.createHash("sha256").update(body).digest("hex");
  }

  static async checkModels() {
    const [tagsRes, psRes] = await Promise.all([
      OllamaService.request(`${OLLAMA_URL}/api/tags`),
      OllamaService.request(`${OLLAMA_URL}/api/ps`),
    ]);

    const { models = [] } = await tagsRes.json();
    const { models: running = [] } = await psRes.json();
    const runningNames = new Set(running.map((m) => m.name));

    const results = await Promise.allSettled(
      models.map(async (m) => {
        const remoteDigest = await OllamaService.getRemoteDigest(m.name);
        const localDigest = OllamaService.normalizeDigest(m.digest);
        return {
          name: m.name,
          running: runningNames.has(m.name),
          localDigest,
          remoteDigest,
          updateAvailable: remoteDigest !== localDigest,
        };
      }),
    );

    return results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            name: models[i].name,
            running: runningNames.has(models[i].name),
            updateAvailable: null, // couldn't check
            error: r.reason.message,
          },
    );
  }

  static async checkForUpdates({ force = false } = {}) {
    const cached = OllamaService.cache;
    if (
      !force &&
      cached &&
      Date.now() - cached.at < OllamaService.CACHE_TTL_MS
    ) {
      return cached.data;
    }

    const [binary, models] = await Promise.allSettled([
      OllamaService.checkOllamaBinary(),
      OllamaService.checkModels(),
    ]);

    const modelList = models.status === "fulfilled" ? models.value : [];

    const data = {
      ...(binary.status === "fulfilled"
        ? binary.value
        : {
            currentVersion: null,
            latestVersion: null,
            updateAvailable: null,
            error: binary.reason.message,
          }),
      models: modelList,
      modelUpdatesAvailable: modelList.filter((m) => m.updateAvailable).length,
      ...(models.status === "rejected" && {
        modelsError: models.reason.message,
      }),
    };

    // only cache clean results so a temporary failure isn't remembered
    if (binary.status === "fulfilled" && models.status === "fulfilled") {
      OllamaService.cache = { at: Date.now(), data };
    }

    return data;
  }
}

module.exports = { OllamaService };
