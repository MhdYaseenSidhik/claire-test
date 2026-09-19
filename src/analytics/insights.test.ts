import { describe, expect, it } from "vitest";
import type { Customer, Dataset, SalesWeek } from "../data/types";
import {
  deriveInsights,
  overallChurnRate,
  regionRisk,
  revenueTrend,
  tenureChurnGap,
  totalMrrAtRisk,
} from "./insights";

function customer(over: Partial<Customer> = {}): Customer {
  return {
    customer_id: "CUST-0001",
    region: "North",
    signup_date: "2024-01-01",
    mrr: 100,
    tenure_months: 12,
    churned: 0,
    ...over,
  };
}

function week(over: Partial<SalesWeek> = {}): SalesWeek {
  return {
    week: "2025-01-05",
    region: "North",
    revenue: 1000,
    orders: 10,
    new_customers: 5,
    ...over,
  };
}

describe("regionRisk", () => {
  it("rolls up churn and MRR at risk per region", () => {
    const rows = regionRisk([
      customer({ region: "North", mrr: 100, churned: 1 }),
      customer({ region: "North", mrr: 200, churned: 0 }),
      customer({ region: "South", mrr: 50, churned: 0 }),
    ]);
    const north = rows.find((r) => r.region === "North")!;
    expect(north.customers).toBe(2);
    expect(north.churned).toBe(1);
    expect(north.churnRate).toBeCloseTo(0.5);
    expect(north.mrrAtRisk).toBe(100);
    expect(north.totalMrr).toBe(300);
  });

  it("sorts regions by MRR at risk descending", () => {
    const rows = regionRisk([
      customer({ region: "Low", mrr: 10, churned: 1 }),
      customer({ region: "High", mrr: 900, churned: 1 }),
    ]);
    expect(rows.map((r) => r.region)).toEqual(["High", "Low"]);
  });

  it("returns an empty array for no customers", () => {
    expect(regionRisk([])).toEqual([]);
  });
});

describe("overallChurnRate", () => {
  it("computes the fraction churned", () => {
    const rate = overallChurnRate([
      customer({ churned: 1 }),
      customer({ churned: 0 }),
      customer({ churned: 0 }),
      customer({ churned: 0 }),
    ]);
    expect(rate).toBeCloseTo(0.25);
  });

  it("is zero for no customers", () => {
    expect(overallChurnRate([])).toBe(0);
  });
});

describe("totalMrrAtRisk", () => {
  it("sums MRR of churned customers only", () => {
    const total = totalMrrAtRisk([
      customer({ mrr: 100, churned: 1 }),
      customer({ mrr: 200, churned: 1 }),
      customer({ mrr: 999, churned: 0 }),
    ]);
    expect(total).toBe(300);
  });
});

describe("tenureChurnGap", () => {
  it("returns the mean tenure gap between churned and retained", () => {
    const gap = tenureChurnGap([
      customer({ tenure_months: 2, churned: 1 }),
      customer({ tenure_months: 4, churned: 1 }),
      customer({ tenure_months: 20, churned: 0 }),
    ])!;
    expect(gap.churnedMean).toBeCloseTo(3);
    expect(gap.retainedMean).toBeCloseTo(20);
    expect(gap.gap).toBeCloseTo(-17);
  });

  it("returns null when a group is empty", () => {
    expect(tenureChurnGap([customer({ churned: 1 })])).toBeNull();
  });
});

describe("revenueTrend", () => {
  it("compares first-half to last-half mean weekly revenue", () => {
    const trend = revenueTrend([
      week({ week: "2025-01-05", revenue: 100 }),
      week({ week: "2025-01-12", revenue: 100 }),
      week({ week: "2025-01-19", revenue: 200 }),
      week({ week: "2025-01-26", revenue: 200 }),
    ])!;
    expect(trend.firstHalf).toBeCloseTo(100);
    expect(trend.lastHalf).toBeCloseTo(200);
    expect(trend.changePct).toBeCloseTo(100);
  });

  it("sums multiple regions within the same week", () => {
    const trend = revenueTrend([
      week({ week: "2025-01-05", region: "North", revenue: 100 }),
      week({ week: "2025-01-05", region: "South", revenue: 100 }),
      week({ week: "2025-01-12", region: "North", revenue: 400 }),
    ])!;
    expect(trend.firstHalf).toBeCloseTo(200);
    expect(trend.lastHalf).toBeCloseTo(400);
  });

  it("returns null with fewer than two weeks", () => {
    expect(revenueTrend([week()])).toBeNull();
  });
});

describe("deriveInsights", () => {
  const data: Dataset = {
    sales: [
      week({ week: "2025-01-05", revenue: 100 }),
      week({ week: "2025-01-12", revenue: 300 }),
    ],
    customers: [
      customer({ region: "North", mrr: 500, churned: 1, tenure_months: 2 }),
      customer({ region: "North", mrr: 100, churned: 0, tenure_months: 30 }),
      customer({ region: "South", mrr: 100, churned: 0, tenure_months: 20 }),
    ],
  };

  it("produces a stable set of insight ids", () => {
    const ids = deriveInsights(data).map((i) => i.id);
    expect(ids).toContain("top-region-risk");
    expect(ids).toContain("overall-churn");
    expect(ids).toContain("tenure-gap");
    expect(ids).toContain("revenue-trend");
  });

  it("flags the region with the most MRR at risk first", () => {
    const top = deriveInsights(data).find((i) => i.id === "top-region-risk")!;
    expect(top.title).toContain("North");
  });

  it("returns no insights for an empty dataset", () => {
    expect(deriveInsights({ sales: [], customers: [] })).toEqual([]);
  });
});
