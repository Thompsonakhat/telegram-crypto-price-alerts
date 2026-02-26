import { safeErr } from "../lib/log.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

const DEFAULT_SYMBOL_MAP = {
  BTC: { id: "bitcoin", name: "Bitcoin" },
  ETH: { id: "ethereum", name: "Ethereum" },
  SOL: { id: "solana", name: "Solana" },
  BNB: { id: "binancecoin", name: "BNB" },
  XRP: { id: "ripple", name: "XRP" },
  ADA: { id: "cardano", name: "Cardano" },
  DOGE: { id: "dogecoin", name: "Dogecoin" },
  TRX: { id: "tron", name: "TRON" },
  TON: { id: "the-open-network", name: "Toncoin" },
  AVAX: { id: "avalanche-2", name: "Avalanche" },
  DOT: { id: "polkadot", name: "Polkadot" },
  LINK: { id: "chainlink", name: "Chainlink" },
  MATIC: { id: "matic-network", name: "Polygon" },
  POL: { id: "matic-network", name: "Polygon" },
  SHIB: { id: "shiba-inu", name: "Shiba Inu" },
  LTC: { id: "litecoin", name: "Litecoin" },
  BCH: { id: "bitcoin-cash", name: "Bitcoin Cash" },
  UNI: { id: "uniswap", name: "Uniswap" },
  ATOM: { id: "cosmos", name: "Cosmos" },
  NEAR: { id: "near", name: "NEAR" },
};

export class MarketDataService {
  constructor({ baseUrl, cacheTtlMs, log }) {
    this.baseUrl = String(baseUrl || "https://api.coingecko.com/api/v3").replace(/\/+$/, "");
    this.cacheTtlMs = Number.isFinite(cacheTtlMs) && cacheTtlMs > 0 ? cacheTtlMs : 30_000;
    this.log = log;

    this.priceCache = new Map();
    this.inflight = new Map();

    this.symbolMap = new Map(Object.entries(DEFAULT_SYMBOL_MAP).map(([sym, v]) => [sym, v]));
    this.symbolMapFetchedAt = 0;
  }

  async getQuoteBySymbol(symbol, { allowStale = true } = {}) {
    const sym = normalizeSymbol(symbol);
    if (!sym) return { ok: false, reason: "missing_symbol" };

    const mapping = await this.resolveSymbol(sym);
    if (!mapping) return { ok: false, reason: "unknown_symbol", symbol: sym };

    return this.getQuoteByCoinId(mapping.id, { symbol: sym, name: mapping.name, allowStale });
  }

  async resolveSymbol(sym) {
    const known = this.symbolMap.get(sym);
    if (known) return known;

    await this.refreshSymbolMapIfNeeded();
    return this.symbolMap.get(sym) || null;
  }

  async refreshSymbolMapIfNeeded() {
    const now = Date.now();
    const maxAge = 6 * 60 * 60 * 1000;
    if (this.symbolMapFetchedAt && now - this.symbolMapFetchedAt < maxAge) return;

    const url = `${this.baseUrl}/coins/list?include_platform=false`;
    this.log?.info("market symbol map fetch start", { urlHost: safeHost(this.baseUrl) });

    try {
      const r = await fetch(url, { headers: { "accept": "application/json" }, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`HTTP_${r.status}`);
      const rows = await r.json();
      if (!Array.isArray(rows)) throw new Error("BAD_RESPONSE");

      const next = new Map(this.symbolMap);
      for (const row of rows) {
        const s = String(row?.symbol || "").trim().toUpperCase();
        const id = String(row?.id || "").trim();
        const name = String(row?.name || "").trim();
        if (!s || !id) continue;
        if (!next.has(s)) next.set(s, { id, name: name || s });
      }

      this.symbolMap = next;
      this.symbolMapFetchedAt = now;
      this.log?.info("market symbol map fetch ok", { symbols: this.symbolMap.size });
    } catch (e) {
      this.log?.warn("market symbol map fetch failed", { err: safeErr(e) });
      this.symbolMapFetchedAt = now;
    }
  }

  async getQuoteByCoinId(coinId, { symbol, name, allowStale }) {
    const key = `cg:${coinId}:usd`;
    const now = Date.now();
    const cached = this.priceCache.get(key);

    if (cached && cached.expiresAt > now) {
      return { ok: true, ...cached.value, source: "cache", stale: false };
    }

    if (this.inflight.has(key)) {
      try {
        const v = await this.inflight.get(key);
        return v;
      } catch {
        // fall through
      }
    }

    const p = this._fetchCoinGeckoQuote(coinId, { symbol, name, allowStale, cached });
    this.inflight.set(key, p);
    try {
      return await p;
    } finally {
      this.inflight.delete(key);
    }
  }

  async _fetchCoinGeckoQuote(coinId, { symbol, name, allowStale, cached }) {
    const url = `${this.baseUrl}/simple/price?ids=${encodeURIComponent(String(coinId))}&vs_currencies=usd&include_24hr_change=true`;

    this.log?.info("market quote fetch start", { coinId, symbol, urlHost: safeHost(this.baseUrl) });

    try {
      const started = Date.now();
      const r = await fetch(url, { headers: { "accept": "application/json" }, signal: AbortSignal.timeout(10_000) });
      const ms = Date.now() - started;

      if (!r.ok) throw new Error(`HTTP_${r.status}`);
      const json = await r.json();

      const row = json?.[coinId];
      const price = Number(row?.usd);
      const change = Number(row?.usd_24h_change);

      if (!Number.isFinite(price)) throw new Error("BAD_PRICE");

      const value = {
        coinId,
        name: String(name || "") || null,
        symbol: String(symbol || "") || null,
        priceUsd: price,
        change24hPct: Number.isFinite(change) ? change : null,
        ts: new Date(),
      };

      this.priceCache.set(`cg:${coinId}:usd`, {
        value,
        expiresAt: Date.now() + this.cacheTtlMs,
        fetchedAt: Date.now(),
      });

      this.log?.info("market quote fetch ok", { coinId, symbol, ms });
      return { ok: true, ...value, source: "api", stale: false };
    } catch (e) {
      const errMsg = safeErr(e);
      this.log?.warn("market quote fetch failed", { coinId, symbol, err: errMsg });

      if (allowStale && cached?.value) {
        const ageMs = Date.now() - (cached.fetchedAt || 0);
        return { ok: true, ...cached.value, source: "cache", stale: true, staleAgeMs: ageMs };
      }

      return { ok: false, reason: "api_down", coinId, symbol };
    }
  }

  async getQuotesForSymbols(symbols) {
    const out = new Map();
    const unique = [...new Set((symbols || []).map(normalizeSymbol).filter(Boolean))];

    for (const sym of unique) {
      const r = await this.getQuoteBySymbol(sym, { allowStale: true });
      out.set(sym, r);
      await sleep(0);
    }
    return out;
  }
}

function safeHost(baseUrl) {
  try {
    const u = new URL(String(baseUrl));
    return u.host;
  } catch {
    return "";
  }
}
