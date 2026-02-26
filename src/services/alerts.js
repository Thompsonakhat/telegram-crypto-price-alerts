import { ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";
import { safeErr } from "../lib/log.js";

export function normalizeDirection(d) {
  const v = String(d || "").trim().toLowerCase();
  if (v === "above" || v === "up" || v === "over") return "above";
  if (v === "below" || v === "down" || v === "under") return "below";
  return null;
}

export function parseTargetPrice(s) {
  const v = Number(String(s || "").replace(/,/g, "").trim());
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export async function createAlert({ mongoUri, log, telegramUserId, symbol, direction, target }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  const sym = String(symbol || "").trim().toUpperCase();
  const dir = normalizeDirection(direction);
  const tgt = typeof target === "number" ? target : parseTargetPrice(target);

  if (!sym || !dir || !Number.isFinite(tgt)) return { ok: false, reason: "bad_input" };

  const doc = {
    telegramUserId: String(telegramUserId),
    symbol: sym,
    direction: dir,
    target: tgt,
    status: "active",
    triggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const r = await db.collection("alerts").insertOne(doc);
    return { ok: true, id: String(r.insertedId) };
  } catch (e) {
    log?.error("db alerts create failed", { op: "insertOne", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}

export async function listAlerts({ mongoUri, log, telegramUserId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db", alerts: [] };

  try {
    const rows = await db
      .collection("alerts")
      .find({ telegramUserId: String(telegramUserId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return {
      ok: true,
      alerts: rows.map((a) => ({
        id: String(a._id),
        symbol: String(a.symbol || "").toUpperCase(),
        direction: a.direction === "below" ? "below" : "above",
        target: Number(a.target),
        status: a.status === "triggered" ? "triggered" : "active",
        createdAt: a.createdAt ? new Date(a.createdAt) : null,
        triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : null,
      })),
    };
  } catch (e) {
    log?.error("db alerts list failed", { op: "find", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "db_error", alerts: [] };
  }
}

export async function removeAlert({ mongoUri, log, telegramUserId, alertId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  try {
    const _id = new ObjectId(String(alertId));
    const r = await db.collection("alerts").deleteOne({ _id, telegramUserId: String(telegramUserId) });
    return { ok: true, removed: r.deletedCount || 0 };
  } catch (e) {
    log?.warn("db alerts remove failed", { op: "deleteOne", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "bad_id" };
  }
}

export async function clearAlerts({ mongoUri, log, telegramUserId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  try {
    const r = await db.collection("alerts").deleteMany({ telegramUserId: String(telegramUserId) });
    return { ok: true, removed: r.deletedCount || 0 };
  } catch (e) {
    log?.error("db alerts clear failed", { op: "deleteMany", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}

export async function loadActiveAlerts({ mongoUri, log }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db", alerts: [] };

  try {
    const rows = await db
      .collection("alerts")
      .find({ status: "active" })
      .sort({ createdAt: 1 })
      .limit(5000)
      .toArray();

    return {
      ok: true,
      alerts: rows.map((a) => ({
        id: String(a._id),
        telegramUserId: String(a.telegramUserId),
        symbol: String(a.symbol || "").toUpperCase(),
        direction: a.direction === "below" ? "below" : "above",
        target: Number(a.target),
      })),
    };
  } catch (e) {
    log?.error("db alerts loadActive failed", { op: "find", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "db_error", alerts: [] };
  }
}

export async function markTriggered({ mongoUri, log, alertId, currentPrice }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  try {
    const _id = new ObjectId(String(alertId));
    await db.collection("alerts").updateOne(
      { _id, status: "active" },
      {
        $set: {
          status: "triggered",
          triggeredAt: new Date(),
          updatedAt: new Date(),
          lastKnownPrice: Number.isFinite(currentPrice) ? currentPrice : null,
        },
      }
    );
    return { ok: true };
  } catch (e) {
    log?.error("db alerts markTriggered failed", { op: "updateOne", col: "alerts", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}
