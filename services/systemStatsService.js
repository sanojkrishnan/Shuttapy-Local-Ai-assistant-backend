const si = require("systeminformation");
const { spawn } = require("child_process");

const round = (n) => (n == null ? null : Math.round(n));

// Runs a slow lookup in the background and returns the last result instantly.
const cached = (fn, ttlMs) => {
  let value;
  let fetchedAt = 0;
  let pending = null;

  return async () => {
    const expired = Date.now() - fetchedAt > ttlMs;

    if (expired && !pending) {
      pending = fn()
        .then((result) => {
          value = result;
          fetchedAt = Date.now();
        })
        .catch(() => {
          fetchedAt = Date.now(); // back off, retry after the ttl
        })
        .finally(() => {
          pending = null;
        });
    }

    return value; // may be undefined until the first lookup finishes
  };
};

/* ---- Windows performance counters (same source as Task Manager) ---- */
// One long-lived PowerShell samples every 1s, like Task Manager does.

const SAMPLER_SCRIPT = String.raw`
Get-Counter '\Processor Information(_Total)\% Processor Utility','\GPU Engine(*)\Utilization Percentage' -SampleInterval 1 -Continuous -ErrorAction SilentlyContinue | ForEach-Object {
  $s = $_.CounterSamples;
  $cpu = ($s | Where-Object { $_.Path -like '*processor utility*' } | Select-Object -First 1).CookedValue;
  $gpu = $s | Where-Object { $_.Path -like '*gpu engine*' -and $_.CookedValue -gt 0 } | Group-Object { $_.InstanceName -replace '.*(luid_0x[0-9A-Fa-f]+_0x[0-9A-Fa-f]+).*engtype_(.*)','$1|$2' } | ForEach-Object { [pscustomobject]@{ key = $_.Name; value = ($_.Group | Measure-Object CookedValue -Sum).Sum } };
  [pscustomobject]@{ cpu = $cpu; gpu = @($gpu) } | ConvertTo-Json -Compress -Depth 4
}
`.replace(/\s*\n\s*/g, " ");

let latest = null; // { cpu, gpu, at }
let sampler = null;
let stopping = false;

const startSampler = () => {
  sampler = spawn(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", SAMPLER_SCRIPT],
    { windowsHide: true },
  );

  sampler.stdout.setEncoding("utf8");

  let buffer = "";
  sampler.stdout.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep the unfinished line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        latest = { ...JSON.parse(line), at: Date.now() };
      } catch {
        /* ignore a broken line */
      }
    }
  });

  sampler.on("exit", () => {
    sampler = null;
    if (!stopping) setTimeout(startSampler, 3000); // restart if it dies
  });
};

if (process.platform === "win32") startSampler();

// don't leave an orphaned PowerShell behind
process.on("exit", () => {
  stopping = true;
  sampler?.kill();
});

// latest reading, or null if there is none or it is stale
const getCounters = () =>
  latest && Date.now() - latest.at < 5000 ? latest : null;

// Task Manager's GPU % = busiest engine type (3D, Copy, ...) of that adapter
const gpuBusyFrom = (counters) => {
  const byAdapter = {};
  for (const g of [].concat(counters?.gpu ?? []).filter(Boolean)) {
    const luid = String(g.key).split("|")[0];
    byAdapter[luid] = Math.max(byAdapter[luid] ?? 0, g.value);
  }
  const values = Object.values(byAdapter);
  return values.length ? Math.min(100, Math.max(...values)) : 0;
};

/* ---- slow lookups, cached in the background ---- */

const getGraphics = cached(() => si.graphics(), 10000);
const getTemperature = cached(() => si.cpuTemperature(), 10000);
const getDisks = cached(() => si.fsSize(), 30000);
const getDiskLayout = cached(() => si.diskLayout(), 60000);

const systemService = {
  async getResources() {
    const [load, mem, net, counters, gfx, temp, fs, layout] = await Promise.all(
      [
        si.currentLoad(), // used for the core count and as a fallback
        si.mem(),
        si.networkStats(),
        getCounters(),
        getGraphics(),
        getTemperature(),
        getDisks(),
        getDiskLayout(),
      ],
    );

    const gpu = gfx?.controllers?.[0];
    const ramUsed = mem.total - mem.available; // Task Manager "In use"

    // whole physical disk(s), not a single partition
    const volumes = (fs ?? []).filter((d) => d.size > 0);
    const diskUsed = volumes.reduce((sum, d) => sum + d.used, 0);
    const diskTotal =
      (layout ?? []).reduce((sum, d) => sum + (d.size || 0), 0) ||
      volumes.reduce((sum, d) => sum + d.size, 0);

    return {
      cpu: {
        usage: round(Math.min(100, counters?.cpu ?? load.currentLoad)),
        cores: load.cpus.length,
        temp: temp?.main ?? null,
      },
      memory: {
        total: mem.total,
        used: ramUsed,
        usedPercent: round((ramUsed / mem.total) * 100),
      },
      disk: {
        total: diskTotal,
        used: diskUsed,
        usedPercent: diskTotal ? round((diskUsed / diskTotal) * 100) : 0,
      },
      gpu: gpu
        ? {
            name: gpu.model,
            usage: counters ? gpuBusyFrom(counters) : (gpu.utilizationGpu ?? 0),
            vramTotal: gpu.vram, // MB
            vramUsed: gpu.memoryUsed ?? null, // null = not reported (integrated)
            temp: gpu.temperatureGpu ?? null,
          }
        : null,
      network: {
        rx: net[0]?.rx_sec ?? 0, // bytes/s
        tx: net[0]?.tx_sec ?? 0,
      },
    };
  },
};

// start the lookups at boot so the first request is fast
getGraphics();
getTemperature();
getDisks();
getDiskLayout();
si.networkStats().catch(() => {});
si.currentLoad().catch(() => {});

module.exports = { systemService };