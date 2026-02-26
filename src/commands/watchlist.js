import { InlineKeyboard } from "grammy";
import { getWatchlist, addToWatchlist, removeFromWatchlist, clearWatchlist } from "../services/watchlists.js";
import { fmtUsd, fmtPct } from "../lib/format.js";

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

export default function register(bot, { cfg, log, market }) {
  bot.command("watchlist", async (ctx) => {
    const userId = ctx.from?.id;
    if (!cfg.MONGODB_URI) {
      await ctx.reply("Watchlists need a database connection. The bot is running in limited mode right now.");
      return;
    }
    if (!userId) {
      await ctx.reply("I couldn’t identify your user id.");
      return;
    }

    const parts = String(ctx.match || "").trim().split(/\s+/).filter(Boolean);
    const sub = String(parts[0] || "").toLowerCase();

    if (sub === "add") {
      const sym = normalizeSymbol(parts[1]);
      if (!sym) {
        await ctx.reply("Usage: /watchlist add BTC");
        return;
      }
      const r = await addToWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
      if (!r.ok) {
        await ctx.reply("Sorry, I couldn’t update your watchlist. Please try again.");
        return;
      }
      await ctx.reply(`Added ${sym} to your watchlist.`);
      await showWatchlist(ctx, { cfg, log, market, userId });
      return;
    }

    if (sub === "remove") {
      const sym = normalizeSymbol(parts[1]);
      if (!sym) {
        await ctx.reply("Usage: /watchlist remove BTC");
        return;
      }
      const r = await removeFromWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
      if (!r.ok) {
        await ctx.reply("Sorry, I couldn’t update your watchlist. Please try again.");
        return;
      }
      await ctx.reply(`Removed ${sym} from your watchlist.`);
      await showWatchlist(ctx, { cfg, log, market, userId });
      return;
    }

    await showWatchlist(ctx, { cfg, log, market, userId });
  });

  bot.callbackQuery(/^wr:([A-Z0-9]{1,15})$/, async (ctx) => {
    const userId = ctx.from?.id;
    const sym = normalizeSymbol(ctx.match?.[1]);
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI || !userId) {
      await ctx.reply("Watchlists need a database connection.");
      return;
    }

    await removeFromWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
    await ctx.reply(`Removed ${sym} from your watchlist.`);
  });

  bot.callbackQuery(/^wc$/, async (ctx) => {
    const userId = ctx.from?.id;
    await ctx.answerCallbackQuery();

    if (!cfg.MONGODB_URI || !userId) {
      await ctx.reply("Watchlists need a database connection.");
      return;
    }

    await clearWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId });
    await ctx.reply("Watchlist cleared.");
  });
}

async function showWatchlist(ctx, { cfg, log, market, userId }) {
  const wl = await getWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId });
  if (!wl.ok) {
    await ctx.reply("Sorry, I couldn’t load your watchlist right now.");
    return;
  }

  if (wl.symbols.length === 0) {
    await ctx.reply("Your watchlist is empty. Add one with /watchlist add BTC.");
    return;
  }

  const quotes = await market.getQuotesForSymbols(wl.symbols);

  const lines = ["Your watchlist:"];
  for (const sym of wl.symbols) {
    const q = quotes.get(sym);
    if (q?.ok) {
      const change = q.change24hPct == null ? "" : ` (${fmtPct(q.change24hPct)})`;
      const stale = q.stale ? " [cached]" : "";
      lines.push(`${sym}: ${fmtUsd(q.priceUsd)}${change}${stale}`);
    } else {
      lines.push(`${sym}: (no data right now)`);
    }
  }

  const kb = new InlineKeyboard();
  for (const sym of wl.symbols.slice(0, 20)) {
    kb.text(`Remove ${sym}`, `wr:${sym}`).row();
  }
  kb.text("Clear", "wc");

  await ctx.reply(lines.join("\n"), { reply_markup: kb });
}
