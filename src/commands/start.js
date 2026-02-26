import { InlineKeyboard } from "grammy";
import { upsertUser } from "../services/users.js";

export default function register(bot, { cfg, log }) {
  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (userId) {
      await upsertUser({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, chatId });
    }

    const kb = new InlineKeyboard()
      .text("Price Lookup", "menu:price").row()
      .text("My Watchlist", "menu:watchlist").row()
      .text("My Alerts", "menu:alerts").row()
      .text("Help", "menu:help");

    const extra = cfg.MONGODB_URI ? "" : "\n\nNote: MONGODB_URI is not set, so watchlists and alerts are disabled.";

    await ctx.reply(
      "Welcome. I can look up crypto prices, manage a watchlist, and send price alerts.\n\nSymbols are simple tickers like BTC or ETH. Prices come from a market data provider." + extra,
      { reply_markup: kb }
    );
  });
}
