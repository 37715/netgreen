export function formatMoney(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/** Compact money for tight spaces, e.g. £1.2k */
export function formatMoneyShort(amount: number, currency = "GBP"): string {
  const symbol = currency === "GBP" ? "£" : "";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`;
  }
  return `${sign}${symbol}${abs.toFixed(0)}`;
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(0)}%`;
}

/** Margin as a percentage of revenue. Returns null when there is no revenue. */
export function marginPercent(revenue: number, costs: number): number | null {
  if (revenue <= 0) return null;
  return ((revenue - costs) / revenue) * 100;
}

export function parseAmount(input: FormDataEntryValue | null): number {
  if (input == null) return 0;
  const n = parseFloat(String(input).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Total for hourly jobs: people × rate × hours. */
export function computeHourlyPrice(
  workers: number,
  hourlyRate: number,
  hours: number
): number {
  const w = Math.max(0, workers);
  const r = Math.max(0, hourlyRate);
  const h = Math.max(0, hours);
  return Math.round(w * r * h * 100) / 100;
}

export function formatHourlyBreakdown(
  workers: number,
  hourlyRate: number,
  hours: number
): string {
  const h =
    hours % 1 === 0
      ? String(hours)
      : hours.toFixed(2).replace(/\.?0+$/, "");
  return `${workers} × £${hourlyRate % 1 === 0 ? hourlyRate.toFixed(0) : hourlyRate} × ${h}h`;
}
