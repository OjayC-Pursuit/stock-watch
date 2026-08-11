# StockWatch

StockWatch is a small inventory-attention dashboard for Alicia, an Inventory Coordinator at FreshRoute, a dairy distributor. It turns an inventory source into clear Urgent, Low Stock, Expiring Soon, and Safe priorities so Alicia can decide what needs attention first instead of comparing every spreadsheet row by hand.

> **[Open the production GitHub Pages MVP](https://ojayc-pursuit.github.io/stock-watch/)**

GitHub Pages serves `main`, so it will not include this feature until the branch is approved and merged. A Vercel Preview was built successfully for the current `feature/multi-source-inventory-data` commit, but it is protected by a Vercel login and is not a public final-submission link.

## The problem and solution

Alicia manages roughly 80 refrigerated inventory records. Her source information can arrive as a bundled demonstration file, a spreadsheet export, or historical training data. StockWatch uses one shared path for every source:

```text
Source selected
→ validated and normalized
→ evaluated by the existing prioritization engine
→ sorted into priority lanes
→ rendered on the dashboard
```

The MVP gives guidance only. It does not place orders, contact suppliers, generate reports, persist inventory after refresh, or connect to a live inventory system.

## Current MVP flow

1. Open StockWatch in its true no-data state.
2. Choose one source: **Load FreshRoute sample**, **Upload CSV**, or **Load Kaggle historical training snapshot**.
3. StockWatch reads, validates, and normalizes the complete selected source before changing the dashboard.
4. On success, the source replaces the temporary in-memory inventory and StockWatch shows its four priority lanes.
5. Review each record’s reasons and display-only recommended action.
6. Replace the source at any time, or use **Clear inventory** to return to no-data.

A failed replacement leaves the active dashboard unchanged. FreshRoute and Kaggle failures offer **Retry**; an invalid upload asks the user to choose a corrected CSV. Refreshing the page clears all imported and loaded inventory because this MVP has no persistence.

## Inventory sources

| Source | Active result | Notes |
| --- | ---: | --- |
| FreshRoute sample | 8 inventory records | Bundled JSON demonstration data; parsed, normalized, and internally validated before use. |
| Uploaded CSV | Up to 250 products | Local browser upload with all-or-nothing validation. |
| Kaggle historical training snapshot | 80 inventory records | A deterministic, non-live training snapshot built at runtime from the bundled historical dataset. |

The dashboard keeps the existing evaluator behavior for every source. The status, reasons, sort order, and recommended actions come from the same prioritization engine.

## CSV uploads

StockWatch accepts a local `.csv` file up to **1 MB** with at most **250 product rows**. Header names are case-sensitive after surrounding whitespace is trimmed; columns can appear in any order.

| Column | Required? | Rule |
| --- | --- | --- |
| `productName` | Yes | Nonblank text |
| `category` | Yes | Nonblank text |
| `brand` | Yes | Nonblank text |
| `quantityOnHand` | Yes | Finite number greater than or equal to zero |
| `reorderThreshold` | Yes | Finite number greater than or equal to zero |
| `salesRatePerDay` | Yes | Finite number greater than or equal to zero |
| `expirationDate` | Yes | A real date in exact `YYYY-MM-DD` format |
| `id` | No | Nonblank supplied IDs must be unique; a blank or missing ID receives a temporary in-memory ID |
| `storageCondition` | No | Blank or missing values become `Not specified` |

Validation is all-or-nothing: one invalid required value rejects the complete upload. A failed replacement keeps the prior inventory visible. Clearing inventory removes all active records and does not restore a default sample.

## FreshRoute demonstration data

The bundled FreshRoute sample contains exactly eight inventory records. Even though it is included with the app, StockWatch still parses, normalizes, and validates it through the shared pipeline. If the complete source cannot pass that contract, StockWatch keeps any active dashboard and offers a source-specific retry.

## Kaggle historical training snapshot

StockWatch includes a bundled copy of Kaggle’s [Dairy Goods Sales Dataset](https://www.kaggle.com/datasets/suraj520/dairy-goods-sales-dataset/data). Kaggle describes it as data from **2019–2022** and licenses it **CC0: Public Domain**. The full source has **4,325 historical rows**; StockWatch does not fetch Kaggle live and does not treat the records as current inventory. [Dataset details and license](https://www.kaggle.com/datasets/suraj520/dairy-goods-sales-dataset/data)

When selected, StockWatch validates and evaluates the bundled source, then deterministically selects 80 historical inventory records: **12 Urgent, 12 Low Stock, 16 Expiring Soon, and 40 Safe**. The selected cards keep their source location and source date visible, use the dataset’s combined `liters/kg` unit label, and carry a persistent historical-training label so they are not mistaken for live inventory.

For reproducible historical timing, StockWatch preserves the original source dates for traceability but derives its operational expiration date from the fixed July 22, 2026 demo date plus `Shelf Life (days)`. It also derives a sales-rate proxy as `Quantity Sold (liters/kg) ÷ Shelf Life (days)`. These transformations do not change the existing evaluator, and the original Kaggle row remains preserved as source metadata for tests and debugging.

## Demo CSV files

The files in [data/demo-csv](data/demo-csv/) are useful for demonstrating uploads. Each valid file contains exactly 80 product rows.

| File | Scenario | Expected result |
| --- | --- | --- |
| `balanced-inventory.csv` | A mixed but manageable day | 4 Urgent, 12 Low Stock, 16 Expiring Soon, 48 Safe — **4 cases are at the red line.** |
| `high-urgency-inventory.csv` | Immediate operational risk | 45 Urgent, 10 Low Stock, 10 Expiring Soon, 15 Safe — **45 cases are at the red line.** |
| `expiration-heavy-inventory.csv` | Shelf-life pressure with healthy stock | 0 Urgent, 0 Low Stock, 60 Expiring Soon, 20 Safe — **60 products need attention today.** |
| `all-safe-inventory.csv` | Healthy inventory | 0 Urgent, 0 Low Stock, 0 Expiring Soon, 80 Safe — **Inventory is clear for today.** |
| `invalid-inventory.csv` | A realistic invalid-file demonstration | The whole file is rejected with capped row-and-column errors; the active dashboard remains unchanged. |

## Technical summary

- Plain HTML, CSS, and JavaScript
- Browser File APIs for local CSV reading
- Bundled source files only; no backend, database, authentication, or persistence
- Automated Node and browser tests

## Design history

Earlier [V1, V2 CSV-loader, and visual exploration screenshots](docs/screenshots/) are retained as design history. They do not represent the current multi-source branch.
