export const cfg = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  MONGODB_URI: process.env.MONGODB_URI || "",

  COIN_API_BASE_URL: process.env.COIN_API_BASE_URL || "https://api.coingecko.com/api/v3",

  CACHE_TTL_MS: Number(process.env.CACHE_TTL_MS || 30_000),
  POLL_INTERVAL_MS: Number(process.env.POLL_INTERVAL_MS || 45_000),

  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
