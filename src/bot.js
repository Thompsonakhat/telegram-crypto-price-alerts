import { Bot } from "grammy";
import { maybeHandleAlertFlowMessage } from "./features/alertFlow.js";

export function createBot(token, deps) {
  const bot = new Bot(token);

  bot.on("message:text", async (ctx, next) => {
    const raw = String(ctx.message?.text || "");
    if (raw.startsWith("/")) return next();

    const handled = await maybeHandleAlertFlowMessage(ctx, deps);
    if (handled) return;

    return next();
  });

  return bot;
}
