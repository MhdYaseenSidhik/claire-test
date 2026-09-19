import { regionRisk, fmtCurrency } from "../analytics/insights";
import type { Dataset } from "../data/types";

/**
 * Risk section — per-region churn and revenue-at-risk table, ranked so the
 * region leaking the most monthly recurring revenue is at the top. The bar
 * visualises each region's churn rate relative to the worst region.
 */
export function RiskSection({ data }: { data: Dataset }) {
  const rows = regionRisk(data.customers);
  const maxChurn = rows.reduce((m, r) => Math.max(m, r.churnRate), 0);

  return (
    <section className="section" aria-labelledby="risk-heading">
      <div className="section__head">
        <h2 id="risk-heading">Risk</h2>
        <p className="section__lede">
          Churn and revenue at risk by region, from{" "}
          <code>customers.csv</code>. Regions are ranked by monthly recurring
          revenue sitting in churned accounts.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="status status--loading">No customer rows to assess.</p>
      ) : (
        <table className="risk-table">
          <thead>
            <tr>
              <th scope="col">Region</th>
              <th scope="col">Customers</th>
              <th scope="col">Churn rate</th>
              <th scope="col">MRR at risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.region}>
                <th scope="row">{r.region}</th>
                <td>{r.customers}</td>
                <td>
                  <span
                    className="bar"
                    aria-hidden="true"
                    title={`${(r.churnRate * 100).toFixed(1)}% churn`}
                  >
                    <span
                      className="bar__fill"
                      style={{
                        width: `${maxChurn > 0 ? (r.churnRate / maxChurn) * 100 : 0}%`,
                      }}
                    />
                  </span>
                  <span className="bar__label">
                    {(r.churnRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td>{fmtCurrency(r.mrrAtRisk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
