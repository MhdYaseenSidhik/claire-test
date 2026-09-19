import { describe, expect, it } from "vitest";
import { parseCustomers, parseSales, SchemaError } from "./loader";

describe("parseSales", () => {
  it("parses valid rows", () => {
    const csv =
      "week,region,revenue,orders,new_customers\n" +
      "2025-01-05,North,43405,238,25\n";
    const rows = parseSales("sales_weekly.csv", csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      week: "2025-01-05",
      region: "North",
      revenue: 43405,
      orders: 238,
      new_customers: 25,
    });
  });

  it("throws SchemaError when a required column is missing", () => {
    const csv = "week,region,revenue\n2025-01-05,North,43405\n";
    expect(() => parseSales("sales_weekly.csv", csv)).toThrow(SchemaError);
  });

  it("throws SchemaError on a non-numeric revenue", () => {
    const csv =
      "week,region,revenue,orders,new_customers\n" +
      "2025-01-05,North,notanumber,238,25\n";
    expect(() => parseSales("sales_weekly.csv", csv)).toThrow(/revenue.*not a number/);
  });
});

describe("parseCustomers", () => {
  it("parses valid rows and coerces churned to 0/1", () => {
    const csv =
      "customer_id,region,signup_date,mrr,tenure_months,churned\n" +
      "CUST-0001,South,2023-07-16,669.97,7,0\n";
    const rows = parseCustomers("customers.csv", csv);
    expect(rows[0].churned).toBe(0);
    expect(rows[0].mrr).toBeCloseTo(669.97);
  });

  it("rejects a churned value that is not 0 or 1", () => {
    const csv =
      "customer_id,region,signup_date,mrr,tenure_months,churned\n" +
      "CUST-0001,South,2023-07-16,669.97,7,2\n";
    expect(() => parseCustomers("customers.csv", csv)).toThrow(/churned.*0 or 1/);
  });
});
