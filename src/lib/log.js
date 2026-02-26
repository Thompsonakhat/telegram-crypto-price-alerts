export function safeErr(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    String(err)
  );
}

function levelRank(lvl) {
  const v = String(lvl || "info").toLowerCase();
  if (v === "debug") return 10;
  if (v === "info") return 20;
  if (v === "warn") return 30;
  if (v === "error") return 40;
  return 20;
}

export function createLogger({ level = "info" } = {}) {
  const min = levelRank(level);
  const log = (lvl, msg, meta) => {
    if (levelRank(lvl) < min) return;
    const line = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...(meta && typeof meta === "object" ? meta : {}),
    };
    const s = JSON.stringify(line);
    if (lvl === "error") console.error(s);
    else if (lvl === "warn") console.warn(s);
    else console.log(s);
  };

  return {
    debug: (msg, meta) => log("debug", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    error: (msg, meta) => log("error", msg, meta),
  };
}
