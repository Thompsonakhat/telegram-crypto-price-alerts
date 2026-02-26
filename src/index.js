import "dotenv/config";

import { run } from "@grammyjs/runner";

import { cfg } from "./lib/config.js";
import { createLogger, safeErr } from "./lib/log.js";
import { createBot } from "./bot.js";
import { registerCommands } from "./commands/loader.js";
import { getDb, closeDb } from "./lib/db.js";
import { MarketDataService } from "./services/marketData.js";
import { startAlertPoller } from "./jobs/alertPoller.js";
import { buildBotProfile } from "./lib/botProfile.js";

process.on("unhandledRejection", (r) => {
  console.error("UnhandledRejection:", r);
  process.exit(1);
});
process.on("uncaughtException", (e) => {
  console.error("UncaughtException:", e);
  process.exit(1);
});

async function boot() {
  const log = createLogger({ level: cfg.LOG_LEVEL });

  log.info("boot start", {
    nodeEnv: process.env.NODE_ENV || "",
    TELEGRAM_BOT_TOKEN_set: !!cfg.TELEGRAM_BOT_TOKEN,
    MONGODB_URI_set: !!cfg.MONGODB_URI,
    COIN_API_BASE_URL_set: !!cfg.COIN_API_BASE_URL,
  });

  if (!cfg.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is required. Add it to your env and redeploy.");
    process.exit(1);
  }

  const bot = createBot(cfg.TELEGRAM_BOT_TOKEN, { mongoUri: cfg.MONGODB_URI, log });

  try {
    await bot.init();
  } catch (e) {
    log.warn("bot init failed", { err: safeErr(e) });
  }

  const db = await getDb(cfg.MONGODB_URI, log);
  if (!db && cfg.MONGODB_URI) {
    log.warn("db unavailable, running in limited mode", { mongo: false });
  }

  const market = new MarketDataService({
    baseUrl: cfg.COIN_API_BASE_URL,
    cacheTtlMs: cfg.CACHE_TTL_MS,
    log,
  });

  const botProfile = buildBotProfile();
  log.info("bot profile", { chars: botProfile.length });

  await registerCommands(bot, { cfg, log, market, mongoUri: cfg.MONGODB_URI, botProfile });

  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Welcome and menu" },
      { command: "help", description: "How to use the bot" },
      { command: "price", description: "Get price for a symbol" },
      { command: "watchlist", description: "Manage your watchlist" },
      { command: "alerts", description: "List your alerts" },
      { command: "alert", description: "Add/remove an alert" },
      { command: "reset", description: "Clear watchlist and alerts" },
    ]);
  } catch (e) {
    log.warn("setMyCommands failed", { err: safeErr(e) });
  }

  let poller = null;

  async function startPollingWithRetry() {
    let delay = 2000;
    const maxDelay = 20000;
    let runner = null;

    for (;;) {
      try {
        log.info("polling start", { runnerConcurrency: 1 });

        try {
          await bot.api.deleteWebhook({ drop_pending_updates: true });
        } catch (e) {
          log.warn("deleteWebhook failed", { err: safeErr(e) });
        }

        runner = run(bot, { runner: { concurrency: 1 } });
        log.info("polling running");

        poller = startAlertPoller({ bot, cfg, log, market });

        await runner.task();

        log.warn("polling stopped unexpectedly, restarting");
      } catch (e) {
        const msg = safeErr(e);
        const is409 = String(msg).includes("409") || String(msg).toLowerCase().includes("conflict");
        log.warn("polling error", { err: msg, is409, delayMs: delay });
      }

      try {
        poller?.stop?.();
      } catch {}
      poller = null;

      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(maxDelay, Math.floor(delay * 1.7));
    }
  }

  await startPollingWithRetry();

  async function shutdown() {
    try {
      poller?.stop?.();
    } catch {}
    await closeDb(log);
  }

  process.on("SIGINT", () => shutdown().finally(() => process.exit(0)));
  process.on("SIGTERM", () => shutdown().finally(() => process.exit(0)));
}

boot().catch((e) => {
  console.error("Boot error:", safeErr(e));
  process.exit(1);
});
