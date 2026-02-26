import { MongoClient } from "mongodb";
import { safeErr } from "./log.js";

let _client = null;
let _db = null;
let _initPromise = null;

export async function getDb(mongoUri, log) {
  if (!mongoUri) return null;
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      _client = new MongoClient(mongoUri, {
        maxPoolSize: 5,
        ignoreUndefined: true,
      });
      await _client.connect();
      _db = _client.db();

      if (log) log.info("db connected", { mongo: true });

      await ensureIndexes(_db, log);
      return _db;
    } catch (e) {
      if (log) log.error("db connect failed", { err: safeErr(e) });
      _client = null;
      _db = null;
      _initPromise = null;
      return null;
    }
  })();

  return _initPromise;
}

async function ensureIndexes(db, log) {
  try {
    await db.collection("users").createIndex({ telegramUserId: 1 }, { unique: true });
    await db.collection("watchlists").createIndex({ telegramUserId: 1 }, { unique: true });
    await db.collection("alerts").createIndex({ telegramUserId: 1, status: 1 });
    await db.collection("alerts").createIndex({ status: 1, symbol: 1 });
  } catch (e) {
    if (log) log.error("db ensureIndexes failed", { err: safeErr(e) });
  }
}

export async function closeDb(log) {
  try {
    if (_client) await _client.close();
  } catch (e) {
    if (log) log.warn("db close failed", { err: safeErr(e) });
  } finally {
    _client = null;
    _db = null;
    _initPromise = null;
  }
}
