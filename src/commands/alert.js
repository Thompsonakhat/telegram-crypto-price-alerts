import { createAlert, normalizeDirection, parseTargetPrice, removeAlert } from "../services/alerts.js";
import { startAlertFlow } from "../features/alertFlow.js";

export default function register(bot, { cfg, log }) {
  bot.command("alert", async (ctx) => {
    const userId = ctx.from?.id;
    if (!cfg.MONGODB_URI) {
      await ctx.reply("Alerts need a database connection. The bot is running in limited mode right now.");
      return;
    }
    if (!userId) {
      await ctx.reply("I couldn’t identify your user id.");
      return;
    }

    const parts = String(ctx.match || "").trim().split(/\s+/).filter(Boolean);
    const sub = String(parts[0] || "").toLowerCase();

    if (sub === "add") {
      const symbol = String(parts[1] || "").trim().toUpperCase();
      const direction = normalizeDirection(parts[2]);
      const target = parseTargetPrice(parts[3]);

      if (!symbol || !direction || !target) {
        await ctx.reply("Usage: /alert add BTC above 70000\nOr: /alert add ETH below 2000");
        return;
      }

      const r = await createAlert({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol, direction, target });
      if (!r.ok) {
        await ctx.reply("Sorry, I couldn’t create that alert. Please try again.");
        return;
      }

      await ctx.reply(`Alert created: ${String(r.id).slice(0, 8)}`);
      return;
    }

    if (sub === "remove") {
      const id = String(parts[1] || "").trim();
      if (!id) {
        await ctx.reply("Usage: /alert remove <alertId>");
        return;
      }
      const r = await removeAlert({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, alertId: id });
      if (!r.ok) {
        await ctx.reply("I couldn’t remove that alert. Check the id and try again.");
        return;
      }
      await ctx.reply(r.removed ? "Alert removed." : "Alert not found.");
      return;
    }

    await ctx.reply("Usage:\n/alert add BTC above 70000\n/alert add ETH below 2000\n/alert remove <alertId>");
  });

  bot.callbackQuery(/^aa:([A-Z0-9]{1,15}):(above|below)$/, async (ctx) => {
    const userId = ctx.from?.id;
    await ctx.answerCallbackQuery();
    if (!userId) return;

    const symbol = String(ctx.match?.[1] || "").trim().toUpperCase();
    const direction = String(ctx.match?.[2] || "").trim().toLowerCase();

    if (!cfg.MONGODB_URI) {
      await ctx.reply("Alerts need a database connection.");
      return;
    }

    startAlertFlow({ userId, symbol, direction });
    await ctx.reply(`Send target price for ${symbol} (${direction}).\nExample: 70000\n\nYou can type cancel to stop.`);
  });
}
