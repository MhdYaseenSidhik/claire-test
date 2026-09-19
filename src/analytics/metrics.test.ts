import { describe, expect, it } from "vitest";
import type { Dataset, SalesWeek } from "../data/types";
import {
  filterByRegion,
  overviewMetrics,
  regionNames,
  regionTotals,
  weeklyTotals,
} from "./metrics";

const sales: SalesWeek[] = [
  { week: "2025-01-12", region: "North", revenue: 100, orders: 10, new_customers: 3 },
  { week: "2025-01-05", region: "North", revenue: 200, orders: 20, new_customers: 5 },
  { week: "2025-01-05", region: "South", revenue: 300, orders: 30, new_customers: 7 },
];

const data: Dataset = {
  sales,
  customers: [
    { customer_id: "C1", region: "North", signup_date: "2024-01-01", mrr: 10, tenure_months: 12, churned: 0 },
    { customer_id: "C2", region: "South", signup_date: "2024-02-01", mrr: 20, tenure_months: 6, churned: 1 },
    { customer_id: "C3", region: "North", signup_date: "2024-03-01", mrr: 30, tenure_months: 3, churned: 0 },
    { customer_id: "C4", region: "South", signup_date: "2024-04-01", mrr: 40, tenure_months: 1, churned: 1 },
  ],
};

describe("overviewMetrics", () => {
  it("sums revenue, orders and new customers across all rows", () => {
    const m = overviewMetrics(data);
    expect(m.totalRevenue).toBe(600);
    expect(m.totalOrders).toBe(60);
    expect(m.newCustomers).toBe(15);
  });

  it("counts distinct weeks and regions", () => {
    const m = overviewMetrics(data);
    expect(m.weeks).toBe(2);
    expect(m.regions).toBe(2);
    expect(m.avgWeeklyRevenue).toBe(300);
  });

  it("computes churn rate as a percentage of the customer base", () => {
    const m = overviewMetrics(data);
    expect(m.churnRate).toBe(50);
  });

  it("does not divide by zero on an empty dataset", () => {
    const m = overviewMetrics({ sales: [], customers: [] });
    expect(m.avgWeeklyRevenue).toBe(0);
    expect(m.churnRate).toBe(0);
  });
});

describe("weeklyTotals", () => {
  it("aggregates regions into one point per week, sorted ascending", () => {
    const w = weeklyTotals(sales);
    expect(w).toEqual([
      { week: "2025-01-05", revenue: 500, orders: 50 },
      { week: "2025-01-12", revenue: 100, orders: 10 },
    ]);
  });
});

describe("regionTotals", () => {
  it("totals per region and computes each share of revenue, sorted by revenue desc", () => {
    const r = regionTotals(sales);
    expect(r[0].region).toBe("North");
    expect(r[0].revenue).toBe(300);
    expect(r[0].share).toBeCloseTo(50);
    expect(r[1].region).toBe("South");
    expect(r[1].share).toBeCloseTo(50);
  });
});

describe("regionNames", () => {
  it("returns distinct region names alphabetically", () => {
    expect(regionNames(sales)).toEqual(["North", "South"]);
  });
});

describe("filterByRegion", () => {
  it("returns all rows when region is null", () => {
    expect(filterByRegion(sales, null)).toHaveLength(3);
  });

  it("returns only rows for the named region", () => {
    const north = filterByRegion(sales, "North");
    expect(north).toHaveLength(2);
    expect(north.every((r) => r.region === "North")).toBe(true);
  });
});
