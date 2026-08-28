import { computeWasteTotal } from "@/lib/money";

export type ResolvedWaste = {
  bags: number | null;
  pricePerBag: number | null;
  total: number;
};

/**
 * Work out a job's waste charge. Bags are what people actually remember to
 * type, so a missing price falls back to the business default instead of
 * throwing the bags away — losing them silently made waste income vanish.
 */
export function resolveWaste(
  bags: number,
  pricePerBag: number,
  fallbackPricePerBag: number
): ResolvedWaste {
  const b = Math.max(0, Math.round(bags));
  if (b <= 0) return { bags: null, pricePerBag: null, total: 0 };

  const typed = Math.max(0, pricePerBag);
  const price = typed > 0 ? typed : Math.max(0, fallbackPricePerBag);

  return { bags: b, pricePerBag: price, total: computeWasteTotal(b, price) };
}
