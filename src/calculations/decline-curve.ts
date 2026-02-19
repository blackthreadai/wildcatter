/**
 * Exponential decline curve fitting and projection.
 *
 * Model: q(t) = qi * exp(-D * t)
 * where qi = initial production rate, D = decline constant (per month), t = months
 */

export interface DeclineCurveResult {
  qi: number;           // initial rate (bbl or mcf per month)
  D: number;            // decline constant per month
  annualDeclineRate: number; // 1 - exp(-12*D)
  projectedMonths: { month: number; production: number }[];
}

/**
 * Fit exponential decline to production history and project future production.
 * @param productionValues Array of monthly production values (newest first — will be reversed internally)
 * @param projectionMonths Number of months to project forward (default 36)
 */
export function fitDeclineCurve(
  productionValues: number[],
  projectionMonths = 36
): DeclineCurveResult | null {
  // Need at least 3 data points
  const values = [...productionValues].reverse().filter((v) => v > 0);
  if (values.length < 3) return null;

  // Fit via linear regression on ln(q) vs t
  const n = values.length;
  const lnQ = values.map((v) => Math.log(v));
  const t = values.map((_, i) => i);

  const sumT = t.reduce((a, b) => a + b, 0);
  const sumLnQ = lnQ.reduce((a, b) => a + b, 0);
  const sumTLnQ = t.reduce((a, ti, i) => a + ti * lnQ[i], 0);
  const sumT2 = t.reduce((a, ti) => a + ti * ti, 0);

  const D = -(n * sumTLnQ - sumT * sumLnQ) / (n * sumT2 - sumT * sumT);
  const lnQi = (sumLnQ + D * sumT) / n;
  const qi = Math.exp(lnQi);

  if (!isFinite(D) || !isFinite(qi) || D < 0) return null;

  const annualDeclineRate = 1 - Math.exp(-12 * D);

  // Project future
  const lastT = n - 1;
  const projectedMonths = Array.from({ length: projectionMonths }, (_, i) => ({
    month: i + 1,
    production: Math.max(0, qi * Math.exp(-D * (lastT + i + 1))),
  }));

  return { qi, D, annualDeclineRate, projectedMonths };
}
