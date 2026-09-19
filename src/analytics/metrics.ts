// Pure aggregation helpers over the loaded Dataset. Kept free of React so the
// section components stay thin and these can be unit-tested directly.

import type { Dataset, SalesWeek } from "../data/types";

export interface OverviewMetrics {
  totalRevenue: number;
  totalOrders: number;
  weeks: number;
  regions: number;
  avgWeeklyRevenue: number;
  newCustomers: number;
  churnRate: number;
}

/** Headline KPIs for the Overview section. */
export function overviewMetrics(data: Dataset): OverviewMetrics {
  const { sales, customers } = data;
  const totalRevenue = sales.reduce((a, r) => a + r.revenue, 0);
  const totalOrders = sales.reduce((a, r) => a + r.orders, 0);
  const newCustomers = sales.reduce((a, r) => a + r.new_customers, 0);
  const weeks = new Set(sales.map((r) => r.week)).size;
  const regions = new Set(sales.map((r) => r.region)).size;
  const churned = customers.filter((c) => c.churned === 1).length;
  const churnRate = customers.length ? (churned / customers.length) * 100 : 0;
  return {
    totalRevenue,
    totalOrders,
    weeks,
    regions,
    avgWeeklyRevenue: weeks ? totalRevenue / weeks : 0,
    newCustomers,
    churnRate,
  };
}

export interface WeeklyTotal {
  week: string;
  revenue: number;
  orders: number;
}

/** Revenue and orders summed across regions, one point per week, sorted by week. */
export function weeklyTotals(sales: SalesWeek[]): WeeklyTotal[] {
  const byWeek = new Map<string, WeeklyTotal>();
  for (const r of sales) {
    const cur = byWeek.get(r.week) ?? { week: r.week, revenue: 0, orders: 0 };
    cur.revenue += r.revenue;
    cur.orders += r.orders;
    byWeek.set(r.week, cur);
  }
  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export interface RegionTotal {
  region: string;
  revenue: number;
  orders: number;
  share: number;
}

/** Revenue and orders per region, with each region's share of total revenue. */
export function regionTotals(sales: SalesWeek[]): RegionTotal[] {
  const byRegion = new Map<string, { revenue: number; orders: number }>();
  for (const r of sales) {
    const cur = byRegion.get(r.region) ?? { revenue: 0, orders: 0 };
    cur.revenue += r.revenue;
    cur.orders += r.orders;
    byRegion.set(r.region, cur);
  }
  const total = [...byRegion.values()].reduce((a, r) => a + r.revenue, 0);
  return [...byRegion.entries()]
    .map(([region, v]) => ({
      region,
      revenue: v.revenue,
      orders: v.orders,
      share: total ? (v.revenue / total) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || a.region.localeCompare(b.region));
}

/** Distinct region names in stable, alphabetical order. */
export function regionNames(sales: SalesWeek[]): string[] {
  return [...new Set(sales.map((r) => r.region))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Filter sales rows to a single region, or return all when region is null. */
export function filterByRegion(
  sales: SalesWeek[],
  region: string | null,
): SalesWeek[] {
  return region == null ? sales : sales.filter((r) => r.region === region);
}

/** Whole-currency formatting shared by the sections. */
export function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** Compact currency for dense chart axis labels, e.g. $1.2M / $43K. */
export function fmtCurrencyCompact(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function fmtNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
