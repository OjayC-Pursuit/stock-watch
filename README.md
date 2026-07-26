# StockWatch

> **[Open the live StockWatch MVP](https://ojayc-pursuit.github.io/stock-watch/)**

StockWatch is an import-first inventory attention dashboard for an Inventory Coordinator managing roughly 80 refrigerated products. Instead of manually comparing spreadsheet rows, the coordinator loads an inventory CSV and immediately sees what needs attention.

![StockWatch V2 CSV-loader dashboard with an imported 80-product inventory](docs/screenshots/stockwatch-v2-current-csv-loader-desktop.png)

## What StockWatch does

```text
CSV selected
→ file parsed and validated
→ products evaluated
→ inventory prioritized
→ dashboard updated
```

StockWatch groups the imported inventory into Urgent, Low Stock, Expiring Soon, and Safe. Each product card explains why it was prioritized and shows a display-only recommended action. The MVP does not place orders, contact suppliers, generate reports, or connect to a live inventory system.

## Current MVP flow

1. Open StockWatch.
2. Select a CSV inventory file.
3. StockWatch validates the entire file.
4. If valid, the imported products replace the current in-memory inventory.
5. The dashboard displays Urgent, Low Stock, Expiring Soon, and Safe results.
6. Review each product’s reasons and recommended action.
7. Replace the CSV or clear inventory when needed.
8. Refreshing the page clears imported data because StockWatch has no persistence.

## CSV import

StockWatch accepts a local `.csv` file. Headers can appear in any order, but supported names are case-sensitive after trimming whitespace.

| Column | Required? | Rule |
| --- | --- | --- |
| `productName` | Yes | Nonblank text |
| `category` | Yes | Nonblank text |
| `brand` | Yes | Nonblank text |
| `quantityOnHand` | Yes | Finite number greater than or equal to zero |
| `reorderThreshold` | Yes | Finite number greater than or equal to zero |
| `salesRatePerDay` | Yes | Finite number greater than or equal to zero |
| `expirationDate` | Yes | A real date in exact `YYYY-MM-DD` format |
| `id` | No | Nonblank supplied IDs must be unique; blank or missing IDs receive a temporary in-memory ID |
| `storageCondition` | No | Blank or missing values become `Not specified` |

Import rules:

- Files must be `.csv` and no larger than 1 MB.
- A file can contain at most 250 product rows.
- Validation is all-or-nothing: one invalid required value rejects the complete import.
- Imported data exists only for the current browser session.
- A failed replacement import preserves the active dashboard and active filename.
- Clear inventory returns StockWatch to its empty import state; it does not restore sample data.

## Demo CSV files

The 80-product presentation files are in [data/demo-csv](data/demo-csv/). Their results are produced by the evaluator, not hardcoded into the dashboard.

| File | Scenario | Products | Expected status totals | Expected headline |
| --- | --- | ---: | --- | --- |
| `balanced-inventory.csv` | A mixed but manageable day | 80 | 4 Urgent · 12 Low Stock · 16 Expiring Soon · 48 Safe | 4 cases are at the red line. |
| `high-urgency-inventory.csv` | Immediate operational risk | 80 | 45 Urgent · 10 Low Stock · 10 Expiring Soon · 15 Safe | 45 cases are at the red line. |
| `expiration-heavy-inventory.csv` | Shelf-life pressure with healthy stock | 80 | 0 Urgent · 0 Low Stock · 60 Expiring Soon · 20 Safe | 60 products need attention today. |
| `all-safe-inventory.csv` | Healthy inventory | 80 | 0 Urgent · 0 Low Stock · 0 Expiring Soon · 80 Safe | Inventory is clear for today. |
| `invalid-inventory.csv` | Validation and failed-replacement demonstration | 80 | No import | The active dashboard stays unchanged. |

The invalid file deliberately includes a negative quantity, invalid date format, blank brand, nonnumeric sales rate, and duplicate supplied ID. StockWatch reports the capped row-and-column error list instead of rendering a partial inventory.

## Technical summary

- Plain HTML, CSS, and JavaScript
- Browser File APIs for local CSV reading
- No backend, database, authentication, or persistence
- Automated Node tests and browser tests

## Design history

The current product image above is StockWatch V2 with the CSV loader. Earlier [V1 and visual exploration screenshots](docs/screenshots/) are retained as design history only; they are not separate current MVP releases.

