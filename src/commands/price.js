import { InlineKeyboard } from "grammy";
import { fmtUsd, fmtPct } from "../lib/format.js";
import { hasInWatchlist } from "../services/watchlists.js";

const API_DOWN_FALLBACK = "Market data is temporarily unavailable. Please try again later.";

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

export default function register(bot, { cfg, log, market }) {
  bot.command("price", async (ctx) => {
    const userId = ctx.from?.id;
    const raw = ctx.match;
    const sym = normalizeSymbol(raw);

    if (!sym) {
      await ctx.reply("Usage: /price BTC");
      return;
    }

    const q = await market.getQuoteBySymbol(sym, { allowStale: true });

    if (!q.ok) {
      if (q.reason === "unknown_symbol") {
        await ctx.reply(`I don’t recognize the symbol ${sym}. Try something like BTC, ETH, or SOL.`);
        return;
      }
      await ctx.reply(API_DOWN_FALLBACK);
      return;
    }

    let watch = { ok: false, has: false };
    if (cfg.MONGODB_URI && userId) {
      watch = await hasInWatchlist({ mongoUri: cfg.MONGODB_URI, log, telegramUserId: userId, symbol: sym });
    }

    const staleNote = q.stale ? "\n\nNote: showing cached data (API may be down)." : "";
    const ts = q.ts ? new Date(q.ts) : new Date();

    const lines = [
      `${q.name || sym} (${sym})`,
      `Price: ${fmtUsd(q.priceUsd)}`,
      `24h: ${q.change24hPct == null ? "N/A" : fmtPct(q.change24hPct)}`,
      `As of: ${ts.toLocaleString()}`,
    ];

    const kb = new InlineKeyboard();
    kb.text("Add Alert ↑", `aa:${sym}:above`).text("Add Alert ↓", `aa:${sym}:below`).row();

    if (cfg.MONGODB_URI && userId) {
      kb.text(watch.ok && watch.has ? "Remove from Watchlist" : "Add to Watchlist", `wt:${sym}`).row();
    }

    kb.text("View Watchlist", "menu:watchlist").text("View Alerts", "menu:alerts");

    await ctx.reply(lines.join("\n") + staleNote, { reply_markup: kb });
  });

  bot.callbackQuery(/^px:([A-Z0-9]{1,15})$/, async (ctx) => {
    const sym = normalizeSymbol(ctx.match?.[1]);
    await ctx.answerCallbackQuery();
    await ctx.reply(`/price ${sym}`);
  });
}
