import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Dataset } from "../data/types";
import { OverviewSection } from "./OverviewSection";
import { SalesSection } from "./SalesSection";

const data: Dataset = {
  sales: [
    { week: "2025-01-05", region: "North", revenue: 200, orders: 20, new_customers: 5 },
    { week: "2025-01-12", region: "North", revenue: 100, orders: 10, new_customers: 3 },
    { week: "2025-01-05", region: "South", revenue: 300, orders: 30, new_customers: 7 },
  ],
  customers: [
    { customer_id: "C1", region: "North", signup_date: "2024-01-01", mrr: 10, tenure_months: 12, churned: 0 },
    { customer_id: "C2", region: "South", signup_date: "2024-02-01", mrr: 20, tenure_months: 6, churned: 1 },
  ],
};

const empty: Dataset = { sales: [], customers: [] };

describe("OverviewSection", () => {
  it("renders the headline KPIs from overviewMetrics", () => {
    const html = renderToStaticMarkup(<OverviewSection data={data} />);
    expect(html).toContain("Total revenue");
    expect(html).toContain("$600");
    expect(html).toContain("Total orders");
    expect(html).toContain("New customers");
    expect(html).toContain("Churn rate");
    expect(html).toContain("50.0%");
  });

  it("plots a weekly trend and the region split", () => {
    const html = renderToStaticMarkup(<OverviewSection data={data} />);
    expect(html).toContain("Weekly revenue");
    expect(html).toContain("Weekly orders");
    expect(html).toContain("Revenue by region");
    expect(html).toContain("<polyline");
    expect(html).toContain("North");
    expect(html).toContain("South");
  });

  it("shows an empty state when there are no sales rows", () => {
    const html = renderToStaticMarkup(<OverviewSection data={empty} />);
    expect(html).toContain("nothing to summarise");
    expect(html).not.toContain("<polyline");
  });
});

describe("SalesSection", () => {
  it("renders a region filter with a chip per region plus All", () => {
    const html = renderToStaticMarkup(<SalesSection data={data} />);
    expect(html).toContain("All regions");
    expect(html).toContain(">North<");
    expect(html).toContain(">South<");
  });

  it("renders a per-region table with revenue, orders and share", () => {
    const html = renderToStaticMarkup(<SalesSection data={data} />);
    expect(html).toContain("Region breakdown");
    expect(html).toContain("Revenue");
    expect(html).toContain("Orders");
    expect(html).toContain("Share");
    // North totals 300 across both weeks, South 300 — both 50% share.
    expect(html).toContain("$300");
    expect(html).toContain("50.0%");
  });

  it("shows an empty state when there are no sales rows", () => {
    const html = renderToStaticMarkup(<SalesSection data={empty} />);
    expect(html).toContain("nothing to break down");
    expect(html).not.toContain("chip");
  });
});
