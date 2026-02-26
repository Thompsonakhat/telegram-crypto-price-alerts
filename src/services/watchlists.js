import { getDb } from "../lib/db.js";
import { safeErr } from "../lib/log.js";

export async function getWatchlist({ mongoUri, log, telegramUserId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db", symbols: [] };

  try {
    const doc = await db.collection("watchlists").findOne({ telegramUserId: String(telegramUserId) });
    const symbols = Array.isArray(doc?.symbols) ? doc.symbols.map((s) => String(s).toUpperCase()) : [];
    return { ok: true, symbols };
  } catch (e) {
    log?.error("db watchlists get failed", { op: "findOne", col: "watchlists", err: safeErr(e) });
    return { ok: false, reason: "db_error", symbols: [] };
  }
}

export async function hasInWatchlist({ mongoUri, log, telegramUserId, symbol }) {
  const r = await getWatchlist({ mongoUri, log, telegramUserId });
  if (!r.ok) return { ok: false, has: false };
  const sym = String(symbol || "").trim().toUpperCase();
  return { ok: true, has: r.symbols.includes(sym) };
}

export async function addToWatchlist({ mongoUri, log, telegramUserId, symbol }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  const sym = String(symbol || "").trim().toUpperCase();
  if (!sym) return { ok: false, reason: "bad_symbol" };

  try {
    await db.collection("watchlists").updateOne(
      { telegramUserId: String(telegramUserId) },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: { updatedAt: new Date() },
        $addToSet: { symbols: sym },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    log?.error("db watchlists add failed", { op: "updateOne", col: "watchlists", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}

export async function removeFromWatchlist({ mongoUri, log, telegramUserId, symbol }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  const sym = String(symbol || "").trim().toUpperCase();
  if (!sym) return { ok: false, reason: "bad_symbol" };

  try {
    await db.collection("watchlists").updateOne(
      { telegramUserId: String(telegramUserId) },
      {
        $set: { updatedAt: new Date() },
        $pull: { symbols: sym },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    log?.error("db watchlists remove failed", { op: "updateOne", col: "watchlists", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}

export async function clearWatchlist({ mongoUri, log, telegramUserId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  try {
    await db.collection("watchlists").updateOne(
      { telegramUserId: String(telegramUserId) },
      {
        $setOnInsert: { },
        $set: { symbols: [], updatedAt: new Date() },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    log?.error("db watchlists clear failed", { op: "updateOne", col: "watchlists", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}
