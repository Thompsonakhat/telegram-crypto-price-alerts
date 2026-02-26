import { safeErr } from "../lib/log.js";
import { loadActiveAlerts, markTriggered } from "../services/alerts.js";
import { fmtUsd } from "../lib/format.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function startAlertPoller({ bot, cfg, log, market }) {
  const intervalMs = Number.isFinite(cfg.POLL_INTERVAL_MS) && cfg.POLL_INTERVAL_MS > 0 ? cfg.POLL_INTERVAL_MS : 45_000;

  let stopped = false;
  let running = false;
  let cycles = 0;
  let backoffMs = 0;

  async function cycle() {
    if (stopped || running) return;
    running = true;
    const started = Date.now();

    try {
      log.info("poller cycle start", { intervalMs, backoffMs });

      if (backoffMs > 0) {
        await sleep(backoffMs);
        backoffMs = 0;
      }

      const r = await loadActiveAlerts({ mongoUri: cfg.MONGODB_URI, log });
      const alerts = r.ok ? r.alerts : [];

      if (!r.ok) {
        log.warn("poller load alerts failed", { reason: r.reason });
        return;
      }

      const uniqueSymbols = [...new Set(alerts.map((a) => a.symbol))];
      const quotes = await market.getQuotesForSymbols(uniqueSymbols);

      let checked = 0;
      let triggered = 0;

      for (const a of alerts) {
        checked++;
        const q = quotes.get(a.symbol);
        if (!q || !q.ok) continue;

        const price = q.priceUsd;
        const hit = a.direction === "above" ? price >= a.target : price <= a.target;
        if (!hit) continue;

        triggered++;

        try {
          await markTriggered({ mongoUri: cfg.MONGODB_URI, log, alertId: a.id, currentPrice: price });

          const idShort = String(a.id).slice(0, 8);
          const msg = [
            `Price alert triggered (${idShort})`,
            `${a.symbol} is ${fmtUsd(price)}`,
            `Target was ${a.direction} ${fmtUsd(a.target)}`,
          ].join("\n");

          await bot.api.sendMessage(Number(a.telegramUserId), msg, {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "View Price", callback_data: `px:${a.symbol}` },
                  { text: "Remove Alert", callback_data: `ar:${a.id}` },
                ],
                [
                  { text: "New Alert ↑", callback_data: `aa:${a.symbol}:above` },
                  { text: "New Alert ↓", callback_data: `aa:${a.symbol}:below` },
                ],
              ],
            },
          });
        } catch (e) {
          log.warn("poller notify failed", { userId: a.telegramUserId, err: safeErr(e) });
        }
      }

      const ms = Date.now() - started;
      log.info("poller cycle end", { checked, triggered, symbols: uniqueSymbols.length, ms });

      cycles++;
      if (cycles % Math.max(1, Math.floor(60_000 / intervalMs)) === 0) {
        const m = process.memoryUsage();
        console.log("[mem]", { rssMB: Math.round(m.rss / 1e6), heapUsedMB: Math.round(m.heapUsed / 1e6) });
      }
    } catch (e) {
      log.error("poller cycle error", { err: safeErr(e) });
      backoffMs = Math.min(20_000, Math.max(2_000, (backoffMs || 2_000) * 2));
    } finally {
      running = false;
    }
  }

  log.info("poller started", { intervalMs });
  const t = setInterval(() => {
    cycle().catch((e) => log.error("poller tick error", { err: safeErr(e) }));
  }, intervalMs);

  cycle().catch((e) => log.error("poller first cycle error", { err: safeErr(e) }));

  return {
    stop: () => {
      stopped = true;
      clearInterval(t);
      log.info("poller stopped");
    },
  };
}
