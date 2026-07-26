# StockWatch V2.1 CSV Inventory Loader Design

## Purpose and Scope

V2.1 adds a browser-only CSV inventory loader to StockWatch. It lets an Inventory Coordinator select a local `.csv` file and use its validated rows as the current in-memory inventory for the existing dashboard.

The feature is import-first. StockWatch does not load the built-in eight-product sample inventory on page load. The sample data remains in the repository for automated tests and for later demo CSV files, but it is not the default dashboard state.

V2.1 uses plain HTML, CSS, and JavaScript with browser file APIs only. It adds no backend, database, account system, upload server, persistence, framework, package, or CSV library.

## Responsibilities and Data Flow

Keep the responsibilities separate:

1. The CSV parser reads quoted CSV text and converts rows into raw values.
2. The validator checks the schema and normalizes valid rows into inventory product objects.
3. The existing evaluator determines status, reasons, timing, and recommended actions.
4. The existing count and sort functions prepare dashboard results.
5. The existing renderer displays counts, headlines, and product cards.

The import flow is:

```text
CSV file selected
→ parse rows
→ validate and normalize the complete file
→ evaluate every imported product
→ count statuses and sort products
→ render the existing dashboard
```

The app keeps one active inventory in memory for the current browser session. It begins empty, replaces its active inventory only after a complete valid import, and clears all imported data on reset. Refreshing the page returns to the empty state.

## Empty State and Reset

Before a CSV is loaded, the dashboard must:

- show `0` for Urgent, Low Stock, Expiring Soon, and Safe;
- show no product cards;
- display `Import a CSV inventory file to begin.`;
- make the CSV import control the primary next action.

Reset immediately returns to this same empty state. It:

- removes imported products from memory;
- clears the active filename;
- sets every summary count to `0`;
- removes product cards;
- restores `Import a CSV inventory file to begin.`;
- shows `Inventory cleared. Import a CSV inventory file to begin.`;
- uses no confirmation dialog; and
- never restores the built-in sample inventory.

## File Selection and Active Import State

The browser file control accepts `.csv` files. Selecting a file immediately starts validation and import.

After a successful import, the dashboard displays the active filename, the imported product count, and a success message:

- `Imported filename.csv — 1 product loaded.`
- `Imported filename.csv — N products loaded.`

The active filename becomes visible only after the whole file passes validation. Imported data is temporary and exists only for the current browser session.

If an import fails, StockWatch keeps the active products, counts, headline, and active filename unchanged. The attempted filename may appear in the error message but never becomes the active filename.

## Supported CSV Schema

Headers may appear in any order. Leading and trailing whitespace in headers and values is trimmed. After trimming, supported header names are exact and case-sensitive. Extra unfamiliar columns are allowed and ignored.

Required headers, each appearing exactly once:

| Header | Type and rule |
| --- | --- |
| `productName` | Nonblank text |
| `category` | Nonblank text |
| `brand` | Nonblank text |
| `quantityOnHand` | Finite number greater than or equal to zero; decimals allowed |
| `reorderThreshold` | Finite number greater than or equal to zero; decimals allowed |
| `salesRatePerDay` | Finite number greater than or equal to zero; decimals allowed |
| `expirationDate` | Real calendar date in exact `YYYY-MM-DD` format |

Optional headers:

| Header | Behavior |
| --- | --- |
| `id` | A nonblank supplied value must be unique. Missing or blank values receive a unique in-memory ID that does not persist after refresh. |
| `storageCondition` | Missing or blank values become `Not specified`. |

`reorderQuantity` and `reviewed` are not part of the V2.1 import schema because the existing prioritization and dashboard do not need them.

The implementation and demo CSV template must document all nine supported columns and clearly mark `id` and `storageCondition` as optional.

## Parsing and Validation

The parser supports standard CSV quoting:

- commas inside quoted cells;
- escaped double quotes; and
- completely blank lines, which are ignored.

Malformed quoting, including unclosed quoted cells, rejects the file. A partially filled row is not ignored and rejects the file.

Validation occurs before any active dashboard state changes. The import is all-or-nothing: one invalid required value rejects the complete file; StockWatch never silently skips invalid rows or renders a partial import.

Reject the file when it contains any of the following:

- a missing, renamed, duplicate, or unsupported-form required header;
- a blank required text value;
- a blank, negative, nonnumeric, `NaN`, `Infinity`, or `-Infinity` numeric value;
- an invalid or incorrectly formatted expiration date;
- a duplicate nonblank supplied ID;
- malformed CSV syntax;
- no header row;
- a header row with no product rows;
- more than 250 nonblank product rows; or
- a file larger than 1 MB.

Zero sales rate is valid. It remains non-projectable and must not trigger the existing Urgent stockout rule.

Errors identify the CSV row and column. The first five errors are shown, followed by the count of additional errors when applicable.

Exact status messages:

