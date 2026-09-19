// Sales section: a region filter, a per-region table (revenue, orders, share)
// and a weekly revenue series that responds to the filter. Aggregation is done
// by the analytics helpers; this component only manages the selected region.

import { useMemo, useState } from "react";
import type { Dataset } from "../data/types";
import {
  filterByRegion,
  fmtCurrency,
  fmtNumber,
  regionNames,
  regionTotals,
  weeklyTotals,
} from "../analytics/metrics";
import { TrendChart } from "./TrendChart";

export interface SalesSectionProps {
  data: Dataset;
}

export function SalesSection({ data }: SalesSectionProps) {
  const [region, setRegion] = useState<string | null>(null);

  const names = useMemo(() => regionNames(data.sales), [data.sales]);
  const filtered = useMemo(
    () => filterByRegion(data.sales, region),
    [data.sales, region],
  );
  const table = useMemo(() => regionTotals(data.sales), [data.sales]);
  const weekly = useMemo(() => weeklyTotals(filtered), [filtered]);

  const hasSales = data.sales.length > 0;
  const scope = region ?? "All regions";
  const latestWeek = weekly.length > 0 ? weekly[weekly.length - 1] : null;

  return (
    <section className="section" aria-labelledby="sales-heading">
      <div className="section__head">
        <h2 id="sales-heading">Sales</h2>
        <p className="section__sub">Revenue and orders by region.</p>
      </div>

      {!hasSales ? (
        <p className="status status--empty" role="status">
          No sales rows in the dataset — nothing to break down yet.
        </p>
      ) : (
        <>
          <div className="filter" role="group" aria-label="Filter by region">
            <button
              type="button"
              className={`chip${region === null ? " chip--active" : ""}`}
              aria-pressed={region === null}
              onClick={() => setRegion(null)}
            >
              All regions
            </button>
            {names.map((name) => (
              <button
                key={name}
                type="button"
                className={`chip${region === name ? " chip--active" : ""}`}
                aria-pressed={region === name}
                onClick={() => setRegion(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">Weekly revenue — {scope}</span>
              <span className="panel__meta">{fmtCurrency(latestWeek?.revenue ?? 0)} latest</span>
            </div>
            <TrendChart
              data={weekly}
              metric="revenue"
              label={`Weekly revenue trend for ${scope}`}
            />
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">Region breakdown</span>
              <span className="panel__meta">by revenue</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Region</th>
                  <th scope="col" className="table__num">Revenue</th>
                  <th scope="col" className="table__num">Orders</th>
                  <th scope="col" className="table__num">Share</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr
                    key={r.region}
                    className={region === r.region ? "table__row--active" : undefined}
                  >
                    <th scope="row">{r.region}</th>
                    <td className="table__num">{fmtCurrency(r.revenue)}</td>
                    <td className="table__num">{fmtNumber(r.orders)}</td>
                    <td className="table__num">{r.share.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
