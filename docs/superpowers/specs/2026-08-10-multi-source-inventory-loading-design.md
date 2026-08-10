# StockWatch Multi-Source Inventory Loading — Functional Design

Status: Approved. No implementation is authorized by this document alone.

## Purpose

StockWatch will support three ways to load inventory while keeping one priority pipeline:

```text
Source selected
→ source parsed and validated
→ normalized into StockWatch records
→ internal validation
→ existing evaluator
→ existing counts and sorting
→ dashboard renderer
```

The evaluator, status names, sorting, reasons, recommendations, and fixed demo date of July 22, 2026 remain unchanged.

## Data sources

| Source | Active result | Notes |
| --- | ---: | --- |
| Load FreshRoute sample | 8 inventory records | Bundled JSON sample; validated like every other source |
| Upload CSV | Up to 250 records | Existing browser upload and all-or-nothing validation behavior |
| Load Kaggle historical training snapshot | 80 inventory records | Derived at runtime from the bundled 4,325-row source CSV |

The same three source choices remain available whether the dashboard is empty or active. A successful choice replaces active inventory; a failed choice preserves it. Reset is the only action that intentionally returns StockWatch to true no-data.

## Shared normalized format

Every active record uses StockWatch’s standard fields:

```text
id
productName
category
brand
quantityOnHand
reorderThreshold
salesRatePerDay
expirationDate
storageCondition
sourceType
sourceMetadata
```

`sourceMetadata` is not used by the evaluator. It preserves evidence for tests, debugging, auditability, and a future details view.

## FreshRoute sample behavior

The bundled `data/sample-inventory.json` is parsed, normalized, and internally validated before evaluation. It must produce exactly eight records.

If it succeeds:

```text
FreshRoute sample loaded — 8 inventory records.
```

If it fails:

```text
Could not load the FreshRoute sample. Try again.
```

Retry repeats the FreshRoute attempt. A malformed or structurally invalid sample never partially loads.

## Uploaded CSV behavior

Uploaded CSV files retain the existing approved rules:

- `.csv` only; maximum 1 MB and 250 product rows.
- Existing quoted-CSV parsing and all-or-nothing validation remain in force.
- Valid uploaded daily sales rates are used directly; Kaggle-specific derivations never apply.
- A failed replacement preserves active inventory.
- Invalid uploads do not show a Retry action; the user chooses `Upload CSV` again with a corrected file.

## Kaggle historical training snapshot

