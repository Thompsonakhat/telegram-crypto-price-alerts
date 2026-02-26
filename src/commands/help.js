export default function register(bot) {
  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "Commands and examples:",
        "/price BTC",
        "/watchlist",
        "/watchlist add BTC",
        "/watchlist remove BTC",
        "/alerts",
        "/alert add BTC above 70000",
        "/alert add ETH below 2000",
        "/alert remove <alertId>",
        "",
        "Alerts are polling-based. A notification is sent when the target is hit, and it can be delayed by the polling interval.",
      ].join("\n")
    );
  });
}
