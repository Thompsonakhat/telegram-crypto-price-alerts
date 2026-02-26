export function fmtUsd(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "N/A";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  });
}

export function fmtPct(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "N/A";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export function shortId(hex) {
  const s = String(hex || "");
  return s.length <= 8 ? s : s.slice(0, 8);
}
