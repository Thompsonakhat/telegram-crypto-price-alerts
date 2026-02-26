import { clearWatchlist } from "../services/watchlists.js";
import { clearAlerts } from "../services/alerts.js";

export default function register(bot, { cfg, log }) {
  bot.command("reset", async (ctx) => {
    const userId = ctx.from?.id;
    if (!cfg.MONGODB_URI) {
      await ctx.reply("Nothing to reset because MONGODB_URI is not set.");
      return;
    }
    if (!userId) {
      await ctx.reply("I couldn’t identify your user id.");
      return;
    }

    await clearWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId });
    await clearAlerts({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId });

    await ctx.reply("Done. Your watchlist and alerts were cleared.");
  });
}
