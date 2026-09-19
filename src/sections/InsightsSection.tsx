import { deriveInsights } from "../analytics/insights";
import type { Dataset } from "../data/types";

/**
 * Insights section — narrative findings derived from both datasets. Each card
 * states a finding in plain language, coloured by severity so the reader sees
 * the critical ones first.
 */
export function InsightsSection({ data }: { data: Dataset }) {
  const insights = deriveInsights(data);

  return (
    <section className="section" aria-labelledby="insights-heading">
      <div className="section__head">
        <h2 id="insights-heading">Insights</h2>
        <p className="section__lede">
          What the numbers say, in plain language — churn concentration,
          revenue at risk, tenure signal and the revenue trend.
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="status status--loading">
          Not enough data to derive insights.
        </p>
      ) : (
        <ul className="insights">
          {insights.map((i) => (
            <li key={i.id} className={`insight insight--${i.severity}`}>
              <h3 className="insight__title">{i.title}</h3>
              <p className="insight__detail">{i.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