- Invalid file: `Could not import filename.csv. Fix the listed issues and try again.`
- Empty file: `The file does not contain a CSV header row.`
- Header-only file: `The file has no product rows to import.`
- File too large: `The file exceeds the 1 MB import limit.`
- Too many rows: `The file exceeds the 250-product import limit.`
- Wrong file type: `Choose a .csv inventory file.`

## Dashboard Results and Headlines

For a valid import, every normalized product continues through the existing evaluator, status count, sort order, and renderer. V2 prioritization rules, the fixed demo date, reasons, timing, display-only recommended actions, and visual design remain unchanged.

The imported-result headline derives from evaluated status totals:

1. When Urgent is greater than zero:
   - `1 case is at the red line.`
   - `N cases are at the red line.`
2. Otherwise, when Low Stock plus Expiring Soon is greater than zero:
   - `1 product needs attention today.`
   - `N products need attention today.`
3. Otherwise:
   - `Inventory is clear for today.`

The empty and reset states do not use any imported-result headline. They use `Import a CSV inventory file to begin.` instead.

## Demo CSV Scenarios

Create these files during implementation under an appropriate repository data folder. Every valid file has six product rows and the approved nine-column schema with a header row. The values must be calculated so the existing evaluator, not hardcoded display logic, produces the stated results.

| File | Purpose | Expected totals | Expected headline | Key demonstration |
| --- | --- | --- | --- | --- |
| `balanced-inventory.csv` | Normal mixed day | 0 Urgent / 1 Low Stock / 1 Expiring Soon / 4 Safe | `2 products need attention today.` | Heavy Cream is Low Stock; Plain Greek Yogurt is Expiring Soon; four products are Safe. |
| `high-urgency-inventory.csv` | Immediate inventory risk | 4 Urgent / 1 Low Stock / 1 Expiring Soon / 0 Safe | `4 cases are at the red line.` | Four products meet approved Urgent rules through projected stockout, low stock plus near expiry, or expiration. |
| `expiration-heavy-inventory.csv` | Shelf-life pressure | 0 Urgent / 0 Low Stock / 5 Expiring Soon / 1 Safe | `5 products need attention today.` | Five products expire in 2–7 days with healthy stock; none qualify as Urgent or Low Stock. |
| `all-safe-inventory.csv` | Healthy inventory | 0 Urgent / 0 Low Stock / 0 Expiring Soon / 6 Safe | `Inventory is clear for today.` | Six well-stocked products with later expiry dates. |
| `invalid-inventory.csv` | Error-state demonstration | No import; current dashboard remains unchanged | No new dashboard headline | Uses a valid header row plus invalid values such as a negative quantity and incorrectly formatted date, producing row-and-column errors. |

## Verification Requirements

Automated tests must cover:

- quoted values, escaped quotes, blank lines, malformed quotes, and extra columns;
- required headers, arbitrary header order, duplicate supported headers, exact header names, and whitespace trimming;
- required text values;
- strict real `YYYY-MM-DD` dates;
- finite nonnegative numeric rules, including rejection of `NaN`, `Infinity`, `-Infinity`, negatives, blanks, and nonnumeric values;
- valid zero sales rate and non-projectable stockout behavior;
- optional ID generation, duplicate supplied IDs, and the `Not specified` storage default;
- empty files, header-only files, malformed rows, the 1 MB limit, and the 250-product limit;
- capped error reporting;
- all-or-nothing valid import replacement;
- failed import preservation of prior active products, counts, headline, and filename;
- reset to the empty state;
- exact totals and grammar-correct headlines for every valid demo CSV; and
- rejection of `invalid-inventory.csv` with row-and-column errors and preservation of the previous dashboard.

Browser verification must confirm:

- the page opens in the empty import-first state;
- selecting a valid CSV immediately imports it;
- filename, product count, summary totals, headline, and cards update together;
- invalid CSV imports preserve the active dashboard;
- reset returns to empty without a dialog;
- refresh clears imported data;
- desktop, 390px mobile, and 320px narrow layouts remain usable; and
- the browser console has no errors.

## Documentation Requirements

After V2.1 is implemented and verified, update `README.md` to include:

- the CSV selection → parsing and validation → evaluation → dashboard update → reset user flow;
- the supported required and optional CSV columns;
- imported-data temporary-session behavior; and
- every demo CSV file and what it demonstrates.

Update `docs/HANDOFF.md` only after implementation and verification, using verified current state, completed work, the next exact task, settled decisions, blockers, and verification commands.

## Boundaries for the Next Phase

This specification owns V2.1 functionality only. Frontend Design will decide the CSV loader’s exact placement, styling, filename/status presentation, success/error/loading/reset visual states, and desktop/mobile presentation. Frontend Design must not change the CSV schema, validation, import transaction behavior, dashboard rules, or demo outcomes.

No implementation plan or application code is authorized until the functional specification and later Frontend Design decisions are approved.
