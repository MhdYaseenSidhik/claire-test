import type { Customer, Dataset, SalesWeek } from "../data/types";

/** Churn and revenue-risk rollup for a single region. */
export interface RegionRisk {
  region: string;
  customers: number;
  churned: number;
  /** Churn rate as a fraction 0..1 */
  churnRate: number;
  /** Total MRR of churned customers in this region, whole currency units */
  mrrAtRisk: number;
  /** Total MRR across all customers in this region */
  totalMrr: number;
}

/** A single narrative finding surfaced in the Insights section. */
export interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "critical";
}

/**
 * Roll customers up by region into churn/revenue-risk rows, sorted by
 * MRR at risk descending so the region leaking the most revenue is first.
 * Ties break on churn rate, then region name, for a stable order.
 */
export function regionRisk(customers: Customer[]): RegionRisk[] {
  const byRegion = new Map<string, RegionRisk>();
  for (const c of customers) {
    const row =
      byRegion.get(c.region) ??
      {
        region: c.region,
        customers: 0,
        churned: 0,
        churnRate: 0,
        mrrAtRisk: 0,
        totalMrr: 0,
      };
    row.customers += 1;
    row.totalMrr += c.mrr;
    if (c.churned === 1) {
      row.churned += 1;
      row.mrrAtRisk += c.mrr;
    }
    byRegion.set(c.region, row);
  }
  const rows = [...byRegion.values()].map((r) => ({
    ...r,
    churnRate: r.customers > 0 ? r.churned / r.customers : 0,
  }));
  rows.sort(
    (a, b) =>
      b.mrrAtRisk - a.mrrAtRisk ||
      b.churnRate - a.churnRate ||
      a.region.localeCompare(b.region),
  );
  return rows;
}

/** Overall churn rate as a fraction 0..1 across all customers. */
export function overallChurnRate(customers: Customer[]): number {
  if (customers.length === 0) return 0;
  const churned = customers.filter((c) => c.churned === 1).length;
  return churned / customers.length;
}

/** Total MRR of churned customers, whole currency units. */
export function totalMrrAtRisk(customers: Customer[]): number {
  return customers
    .filter((c) => c.churned === 1)
    .reduce((sum, c) => sum + c.mrr, 0);
}

/**
 * Compare mean tenure of churned vs retained customers. A negative gap
 * (churned customers have shorter tenure) is the common early-churn signal.
 * Returns null when either group is empty.
 */
export function tenureChurnGap(
  customers: Customer[],
): { churnedMean: number; retainedMean: number; gap: number } | null {
  const churned = customers.filter((c) => c.churned === 1);
  const retained = customers.filter((c) => c.churned === 0);
  if (churned.length === 0 || retained.length === 0) return null;
  const mean = (rows: Customer[]) =>
    rows.reduce((s, c) => s + c.tenure_months, 0) / rows.length;
  const churnedMean = mean(churned);
  const retainedMean = mean(retained);
  return { churnedMean, retainedMean, gap: churnedMean - retainedMean };
}

/**
 * Direction and magnitude of the revenue trend, comparing the mean weekly
 * total revenue of the first half of the observed weeks to the last half.
 * Returns null when there are fewer than two distinct weeks.
 */
export function revenueTrend(
  sales: SalesWeek[],
): { firstHalf: number; lastHalf: number; changePct: number } | null {
  const byWeek = new Map<string, number>();
  for (const s of sales) {
    byWeek.set(s.week, (byWeek.get(s.week) ?? 0) + s.revenue);
  }
  const weeks = [...byWeek.keys()].sort();
  if (weeks.length < 2) return null;
  const mid = Math.floor(weeks.length / 2);
  const totals = weeks.map((w) => byWeek.get(w) ?? 0);
  const mean = (xs: number[]) =>
    xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const firstHalf = mean(totals.slice(0, mid));
  const lastHalf = mean(totals.slice(mid));
  const changePct = firstHalf > 0 ? ((lastHalf - firstHalf) / firstHalf) * 100 : 0;
  return { firstHalf, lastHalf, changePct };
}

/**
 * Derive the narrative insights shown in the Insights section from the
 * full dataset. Pure and deterministic so it can be unit-tested.
 */
export function deriveInsights(data: Dataset): Insight[] {
  const { sales, customers } = data;
  const insights: Insight[] = [];

  const risk = regionRisk(customers);
  if (risk.length > 0) {
    const worst = risk[0];
    insights.push({
      id: "top-region-risk",
      title: `${worst.region} carries the most revenue at risk`,
      detail: `${worst.region} has ${(worst.churnRate * 100).toFixed(1)}% churn across ${worst.customers} customers, with ${fmtCurrency(worst.mrrAtRisk)} of monthly recurring revenue in churned accounts.`,
      severity: worst.churnRate >= 0.3 ? "critical" : "warn",
    });
  }

  const overall = overallChurnRate(customers);
  const atRisk = totalMrrAtRisk(customers);
  if (customers.length > 0) {
    insights.push({
      id: "overall-churn",
      title: `Overall churn is ${(overall * 100).toFixed(1)}%`,
      detail: `${customers.filter((c) => c.churned === 1).length} of ${customers.length} customers have churned, representing ${fmtCurrency(atRisk)} in lost monthly recurring revenue.`,
      severity: overall >= 0.25 ? "warn" : "info",
    });
  }

  const tenure = tenureChurnGap(customers);
  if (tenure) {
    const shorter = tenure.gap < 0;
    insights.push({
      id: "tenure-gap",
      title: shorter
        ? "Churn concentrates in newer accounts"
        : "Churn is not tenure-driven",
      detail: shorter
        ? `Churned customers average ${tenure.churnedMean.toFixed(1)} months tenure versus ${tenure.retainedMean.toFixed(1)} for retained — an onboarding and early-life retention signal.`
        : `Churned customers average ${tenure.churnedMean.toFixed(1)} months tenure versus ${tenure.retainedMean.toFixed(1)} for retained, so tenure alone does not explain churn.`,
      severity: "info",
    });
  }

  const trend = revenueTrend(sales);
  if (trend) {
    const up = trend.changePct >= 0;
    insights.push({
      id: "revenue-trend",
      title: up
        ? `Weekly revenue is trending up ${trend.changePct.toFixed(1)}%`
        : `Weekly revenue is trending down ${Math.abs(trend.changePct).toFixed(1)}%`,
      detail: `Mean weekly revenue moved from ${fmtCurrency(trend.firstHalf)} in the first half of the window to ${fmtCurrency(trend.lastHalf)} in the second.`,
      severity: up ? "info" : "warn",
    });
  }

  return insights;
}

/** Shared currency formatter used across the Risk and Insights sections. */
export function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
