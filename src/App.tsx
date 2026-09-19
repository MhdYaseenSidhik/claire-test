import { useEffect, useState } from "react";
import { loadDataset } from "./data/loader";
import type { Dataset } from "./data/types";
import { RiskSection } from "./sections/RiskSection";
import { InsightsSection } from "./sections/InsightsSection";
import { OverviewSection } from "./sections/OverviewSection";
import { SalesSection } from "./sections/SalesSection";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dataset };

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

  const isEmpty =
    state.status === "ready" &&
    state.data.sales.length === 0 &&
    state.data.customers.length === 0;

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__eyebrow">Insight Lab</span>
        <h1>Sales &amp; Churn Dashboard</h1>
        <p className="app__lede">
          SPRINT-1 foundation — repo scaffold, committed datasets and an
          in-browser CSV loader with a schema guard. The Risk and Insights
          sections below read the same validated dataset.
          Weekly performance and regional breakdown from the committed dataset —
          headline KPIs, revenue and orders trends, and per-region sales.
        </p>
      </header>

      <main className="app__main">
        {state.status === "loading" && (
          <p className="status status--loading">Loading dataset…</p>
        )}

        {state.status === "error" && (
          <div className="status status--error" role="alert">
            <strong>Data failed to load.</strong>
            <pre>{state.message}</pre>
          </div>
        )}

        {state.status === "ready" && isEmpty && (
          <p className="status status--empty" role="status">
            The dataset is empty — add rows to{" "}
            <code>public/data/sales_weekly.csv</code> and{" "}
            <code>public/data/customers.csv</code> to populate the dashboard.
          </p>
        )}

            <p className="status status--ok" role="status">
              ✓ Data foundation verified — both CSVs parsed and passed the schema guard.
            </p>

            <RiskSection data={state.data} />
            <InsightsSection data={state.data} />
        {state.status === "ready" && !isEmpty && (
          <>
            <OverviewSection data={state.data} />
            <SalesSection data={state.data} />
          </>
        )}
      </main>

      <footer className="app__footer">
        Source: <code>public/data/sales_weekly.csv</code> +{" "}
        <code>public/data/customers.csv</code>. Replace these files with real
        exports to drive the dashboard.
      </footer>
    </div>
  );
}
