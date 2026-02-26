What this bot does
This Telegram bot lets you look up crypto prices, keep a watchlist, and set price alerts that notify you when a coin goes above or below a target price.

Public commands
1) /start
Shows a welcome message and a menu with inline buttons.

2) /help
Shows usage examples for prices, watchlists, and alerts.

3) /price <symbol>
Example: /price BTC
Replies with current price in USD, 24h percent change, and a timestamp. Includes inline buttons to add alerts and manage your watchlist.

4) /watchlist
Lists your saved symbols. Shows latest cached prices when available. Includes inline remove buttons.

5) /watchlist add <symbol>
Example: /watchlist add ETH
Adds the symbol to your watchlist.

6) /watchlist remove <symbol>
Example: /watchlist remove ETH
Removes the symbol from your watchlist.

7) /alerts
Lists your alerts with id, symbol, direction, target, and status. Includes inline remove buttons.

8) /alert add <symbol> above <price>
Example: /alert add BTC above 70000
Creates an alert that triggers when current price is greater than or equal to the target.

9) /alert add <symbol> below <price>
Example: /alert add ETH below 2000
Creates an alert that triggers when current price is less than or equal to the target.

10) /alert remove <alertId>
Example: /alert remove 3f9a12c1
Deletes the alert.

11) /reset
Clears your watchlist and alerts.

Inline buttons
1) Price Lookup: prompts you to use /price <symbol>
2) My Watchlist: opens your watchlist
3) My Alerts: opens your alerts
4) Add Alert ↑ / Add Alert ↓: starts an interactive flow. The bot asks you to send the target price next.
5) Add to Watchlist / Remove from Watchlist: toggles watchlist membership
6) Remove alert: deletes the selected alert

Alert behavior
1) Alerts are polling-based, so notifications may be delayed up to the polling interval.
2) Alerts trigger once and are kept for history by marking status=triggered and triggeredAt.
3) If the market data provider is down, the poller logs the error and continues on the next cycle.

Market data provider
Default provider is CoinGecko.
1) Base URL is configurable via COIN_API_BASE_URL.
2) Prices are cached per symbol for CACHE_TTL_MS to reduce rate-limited calls.
3) If the API fails and a cached value exists, the bot may show cached data with a stale note.

Environment variables
1) TELEGRAM_BOT_TOKEN (required)
2) MONGODB_URI (recommended for persistence)
3) COIN_API_BASE_URL (optional, default https://api.coingecko.com/api/v3)
4) CACHE_TTL_MS (optional, default 30000)
5) POLL_INTERVAL_MS (optional, default 45000)
6) LOG_LEVEL (optional, default info)

Database collections
1) users: { telegramUserId, createdAt, updatedAt }
2) watchlists: { telegramUserId, symbols:["BTC"], createdAt, updatedAt }
3) alerts: { telegramUserId, symbol, direction:"above"|"below", target:Number, status:"active"|"triggered", triggeredAt?, createdAt, updatedAt }
