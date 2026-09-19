"""Generate the SPRINT-1 synthetic data foundation for the dashboard.

Deterministic (seeded) so the committed CSVs are reproducible. Produces:
  public/data/sales_weekly.csv  — 52 weeks x 4 regions
  public/data/customers.csv     — 600 customers

Schemas match src/data/types.ts and the schema guard in src/data/loader.ts.
Run:  python scripts/generate_data.py
"""
import csv
import os
import random
from datetime import date, timedelta

SEED = 20250101
random.seed(SEED)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "data")
os.makedirs(OUT, exist_ok=True)

REGIONS = ["North", "South", "East", "West"]
# Per-region weekly revenue baseline and order economics.
REGION_PROFILE = {
    "North": {"rev": 42000, "aov": 180, "growth": 0.004},
    "South": {"rev": 31000, "aov": 155, "growth": 0.006},
    "East": {"rev": 38000, "aov": 210, "growth": 0.003},
    "West": {"rev": 27000, "aov": 140, "growth": 0.007},
}

# --- sales_weekly.csv -------------------------------------------------------
first_week = date(2025, 1, 5)  # a Sunday; week-ending date
sales_rows = []
for w in range(52):
    week = first_week + timedelta(weeks=w)
    # Mild seasonal wave across the year plus per-region trend.
    season = 1.0 + 0.12 * random.uniform(-1, 1) + 0.08 * __import__("math").sin(w / 52 * 2 * 3.14159)
    for region in REGIONS:
        p = REGION_PROFILE[region]
        trend = 1.0 + p["growth"] * w
        revenue = round(p["rev"] * trend * season * random.uniform(0.9, 1.1))
        orders = max(1, round(revenue / p["aov"] * random.uniform(0.9, 1.1)))
        new_customers = max(0, round(orders * random.uniform(0.08, 0.16)))
        sales_rows.append(
            {
                "week": week.isoformat(),
                "region": region,
                "revenue": revenue,
                "orders": orders,
                "new_customers": new_customers,
            }
        )

with open(os.path.join(OUT, "sales_weekly.csv"), "w", newline="") as f:
    writer = csv.DictWriter(
        f, fieldnames=["week", "region", "revenue", "orders", "new_customers"]
    )
    writer.writeheader()
    writer.writerows(sales_rows)

# --- customers.csv ----------------------------------------------------------
N = 600
cust_rows = []
for i in range(1, N + 1):
    region = random.choice(REGIONS)
    # Signups spread across ~2 years before the snapshot.
    signup = date(2023, 1, 1) + timedelta(days=random.randint(0, 720))
    tenure_months = max(0, (date(2025, 1, 1) - signup).days // 30)
    mrr = round(random.uniform(29, 899), 2)
    # Shorter tenure and lower MRR churn more often.
    churn_p = 0.30 - min(0.20, tenure_months * 0.008) - min(0.05, mrr / 20000)
    churned = 1 if random.random() < max(0.03, churn_p) else 0
    cust_rows.append(
        {
            "customer_id": f"CUST-{i:04d}",
            "region": region,
            "signup_date": signup.isoformat(),
            "mrr": f"{mrr:.2f}",
            "tenure_months": tenure_months,
            "churned": churned,
        }
    )

with open(os.path.join(OUT, "customers.csv"), "w", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "customer_id",
            "region",
            "signup_date",
            "mrr",
            "tenure_months",
            "churned",
        ],
    )
    writer.writeheader()
    writer.writerows(cust_rows)

churned_n = sum(r["churned"] for r in cust_rows)
print(f"sales_weekly.csv: {len(sales_rows)} rows ({52} weeks x {len(REGIONS)} regions)")
print(f"customers.csv:    {len(cust_rows)} rows, {churned_n} churned "
      f"({churned_n / len(cust_rows) * 100:.1f}%)")
