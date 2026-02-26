export default function register(bot) {
  bot.callbackQuery(/^menu:(price|watchlist|alerts|help)$/, async (ctx) => {
    const which = ctx.match?.[1];
    await ctx.answerCallbackQuery();

    if (which === "price") {
      await ctx.reply("Send /price <symbol> مثلا: /price BTC");
      return;
    }
    if (which === "watchlist") {
      await ctx.reply("Send /watchlist to view your watchlist.");
      return;
    }
    if (which === "alerts") {
      await ctx.reply("Send /alerts to view your alerts.");
      return;
    }
    if (which === "help") {
      await ctx.reply("Send /help to see all commands.");
      return;
    }
  });
}
