export interface CartItem {
  serviceId?: string | null;
  price: number;
}

export interface PromotionServiceEntry {
  serviceId: string;
  role: string;
}

export interface ActivePromotion {
  id: string;
  name: string;
  type: "SERVICE_DISCOUNT" | "BUY_X_GET_Y" | "COMBO";
  discountType: "PERCENTAGE" | "FIXED" | null;
  discountValue: number | null;
  buyQuantity: number;
  getQuantity: number;
  services: PromotionServiceEntry[];
}

export interface AppliedPromotion {
  promotionId: string;
  promotionName: string;
  discountAmount: number;
  detail: string;
}

export interface PromotionResult {
  applied: AppliedPromotion[];
  totalDiscount: number;
  effectiveSubtotal: number;
}

function applyServiceDiscount(promo: ActivePromotion, items: CartItem[]): AppliedPromotion | null {
  if (!promo.discountType || promo.discountValue == null) return null;
  const serviceIds = new Set(promo.services.map((s) => s.serviceId));
  const matching = items.filter((i) => i.serviceId && serviceIds.has(i.serviceId));
  if (!matching.length) return null;

  const discount = matching.reduce((sum, item) => {
    const d = promo.discountType === "PERCENTAGE"
      ? (item.price * promo.discountValue!) / 100
      : Math.min(item.price, promo.discountValue!);
    return sum + d;
  }, 0);
  if (discount <= 0) return null;

  const label = promo.discountType === "PERCENTAGE"
    ? `${promo.discountValue}% off en ${matching.length} servicio(s)`
    : `$${promo.discountValue} off en ${matching.length} servicio(s)`;

  return { promotionId: promo.id, promotionName: promo.name, discountAmount: discount, detail: label };
}

function applyBuyXGetY(promo: ActivePromotion, items: CartItem[]): AppliedPromotion | null {
  // Rule applies per service independently — the SAME service must repeat N times
  let totalDiscount = 0;
  let totalFreeCount = 0;

  for (const { serviceId } of promo.services) {
    const matching = items.filter((i) => i.serviceId === serviceId);
    if (matching.length < promo.buyQuantity) continue;

    // Sort descending — cheapest items in each group are free
    const sorted = [...matching].sort((a, b) => b.price - a.price);
    const numGroups = Math.floor(sorted.length / promo.buyQuantity);

    for (let g = 0; g < numGroups; g++) {
      const groupStart = g * promo.buyQuantity;
      // Last getQuantity items in each group are free
      const freeStart = groupStart + (promo.buyQuantity - promo.getQuantity);
      for (let j = freeStart; j < groupStart + promo.buyQuantity; j++) {
        totalDiscount += sorted[j].price;
        totalFreeCount++;
      }
    }
  }

  if (totalDiscount <= 0) return null;

  return {
    promotionId: promo.id,
    promotionName: promo.name,
    discountAmount: totalDiscount,
    detail: `${totalFreeCount} servicio(s) gratis (regla ${promo.buyQuantity}×${promo.getQuantity})`,
  };
}

function applyCombo(promo: ActivePromotion, items: CartItem[]): AppliedPromotion | null {
  if (!promo.discountType || promo.discountValue == null) return null;
  if (!promo.services.length) return null;

  // ALL services in the combo must appear in the cart — consume first occurrence of each
  const usedIndices = new Set<number>();
  const matchedItems: CartItem[] = [];

  for (const { serviceId } of promo.services) {
    const idx = items.findIndex((item, i) => item.serviceId === serviceId && !usedIndices.has(i));
    if (idx === -1) return null; // missing a required service
    usedIndices.add(idx);
    matchedItems.push(items[idx]);
  }

  const comboSum = matchedItems.reduce((s, i) => s + i.price, 0);
  const discount = promo.discountType === "PERCENTAGE"
    ? (comboSum * promo.discountValue) / 100
    : Math.min(comboSum, promo.discountValue);

  if (discount <= 0) return null;

  const label = promo.discountType === "PERCENTAGE"
    ? `Combo ${promo.discountValue}% off (${matchedItems.length} servicios = $${comboSum.toLocaleString()})`
    : `Combo $${promo.discountValue} off en combinación de ${matchedItems.length} servicio(s)`;

  return { promotionId: promo.id, promotionName: promo.name, discountAmount: discount, detail: label };
}

export function applyPromotions(items: CartItem[], promotions: ActivePromotion[]): PromotionResult {
  const originalSubtotal = items.reduce((s, i) => s + i.price, 0);
  const applied: AppliedPromotion[] = [];

  for (const promo of promotions) {
    let result: AppliedPromotion | null = null;
    if (promo.type === "SERVICE_DISCOUNT") result = applyServiceDiscount(promo, items);
    else if (promo.type === "BUY_X_GET_Y") result = applyBuyXGetY(promo, items);
    else if (promo.type === "COMBO") result = applyCombo(promo, items);
    if (result) applied.push(result);
  }

  const totalDiscount = applied.reduce((s, a) => s + a.discountAmount, 0);
  return {
    applied,
    totalDiscount,
    effectiveSubtotal: Math.max(0, originalSubtotal - totalDiscount),
  };
}
