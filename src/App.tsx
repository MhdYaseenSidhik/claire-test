import { useEffect, useMemo, useState } from "react";
import { loadDataset } from "./data/loader";
import type { Dataset } from "./data/types";
import { RiskSection } from "./sections/RiskSection";
import { InsightsSection } from "./sections/InsightsSection";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dataset };

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadDataset()
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch((e: unknown) =>
        !cancelled &&
        setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    if (state.status !== "ready") return null;
    const { sales, customers } = state.data;
    const totalRevenue = sales.reduce((a, r) => a + r.revenue, 0);
    const weeks = new Set(sales.map((r) => r.week)).size;
    const regions = new Set(sales.map((r) => r.region)).size;
    const churned = customers.filter((c) => c.churned === 1).length;
    const churnRate = customers.length ? (churned / customers.length) * 100 : 0;
    return { totalRevenue, weeks, regions, customers: customers.length, churnRate };
  }, [state]);

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__eyebrow">Insight Lab</span>
        <h1>Sales &amp; Churn Dashboard</h1>
        <p className="app__lede">
          SPRINT-1 foundation — repo scaffold, committed datasets and an
          in-browser CSV loader with a schema guard. The Risk and Insights
          sections below read the same validated dataset.
        </p>
      </header>

      <main className="app__main">
        {state.status === "loading" && (
          <p className="status status--loading">Loading dataset…</p>
        )}

        {state.status === "error" && (
          <div className="status status--error" role="alert">
            <strong>Data foundation failed to load.</strong>
            <pre>{state.message}</pre>
          </div>
        )}

        {state.status === "ready" && summary && (
          <>
            <section className="cards" aria-label="Data foundation health">
              <div className="card">
                <span className="card__label">Weeks loaded</span>
                <span className="card__value">{summary.weeks}</span>
                <span className="card__hint">across {summary.regions} regions</span>
              </div>
              <div className="card">
                <span className="card__label">Total revenue</span>
                <span className="card__value">{fmtCurrency(summary.totalRevenue)}</span>
                <span className="card__hint">sales_weekly.csv</span>
              </div>
              <div className="card">
                <span className="card__label">Customers</span>
                <span className="card__value">{summary.customers}</span>
                <span className="card__hint">customers.csv</span>
              </div>
              <div className="card">
                <span className="card__label">Churn rate</span>
                <span className="card__value">{summary.churnRate.toFixed(1)}%</span>
                <span className="card__hint">retained vs churned</span>
              </div>
            </section>

            <p className="status status--ok" role="status">
              ✓ Data foundation verified — both CSVs parsed and passed the schema guard.
            </p>

            <RiskSection data={state.data} />
            <InsightsSection data={state.data} />
          </>
        )}
      </main>

      <footer className="app__footer">
        Data foundation: <code>public/data/sales_weekly.csv</code> +{" "}
        <code>public/data/customers.csv</code>. Replace these files with real
        exports to drive the dashboard.
      </footer>
    </div>
  );
}
