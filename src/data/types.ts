// Domain types for the sales & churn dashboard data foundation.
// These describe the committed CSVs in /public/data. Downstream sections
// (Overview, Sales, Risk, Insights) build on these shapes.

/** One row of public/data/sales_weekly.csv */
export interface SalesWeek {
  /** ISO week-ending date, YYYY-MM-DD */
  week: string;
  region: string;
  /** Gross revenue for the week, in whole currency units */
  revenue: number;
  /** Number of orders closed that week */
  orders: number;
  /** New customers acquired that week */
  new_customers: number;
}

/** One row of public/data/customers.csv */
export interface Customer {
  customer_id: string;
  region: string;
  /** Account signup date, YYYY-MM-DD */
  signup_date: string;
  /** Monthly recurring revenue in whole currency units */
  mrr: number;
  /** Tenure in whole months at time of snapshot */
  tenure_months: number;
  /** 1 = churned in the observation window, 0 = retained */
  churned: 0 | 1;
}

export interface Dataset {
  sales: SalesWeek[];
  customers: Customer[];
}
