// Overview section: headline KPIs, a weekly revenue & orders trend, and the
// region revenue split. All figures come from the pure helpers in
// analytics/metrics so this component stays presentational.

import { useMemo } from "react";
import type { Dataset } from "../data/types";
import {
  fmtCurrency,
  fmtNumber,
  overviewMetrics,
  regionTotals,
  weeklyTotals,
} from "../analytics/metrics";
import { TrendChart } from "./TrendChart";

export interface OverviewSectionProps {
  data: Dataset;
}

export function OverviewSection({ data }: OverviewSectionProps) {
  const metrics = useMemo(() => overviewMetrics(data), [data]);
  const weekly = useMemo(() => weeklyTotals(data.sales), [data.sales]);
  const regions = useMemo(() => regionTotals(data.sales), [data.sales]);

  const hasSales = data.sales.length > 0;
  const latestWeek = weekly.length > 0 ? weekly[weekly.length - 1] : null;

  return (
    <section className="section" aria-labelledby="overview-heading">
      <div className="section__head">
        <h2 id="overview-heading">Overview</h2>
        <p className="section__sub">
          Headline performance across all regions and weeks.
        </p>
      </div>

      {!hasSales ? (
        <p className="status status--empty" role="status">
          No sales rows in the dataset — nothing to summarise yet.
        </p>
      ) : (
        <>
          <div className="cards" aria-label="Headline KPIs">
            <div className="card">
              <span className="card__label">Total revenue</span>
              <span className="card__value">{fmtCurrency(metrics.totalRevenue)}</span>
              <span className="card__hint">
                {fmtCurrency(metrics.avgWeeklyRevenue)} avg / week
              </span>
            </div>
            <div className="card">
              <span className="card__label">Total orders</span>
              <span className="card__value">{fmtNumber(metrics.totalOrders)}</span>
              <span className="card__hint">across {metrics.weeks} weeks</span>
            </div>
            <div className="card">
              <span className="card__label">New customers</span>
              <span className="card__value">{fmtNumber(metrics.newCustomers)}</span>
              <span className="card__hint">acquired in period</span>
            </div>
            <div className="card">
              <span className="card__label">Churn rate</span>
              <span className="card__value">{metrics.churnRate.toFixed(1)}%</span>
              <span className="card__hint">of customer base</span>
            </div>
          </div>

          <div className="panels">
            <div className="panel">
              <div className="panel__head">
                <span className="panel__title">Weekly revenue</span>
                <span className="panel__meta">{fmtCurrency(latestWeek?.revenue ?? 0)} latest</span>
              </div>
              <TrendChart data={weekly} metric="revenue" label="Weekly revenue trend" />
            </div>
            <div className="panel">
              <div className="panel__head">
                <span className="panel__title">Weekly orders</span>
                <span className="panel__meta">{fmtNumber(latestWeek?.orders ?? 0)} latest</span>
              </div>
              <TrendChart data={weekly} metric="orders" label="Weekly orders trend" />
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">Revenue by region</span>
              <span className="panel__meta">{regions.length} regions</span>
            </div>
            <ul className="split" aria-label="Region revenue split">
              {regions.map((r) => (
                <li key={r.region} className="split__row">
                  <span className="split__name">{r.region}</span>
                  <span className="split__bar" aria-hidden="true">
                    <span
                      className="split__fill"
                      style={{ inlineSize: `${r.share.toFixed(1)}%` }}
                    />
                  </span>
                  <span className="split__value">
                    {fmtCurrency(r.revenue)}
                    <span className="split__share">{r.share.toFixed(1)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
