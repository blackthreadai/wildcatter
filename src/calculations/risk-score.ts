/**
 * Rule-based risk score calculation.
 * Score: 0 (low risk) to 100 (high risk)
 *
 * Factors:
 *   - Decline rate (higher = riskier)
 *   - Operator compliance flags (more flags = riskier)
 *   - Asset age (older = riskier)
 *   - Water cut percentage (higher = riskier)
 */

export interface RiskScoreResult {
  totalScore: number;
  factors: {
    declineRate: number;
    compliance: number;
    assetAge: number;
    waterCut: number;
  };
}

export function calculateRiskScore(params: {
  declineRate: number | null;
  complianceFlags: string[];
  spudDate: Date | string | null;
  waterCutPct: number | null;
}): RiskScoreResult {
  // Decline rate factor (0-30 points)
  // Annual decline > 30% is high risk
  let declineScore = 0;
  if (params.declineRate != null) {
    declineScore = Math.min(30, (params.declineRate / 0.50) * 30);
  }

  // Compliance factor (0-25 points)
  // Each flag adds 5 points, max 25
  const complianceScore = Math.min(25, (params.complianceFlags?.length || 0) * 5);

  // Asset age factor (0-25 points)
  // > 20 years = max risk
  let ageScore = 0;
  if (params.spudDate) {
    const ageYears = (Date.now() - new Date(params.spudDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    ageScore = Math.min(25, (ageYears / 20) * 25);
  }

  // Water cut factor (0-20 points)
  // > 80% water cut = max risk
  let waterCutScore = 0;
  if (params.waterCutPct != null) {
    waterCutScore = Math.min(20, (params.waterCutPct / 80) * 20);
  }

  const totalScore = Math.round(declineScore + complianceScore + ageScore + waterCutScore);

  return {
    totalScore: Math.min(100, totalScore),
    factors: {
      declineRate: Math.round(declineScore),
      compliance: Math.round(complianceScore),
      assetAge: Math.round(ageScore),
      waterCut: Math.round(waterCutScore),
    },
  };
}
