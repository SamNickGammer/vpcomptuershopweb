export type BulkPricingTier = {
  minQuantity: number;
  unitPrice: number; // paise
  freeShipping?: boolean;
  label?: string;
};

export type BulkPricingResolution = {
  unitPrice: number;
  matchedTier: BulkPricingTier | null;
  appliedFreeShipping: boolean;
};

export function normalizeBulkPricingTiers(
  tiers: BulkPricingTier[] | null | undefined
) {
  if (!tiers?.length) return [] as BulkPricingTier[];

  return [...tiers]
    .filter(
      (tier) =>
        Number.isFinite(tier.minQuantity) &&
        tier.minQuantity > 1 &&
        Number.isFinite(tier.unitPrice) &&
        tier.unitPrice >= 0
    )
    .map((tier) => ({
      minQuantity: Math.floor(tier.minQuantity),
      unitPrice: Math.round(tier.unitPrice),
      freeShipping: Boolean(tier.freeShipping),
      label: tier.label?.trim() || undefined,
    }))
    .sort((a, b) => a.minQuantity - b.minQuantity)
    .filter(
      (tier, index, arr) =>
        index === arr.findIndex((candidate) => candidate.minQuantity === tier.minQuantity)
    );
}

export function resolveBulkPricing(params: {
  basePrice: number;
  quantity: number;
  bulkPricing?: BulkPricingTier[] | null;
}): BulkPricingResolution {
  const quantity = Math.max(1, Math.floor(params.quantity));
  const tiers = normalizeBulkPricingTiers(params.bulkPricing);

  let matchedTier: BulkPricingTier | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity) {
      matchedTier = tier;
    }
  }

  return {
    unitPrice: matchedTier?.unitPrice ?? params.basePrice,
    matchedTier,
    appliedFreeShipping: Boolean(matchedTier?.freeShipping),
  };
}

export function getBulkPricingPreview(
  tiers: BulkPricingTier[] | null | undefined
) {
  const normalized = normalizeBulkPricingTiers(tiers);
  return normalized[0] || null;
}
