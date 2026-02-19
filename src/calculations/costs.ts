/**
 * Operating cost estimation using static benchmarks by asset type and region.
 */

// $/bbl or $/mcf or $/ton operating cost benchmarks
const COST_BENCHMARKS: Record<string, Record<string, number>> = {
  oil: {
    default: 15.0,
    'permian basin': 12.0,
    'eagle ford': 14.0,
    'bakken': 18.0,
    'midcontinent': 16.0,
  },
  gas: {
    default: 1.20,
    'marcellus': 0.90,
    'haynesville': 1.10,
    'permian basin': 1.00,
  },
  mining: {
    default: 25.0,
  },
  energy: {
    default: 10.0,
  },
};

export interface CostEstimate {
  monthlyCost: number;
  annualCost: number;
  costPerUnit: number;
  assetType: string;
  basin: string;
}

export function estimateCosts(
  monthlyProduction: number,
  assetType: string,
  basin?: string | null
): CostEstimate {
  const typeKey = assetType?.toLowerCase() || 'oil';
  const basinKey = basin?.toLowerCase() || 'default';
  const benchmarks = COST_BENCHMARKS[typeKey] || COST_BENCHMARKS.oil;
  const costPerUnit = benchmarks[basinKey] ?? benchmarks.default;
  const monthlyCost = monthlyProduction * costPerUnit;

  return {
    monthlyCost,
    annualCost: monthlyCost * 12,
    costPerUnit,
    assetType: typeKey,
    basin: basin || 'default',
  };
}
