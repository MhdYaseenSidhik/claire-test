import Papa from "papaparse";
import type { Customer, Dataset, SalesWeek } from "./types";

/**
 * Thrown when a CSV is missing required columns or has unparseable rows.
 * The dashboard treats data-foundation errors as loud failures rather than
 * silently rendering an empty chart.
 */
export class SchemaError extends Error {
  constructor(
    public readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
    this.name = "SchemaError";
  }
}

function requireColumns(
  file: string,
  header: string[] | undefined,
  required: string[],
): void {
  const present = new Set(header ?? []);
  const missing = required.filter((c) => !present.has(c));
  if (missing.length > 0) {
    throw new SchemaError(
      file,
      `missing required column(s): ${missing.join(", ")}`,
    );
  }
}

function num(file: string, field: string, raw: unknown, row: number): number {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) {
    throw new SchemaError(file, `row ${row}: "${field}" is not a number (${String(raw)})`);
  }
  return n;
}

function str(file: string, field: string, raw: unknown, row: number): string {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "") {
    throw new SchemaError(file, `row ${row}: "${field}" is empty`);
  }
  return s;
}

/** Parse the raw text of sales_weekly.csv into validated rows. */
export function parseSales(file: string, text: string): SalesWeek[] {
  const res = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  requireColumns(file, res.meta.fields, [
    "week",
    "region",
    "revenue",
    "orders",
    "new_customers",
  ]);
  return res.data.map((r, i) => ({
    week: str(file, "week", r.week, i + 2),
    region: str(file, "region", r.region, i + 2),
    revenue: num(file, "revenue", r.revenue, i + 2),
    orders: num(file, "orders", r.orders, i + 2),
    new_customers: num(file, "new_customers", r.new_customers, i + 2),
  }));
}

/** Parse the raw text of customers.csv into validated rows. */
export function parseCustomers(file: string, text: string): Customer[] {
  const res = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  requireColumns(file, res.meta.fields, [
    "customer_id",
    "region",
    "signup_date",
    "mrr",
    "tenure_months",
    "churned",
  ]);
  return res.data.map((r, i) => {
    const churnedRaw = num(file, "churned", r.churned, i + 2);
    if (churnedRaw !== 0 && churnedRaw !== 1) {
      throw new SchemaError(
        file,
        `row ${i + 2}: "churned" must be 0 or 1 (${churnedRaw})`,
      );
    }
    return {
      customer_id: str(file, "customer_id", r.customer_id, i + 2),
      region: str(file, "region", r.region, i + 2),
      signup_date: str(file, "signup_date", r.signup_date, i + 2),
      mrr: num(file, "mrr", r.mrr, i + 2),
      tenure_months: num(file, "tenure_months", r.tenure_months, i + 2),
      churned: churnedRaw as 0 | 1,
    };
  });
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new SchemaError(path, `failed to load (HTTP ${res.status})`);
  }
  return res.text();
}

/**
 * Load and validate the committed dashboard dataset from /public/data.
 * Resolves the CSVs against import.meta.env.BASE_URL so it works under any base.
 */
export async function loadDataset(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL ?? "/";
  const salesPath = `${base}data/sales_weekly.csv`.replace(/\/{2,}/g, "/");
  const custPath = `${base}data/customers.csv`.replace(/\/{2,}/g, "/");
  const [salesText, custText] = await Promise.all([
    fetchText(salesPath),
    fetchText(custPath),
  ]);
  return {
    sales: parseSales("sales_weekly.csv", salesText),
    customers: parseCustomers("customers.csv", custText),
  };
}
