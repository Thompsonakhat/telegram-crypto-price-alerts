export function buildBotProfile() {
  return [
    "Purpose: Crypto price lookup, personal watchlists, and polling-based price alerts with Telegram notifications.",
    "Commands:",
    "1) /start - Welcome + buttons for common actions",
    "2) /help - Command list and examples",
    "3) /price <symbol> - Current USD price and 24h change (e.g., /price BTC)",
    "4) /watchlist - List watchlist",
    "5) /watchlist add <symbol> - Add to watchlist",
    "6) /watchlist remove <symbol> - Remove from watchlist",
    "7) /alerts - List alerts",
    "8) /alert add <symbol> above <price> - Create alert",
    "9) /alert add <symbol> below <price> - Create alert",
    "10) /alert remove <alertId> - Remove alert",
    "Rules:",
    "1) Alerts are polling-based so notifications can be delayed by the polling interval.",
    "2) If market data is unavailable, replies use a consistent fallback message.",
  ].join("\n");
}