Source dataset: [Dairy Goods Sales Dataset](https://www.kaggle.com/datasets/suraj520/dairy-goods-sales-dataset/data), 2019–2022, CC0/Public Domain. StockWatch uses the bundled `data/demo-csv/dairy_dataset.csv` as its authoritative source material; it does not fetch live inventory from Kaggle.

The full source contains 4,325 historical rows. Loading it at runtime is acceptable for this small MVP because the file is about 732 KB. StockWatch activates only a deterministic 80-record training snapshot, keeping the dashboard focused on Alicia’s daily workflow rather than bulk data browsing.

### Required Kaggle headers

Each must appear exactly once after trimming whitespace:

```text
Location
Date
Product ID
Product Name
Brand
Quantity Sold (liters/kg)
Shelf Life (days)
Storage Condition
Production Date
Expiration Date
Quantity in Stock (liters/kg)
Minimum Stock Threshold (liters/kg)
```

`Customer Location` is optional. If present, it must appear at most once and is preserved in metadata. Extra columns are accepted and preserved in the raw metadata, but otherwise ignored.

Missing or duplicate required headers, duplicate optional headers, malformed CSV, or source-read failure fails the complete Kaggle attempt.

### Kaggle normalization

```text
id                 → KAGGLE-ROW-#### based on original CSV row number
productName        → Product Name
category           → Dairy
brand              → Brand
quantityOnHand     → Quantity in Stock (liters/kg)
reorderThreshold   → Minimum Stock Threshold (liters/kg)
salesRatePerDay    → Quantity Sold (liters/kg) ÷ Shelf Life (days)
expirationDate     → July 22, 2026 + Shelf Life (days)
storageCondition   → Storage Condition, or Not specified when blank
```

The internal ID is stable, unique, padded, and based on the original source row—not filtering, sorting, or snapshot position. The repeating source `Product ID` remains unchanged in `sourceMetadata`.

`sourceMetadata` preserves the complete original row, including Location, Customer Location when present, Date, Production Date, Expiration Date, Quantity Sold, Shelf Life, Storage Condition, and all other source fields.

### Historical-data rules

- `Date`, `Production Date`, and `Expiration Date` must each be real `YYYY-MM-DD` dates.
- Their historical ordering may be inconsistent; they are descriptive source metadata only.
- Only the derived `expirationDate` affects the evaluator.
- Shelf Life must be a finite, positive whole number. Invalid, blank, zero, negative, non-finite, or fractional values make that row ineligible.
- Quantity in Stock, Minimum Stock Threshold, and Quantity Sold must be finite and nonnegative.
- Zero quantity sold produces `salesRatePerDay: 0`, which does not trigger projected stockout.
- Blank Storage Condition remains eligible and displays as `Not specified`.
- Original source values are preserved without mutation.

### Snapshot selection

First, StockWatch parses, validates, normalizes, and evaluates eligible source rows. Then it selects records in this fixed order:

1. Urgent: 12
2. Low Stock: 12
3. Expiring Soon: 16
4. Safe: 40

For each status, StockWatch repeatedly selects the eligible candidate with the lowest:

```text
Product Name representation count
+ Brand representation count
+ Location representation count
```

After every selection, those representation counts are recalculated. Ties use the lowest original CSV row number. The selected result is a deterministic ordered set of 80 internal IDs.

If any status cannot meet its target, the whole Kaggle load fails safely. Source values and evaluator statuses are never changed to force diversity.

Rows with invalid required values are excluded before selection. Their count and detailed reasons remain available for diagnostics and tests. If the 80-record mix is still possible, loading succeeds; otherwise it fails.

### Kaggle wording

Persistent source label:

```text
Historical training snapshot — not current inventory
```

Kaggle-only eyebrow:

```text
Historical inventory signal
```

Kaggle-only attention headline:

```text
N products need attention in this snapshot.
```

Kaggle source counts and badges use “inventory records,” not “products.” Repeated product types are expected.

Each Kaggle card shows:

```text
Historical snapshot · [Location] · Source date [Date]
```

Kaggle stock values use `liters/kg`; StockWatch does not infer a per-record unit because the source does not provide one reliably.

## Loading, failure, retry, and reset

All sources load transactionally:

- While loading, active inventory remains visible.
- Only complete success replaces active inventory.
- No partial source result reaches the renderer.
- A failure with existing inventory preserves the current dashboard.
- A failure from no-data remains no-data.

Kaggle success:

```text
Kaggle historical training snapshot loaded — 80 inventory records.
```

When exclusions occur, append:

```text
80 historical records loaded; N ineligible source rows excluded.
```

Kaggle failure:

```text
Could not load the Kaggle historical training snapshot. Try again.
```

The dashboard does not expose technical parsing, missing-header, or target-mix details. Those remain available only for tests and developer diagnostics. Retry repeats the failed bundled-source attempt.

Reset clears active records, source identity, errors, loading, remembered failed source, Retry state, and prior notes. It returns to true no-data with only the three source choices.

## Testing requirements

Automated tests must cover:

- FreshRoute parsing, normalization, validation, exact eight-record result, failure preservation, and Retry.
- Existing uploaded-CSV behavior, including the 250-row rejection rule.
- Kaggle required/optional headers, malformed CSV, extra columns, and optional Customer Location.
- Kaggle numeric rules, shelf-life rules, original-date validation, inconsistent valid dates, and storage defaults.
- Derived sales-rate proxy and derived expiration-date behavior with the unchanged evaluator.
- Complete `sourceMetadata` preservation and evaluator separation from metadata.
- Stable `KAGGLE-ROW-####` IDs.
- Repeated snapshot generation returning the same ordered 80 IDs.
- Exact 12 / 12 / 16 / 40 status totals.
- Row exclusions, zero exclusions, and target-mix failure.
- Source switching, failed replacement preservation, no-data failure behavior, Retry behavior, and Reset cleanup.
- Source-aware wording, historical labels, count terminology, and Kaggle context lines.
- Renderer receiving only final 8- or 80-record inventories, never the full 4,325-row source.

Browser verification must confirm source switching, loading/failure/recovery states, no console errors, desktop and narrow layouts, and no horizontal overflow with 80 rendered Kaggle records.

## Documentation and MVP boundaries

README must document the verified Kaggle title, link, source period, license, historical-training purpose, 4,325-to-80 curation, transformations, `liters/kg` limitation, and non-live behavior.

This feature does not add a backend, database, persistence, authentication, direct Kaggle API calls, a details view, aggregation, new prioritization rules, or a data-browser mode.

Frontend Design will decide visual placement and styling of the source picker, loading, labels, and Retry controls without changing this functionality.

## Recommended commit sequence

1. Shared source controller, internal validation contract, and FreshRoute source tests.
2. Kaggle parser/normalizer, deterministic selector, metadata preservation, and unit tests.
3. Source-switching behavior, source-aware renderer content, and browser tests after Frontend Design approval.
4. README, handoff, verified attribution, and final review.
