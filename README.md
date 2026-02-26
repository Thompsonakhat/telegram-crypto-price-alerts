This is a Telegram bot (grammY) for crypto price lookup, watchlists, and polling-based price alerts.

Features
1) /price BTC shows current USD price and 24h change
2) Watchlist: /watchlist, /watchlist add BTC, /watchlist remove BTC
3) Alerts: /alerts, /alert add BTC above 70000, /alert remove <alertId>
4) Inline buttons for common actions (add/remove watchlist, remove alerts, start add-alert flow)
5) Reliability: caching, grouping alert checks by symbol, graceful API-down fallback

Architecture
1) src/index.js: boot, env sanity, long polling runner, webhook cleanup
2) src/bot.js: grammY wiring, command registration, callbacks, interactive flows
3) src/services/marketData.js: CoinGecko market data + caching
4) src/services/watchlists.js: Mongo watchlist operations
5) src/services/alerts.js: Mongo alert operations + evaluation helpers
6) src/jobs/alertPoller.js: polling loop that triggers notifications
7) src/lib/db.js: Mongo singleton and indexes
8) src/lib/log.js: structured, production-safe logs + safeErr()

Setup
1) Create a Telegram bot token with BotFather.
2) Copy .env.sample to .env and fill values.
3) Install deps: npm run install:root
4) Run locally: npm run dev

Environment variables
1) TELEGRAM_BOT_TOKEN (required): Telegram bot token
2) MONGODB_URI (optional but recommended): MongoDB connection string for users/watchlists/alerts
3) COIN_API_BASE_URL (optional): market data base URL (default: https://api.coingecko.com/api/v3)
4) CACHE_TTL_MS (optional): price cache ttl (default: 30000)
5) POLL_INTERVAL_MS (optional): alert polling interval (default: 45000)
6) LOG_LEVEL (optional): debug|info|warn|error (default: info)

Commands (examples)
1) /start
2) /help
3) /price BTC
4) /watchlist
5) /watchlist add BTC
6) /watchlist remove BTC
7) /alerts
8) /alert add BTC above 70000
9) /alert add ETH below 2000
10) /alert remove <alertId>
11) /reset (clear your stored watchlist and alerts)

Deployment notes (Render)
1) Use a Background Worker (or any always-on Node service).
2) Set TELEGRAM_BOT_TOKEN.
3) Set MONGODB_URI for persistence.
4) Build command should run: npm run build
5) Start command: npm start

Troubleshooting
1) If the bot starts but doesn’t respond, verify TELEGRAM_BOT_TOKEN is set.
2) If alerts don’t trigger, check logs for poller cycles and market API failures.
3) If market API is down, /price will return a consistent fallback message.
