import { getDb } from "../lib/db.js";
import { safeErr } from "../lib/log.js";

export async function upsertUser({ mongoUri, log, telegramUserId, chatId }) {
  const db = await getDb(mongoUri, log);
  if (!db) return { ok: false, reason: "no_db" };

  try {
    await db.collection("users").updateOne(
      { telegramUserId: String(telegramUserId) },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          telegramUserId: String(telegramUserId),
          chatId: chatId ? String(chatId) : "",
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    return { ok: true };
  } catch (e) {
    log?.error("db users upsert failed", { op: "updateOne", col: "users", err: safeErr(e) });
    return { ok: false, reason: "db_error" };
  }
}
