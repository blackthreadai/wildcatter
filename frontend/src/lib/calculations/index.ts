import { fitDeclineCurve, DeclineCurveResult } from './decline-curve';
import { estimateRevenue, RevenueEstimate } from './revenue';
import { estimateCosts, CostEstimate } from './costs';
import { calculateRiskScore, RiskScoreResult } from './risk-score';

export { fitDeclineCurve, estimateRevenue, estimateCosts, calculateRiskScore };
export type { DeclineCurveResult, RevenueEstimate, CostEstimate, RiskScoreResult };

export interface CalculationResult {
  declineCurve: DeclineCurveResult | null;
  revenue: RevenueEstimate | null;
  costs: CostEstimate | null;
  riskScore: RiskScoreResult;
  estimated_revenue: number | null;
  estimated_operating_cost: number | null;
  estimated_net_cash_flow: number | null;
  as_of_date: string;
}

export function calculateAll(
  asset: {
    asset_type: string;
    commodity?: string | null;
    basin?: string | null;
    decline_rate?: number | null;
    spud_date?: Date | string | null;
    operator_compliance_flags?: string[];
  },
  productionHistory: Array<{
    oil_volume_bbl?: number | null;
    gas_volume_mcf?: number | null;
    ore_volume_tons?: number | null;
    water_cut_pct?: number | null;
  }>,
  priceOverride?: number
): CalculationResult {
  const productionValues = productionHistory.map((p) => {
    if (asset.asset_type === 'gas') return Number(p.gas_volume_mcf) || 0;
    if (asset.asset_type === 'mining') return Number(p.ore_volume_tons) || 0;
    return Number(p.oil_volume_bbl) || 0;
  });

  const declineCurve = fitDeclineCurve(productionValues);

  const latestProduction = productionValues[0] || 0;
  const commodity = asset.commodity || asset.asset_type;

  const revenue = latestProduction > 0
    ? estimateRevenue(latestProduction, commodity, priceOverride)
    : null;

  const costs = latestProduction > 0
    ? estimateCosts(latestProduction, asset.asset_type, asset.basin)
    : null;

  const latestWaterCut = productionHistory.length > 0
    ? Number(productionHistory[0].water_cut_pct) || null
    : null;

  const riskScore = calculateRiskScore({
    declineRate: declineCurve?.annualDeclineRate ?? asset.decline_rate ?? null,
    complianceFlags: asset.operator_compliance_flags || [],
    spudDate: asset.spud_date ?? null,
    waterCutPct: latestWaterCut,
  });

  const estimated_revenue = revenue?.monthlyRevenue ?? null;
  const estimated_operating_cost = costs?.monthlyCost ?? null;
  const estimated_net_cash_flow =
    estimated_revenue != null && estimated_operating_cost != null
      ? estimated_revenue - estimated_operating_cost
      : null;

  return {
    declineCurve,
    revenue,
    costs,
    riskScore,
    estimated_revenue,
    estimated_operating_cost,
    estimated_net_cash_flow,
    as_of_date: new Date().toISOString().split('T')[0],
  };
}
