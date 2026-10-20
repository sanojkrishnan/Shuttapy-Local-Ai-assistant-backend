const si = require("systeminformation");
const { spawn } = require("child_process");
const os = require("os");

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
Get-Counter '\Processor Information(_Total)\% Processor Utility','\GPU Engine(*)\Utilization Percentage','\Network Interface(*)\Bytes Received/sec','\Network Interface(*)\Bytes Sent/sec' -SampleInterval 1 -Continuous -ErrorAction SilentlyContinue | ForEach-Object {
  $s = $_.CounterSamples;
  $cpu = ($s | Where-Object { $_.Path -like '*processor utility*' } | Select-Object -First 1).CookedValue;
  $rx = ($s | Where-Object { $_.Path -like '*bytes received/sec' } | Measure-Object CookedValue -Sum).Sum;
  $tx = ($s | Where-Object { $_.Path -like '*bytes sent/sec' } | Measure-Object CookedValue -Sum).Sum;
  $gpu = $s | Where-Object { $_.Path -like '*gpu engine*' -and $_.CookedValue -gt 0 } | Group-Object { $_.InstanceName -replace '.*(luid_0x[0-9A-Fa-f]+_0x[0-9A-Fa-f]+).*engtype_(.*)','$1|$2' } | ForEach-Object { [pscustomobject]@{ key = $_.Name; value = ($_.Group | Measure-Object CookedValue -Sum).Sum } };
  [pscustomobject]@{ cpu = $cpu; rx = $rx; tx = $tx; gpu = @($gpu) } | ConvertTo-Json -Compress -Depth 4
}
`.replace(/\s*\n\s*/g, " ");

class SystemStatsService {
  constructor() {
    this.latest = null; // { cpu, gpu, at }
    this.sampler = null;
    this.stopping = false;

    // Slow lookups, cached in the background.
    this.getGraphics = cached(() => si.graphics(), 10000);
    this.getTemperature = cached(() => si.cpuTemperature(), 10000);
    this.getDisks = cached(() => si.fsSize(), 30000);
    this.getDiskLayout = cached(() => si.diskLayout(), 60000);

    if (process.platform === "win32") {
      this.startSampler();
    }

    // Don't leave an orphaned PowerShell behind.
    process.on("exit", () => {
      this.stopping = true;
      this.sampler?.kill();
    });

    // Start the lookups at boot so the first request is fast.
    this.getGraphics();
    this.getTemperature();
    this.getDisks();
    this.getDiskLayout();
    si.networkStats().catch(() => {});
    si.currentLoad().catch(() => {});
  }

  startSampler = () => {
    this.sampler = spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", SAMPLER_SCRIPT],
      { windowsHide: true },
    );

    this.sampler.stdout.setEncoding("utf8");

    let buffer = "";

    this.sampler.stdout.on("data", (chunk) => {
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop(); // keep the unfinished line

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          this.latest = { ...JSON.parse(line), at: Date.now() };
        } catch {
          // ignore a broken line
        }
      }
    });

    this.sampler.on("exit", () => {
      this.sampler = null;

      if (!this.stopping) {
        setTimeout(this.startSampler, 3000); // restart if it dies
      }
    });
  };

  // Latest reading, or null if there is none or it is stale.
  getCounters = () =>
    this.latest && Date.now() - this.latest.at < 5000 ? this.latest : null;

  // Task Manager's GPU % = busiest engine type of that adapter.
  gpuBusyFrom = (counters) => {
    const byAdapter = {};

    for (const g of [].concat(counters?.gpu ?? []).filter(Boolean)) {
      const luid = String(g.key).split("|")[0];

      byAdapter[luid] = Math.max(byAdapter[luid] ?? 0, g.value);
    }

    const values = Object.values(byAdapter);

    return values.length ? Math.min(100, Math.max(...values)) : 0;
  };

  async getResources() {
    const total = os.totalmem();
    const ramUsed = total - os.freemem();

    const [load, counters, gfx, temp, fs, layout] = await Promise.all([
      si.currentLoad(), // used for the core count and as a fallback
      Promise.resolve(this.getCounters()),
      this.getGraphics(),
      this.getTemperature(),
      this.getDisks(),
      this.getDiskLayout(),
    ]);

    const gpu = gfx?.controllers?.[0];

    // Whole physical disk(s), not a single partition.
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
        total,
        used: ramUsed,
        usedPercent: round((ramUsed / total) * 100),
      },

      disk: {
        total: diskTotal,
        used: diskUsed,
        usedPercent: diskTotal ? round((diskUsed / diskTotal) * 100) : 0,
      },

      gpu: gpu
        ? {
            name: gpu.model,
            usage: counters
              ? this.gpuBusyFrom(counters)
              : (gpu.utilizationGpu ?? 0),
            vramTotal: gpu.vram, // MB
            vramUsed: gpu.memoryUsed ?? null,
            temp: gpu.temperatureGpu ?? null,
          }
        : null,

      network: {
        rx: counters?.rx ?? 0, // bytes/s
        tx: counters?.tx ?? 0,
      },
    };
  }
}

const systemService = new SystemStatsService();

module.exports = { systemService };
