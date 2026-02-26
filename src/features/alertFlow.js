import { parseTargetPrice, createAlert } from "../services/alerts.js";

const TTL_MS = 120_000;

const flows = new Map();

function now() {
  return Date.now();
}

function keyFor(userId) {
  return String(userId || "");
}

export function startAlertFlow({ userId, symbol, direction }) {
  const k = keyFor(userId);
  flows.set(k, {
    symbol: String(symbol || "").trim().toUpperCase(),
    direction: String(direction || "").trim().toLowerCase(),
    expiresAt: now() + TTL_MS,
  });
}

export function clearAlertFlow(userId) {
  flows.delete(keyFor(userId));
}

export function getAlertFlow(userId) {
  const k = keyFor(userId);
  const f = flows.get(k);
  if (!f) return null;
  if (f.expiresAt <= now()) {
    flows.delete(k);
    return null;
  }
  return f;
}

export async function maybeHandleAlertFlowMessage(ctx, { mongoUri, log }) {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const f = getAlertFlow(userId);
  if (!f) return false;

  const text = String(ctx.message?.text || "").trim();
  if (!text) return true;

  if (/^(cancel|stop|never mind|nevermind)$/i.test(text)) {
    clearAlertFlow(userId);
    await ctx.reply("Cancelled. If you want to add an alert, use /alert add BTC above 70000 or tap Add Alert from a price message.");
    return true;
  }

  const target = parseTargetPrice(text);
  if (!target) {
    await ctx.reply(`Please send a valid number for the target price (USD), or type cancel.`);
    return true;
  }

  clearAlertFlow(userId);

  const created = await createAlert({
    mongoUri,
    log,
    telegramUserId: userId,
    symbol: f.symbol,
    direction: f.direction,
    target,
  });

  if (!created.ok) {
    if (created.reason === "no_db") {
      await ctx.reply("Alerts need a database connection. The bot is running in limited mode right now.");
      return true;
    }
    await ctx.reply("Sorry, I couldn’t create that alert. Please try again.");
    return true;
  }

  const idShort = String(created.id).slice(0, 8);
  await ctx.reply(`Alert created: ${idShort}\n${f.symbol} ${f.direction} ${target}`);
  return true;
}
