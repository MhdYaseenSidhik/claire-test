// A dependency-free, responsive line chart for a weekly metric series.
// Geometry is expressed in a fixed viewBox and scaled by the SVG to its
// container, so the component carries no layout pixels of its own; colour comes
// entirely from the CSS custom properties on .chart (see index.css).

import type { WeeklyTotal } from "../analytics/metrics";

// viewBox units — an internal coordinate space, not screen pixels. The SVG is
// declared width:100% in CSS so these scale to whatever the card allots.
const VIEW_W = 100;
const VIEW_H = 32;
const PAD_Y = 3;

export interface TrendChartProps {
  data: WeeklyTotal[];
  /** Which measure to plot. */
  metric: "revenue" | "orders";
  /** Accessible description of the series. */
  label: string;
}

function pointsFor(data: WeeklyTotal[], metric: "revenue" | "orders"): string {
  if (data.length === 0) return "";
  const values = data.map((d) => d[metric]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = data.length > 1 ? VIEW_W / (data.length - 1) : 0;
  const usableH = VIEW_H - PAD_Y * 2;
  return values
    .map((v, i) => {
      const x = data.length > 1 ? i * stepX : VIEW_W / 2;
      const y = PAD_Y + usableH * (1 - (v - min) / span);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function TrendChart({ data, metric, label }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <p className="chart__empty" role="status">
        No weekly data to plot.
      </p>
    );
  }

  const points = pointsFor(data, metric);
  const coords = points.split(" ");
  const lastPoint = coords.length > 0 ? coords[coords.length - 1].split(",") : null;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline className="chart__line" points={points} />
      {lastPoint && (
        <circle
          className="chart__dot"
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r={0.9}
        />
      )}
    </svg>
  );
}
