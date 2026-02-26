import { addToWatchlist, removeFromWatchlist, hasInWatchlist } from "../services/watchlists.js";

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

export default function register(bot, { cfg, log }) {
  bot.callbackQuery(/^wt:([A-Z0-9]{1,15})$/, async (ctx) => {
    const userId = ctx.from?.id;
    const sym = normalizeSymbol(ctx.match?.[1]);
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI || !userId) {
      await ctx.reply("Watchlists need a database connection.");
      return;
    }

    const h = await hasInWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
    if (h.ok && h.has) {
      await removeFromWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
      await ctx.reply(`Removed ${sym} from your watchlist.`);
      return;
    }

    await addToWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
    await ctx.reply(`Added ${sym} to your watchlist.`);
  });
}
