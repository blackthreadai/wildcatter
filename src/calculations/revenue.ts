/**
 * Revenue estimation.
 * Revenue = production volume × commodity price
 */

// Default benchmark prices (can be overridden)
const DEFAULT_PRICES: Record<string, number> = {
  oil: 75.0,   // $/bbl WTI benchmark
  gas: 3.50,   // $/mcf Henry Hub benchmark
  mining: 50,  // $/ton generic
};

export interface RevenueEstimate {
  monthlyRevenue: number;
  annualRevenue: number;
  priceUsed: number;
  commodity: string;
}

export function estimateRevenue(
  monthlyProduction: number,
  commodity: string,
  priceOverride?: number
): RevenueEstimate {
  const normalizedCommodity = commodity?.toLowerCase() || 'oil';
  const price = priceOverride ?? DEFAULT_PRICES[normalizedCommodity] ?? DEFAULT_PRICES.oil;
  const monthlyRevenue = monthlyProduction * price;

  return {
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
    priceUsed: price,
    commodity: normalizedCommodity,
  };
}
