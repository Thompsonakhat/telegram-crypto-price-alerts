import { InlineKeyboard } from "grammy";
import { listAlerts, removeAlert } from "../services/alerts.js";
import { fmtUsd, shortId } from "../lib/format.js";

export default function register(bot, { cfg, log }) {
  bot.command("alerts", async (ctx) => {
    const userId = ctx.from?.id;
    if (!cfg.MONGODB_URI) {
      await ctx.reply("Alerts need a database connection. The bot is running in limited mode right now.");
      return;
    }
    if (!userId) {
      await ctx.reply("I couldn’t identify your user id.");
      return;
    }

    const r = await listAlerts({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId });
    if (!r.ok) {
      await ctx.reply("Sorry, I couldn’t load your alerts right now.");
      return;
    }

    if (r.alerts.length === 0) {
      await ctx.reply("You have no alerts. Example: /alert add BTC above 70000");
      return;
    }

    const lines = ["Your alerts:"];
    const kb = new InlineKeyboard();

    for (const a of r.alerts.slice(0, 30)) {
      const created = a.createdAt ? new Date(a.createdAt).toLocaleString() : "";
      const t = `${shortId(a.id)} | ${a.symbol} ${a.direction} ${fmtUsd(a.target)} | ${a.status}${created ? " | " + created : ""}`;
      lines.push(t);
      kb.text(`Remove ${shortId(a.id)}`, `ar:${a.id}`).row();
    }

    await ctx.reply(lines.join("\n"), { reply_markup: kb });
  });

  bot.callbackQuery(/^ar:([a-f0-9]{24})$/, async (ctx) => {
    const userId = ctx.from?.id;
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI || !userId) {
      await ctx.reply("Alerts need a database connection.");
      return;
    }

    const alertId = ctx.match?.[1];
    const r = await removeAlert({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, alertId });
    if (!r.ok) {
      await ctx.reply("I couldn’t remove that alert. It may already be gone.");
      return;
    }

    await ctx.reply(r.removed ? "Alert removed." : "Alert not found.");
  });
}
