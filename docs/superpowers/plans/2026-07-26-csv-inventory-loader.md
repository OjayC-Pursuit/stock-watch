# StockWatch V2.1 CSV Inventory Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only CSV import flow that starts StockWatch empty, validates a complete inventory file, and renders approved FreshRoute Receiving Manifest Dock states without changing the existing inventory evaluator rules.

**Architecture:** Add a focused CSV parser, a focused inventory validator, and a browser import controller. The existing evaluator continues to assign statuses, reasons, timing, and actions; existing count/sort functions continue to prepare results. Refactor the renderer into one state-driven dashboard render that owns the dock, summary rail, headline, and product cards.

**Tech Stack:** Plain HTML, CSS, JavaScript ES modules, browser File APIs, Node's built-in test runner, and the already-present local Playwright 1.61.1 only for browser verification.

## Global Constraints

- Preserve V2's Cold-Chain Signal Board palette, header, lined workspace, page width, summary rail, hero, and cards.
- Use browser File APIs only. Add no backend, database, persistence, framework, CSV library, package, or production server.
- The app opens empty; it never loads `data/sample-inventory.json` by default.
- Keep parser, validator, evaluator, counting/sorting, renderer, and browser controller as separate responsibilities.
- Imports are all-or-nothing. Invalid replacements preserve the active products, counts, headline, and filename.
- Keep `.superpowers/` untracked; do not copy its preview code into production.
- Use the fixed evaluator date `2026-07-22`; do not change evaluator rules or hardcode demo outcomes in the dashboard.
- Implement the exact approved status messages and the required EMPTY, CHECKING, ACTIVE, HOLD, and reset visuals.
- A test-only static host may serve ES modules to Playwright; it is not an application feature, dependency, or deployed server.

## Planned File Map

| File | Change | Responsibility |
| --- | --- | --- |
| `csv-parser.js` | Create | Parse RFC-style quoted CSV text into raw rows; reject malformed quoting. |
| `inventory-validator.js` | Create | Check headers and row values, normalize product objects, and return capped row/column errors. |
| `inventory-import-controller.js` | Create | Hold temporary browser-session state, read selected files, preserve active state on failures, and invoke rendering. |
| `dashboard-renderer.js` | Modify | Render the Receiving Manifest Dock, zero-count rail, imported headlines, and existing cards from a view model. |
| `script.js` | Modify | Wire the real file input and dock controls to the import controller; remove default JSON loading. |
| `index.html` | Modify | Provide the app shell only; preserve the V2 header and load the updated module. |
| `styles.css` | Modify | Add approved dock, error, focus, responsive, and reduced-motion styling without redesigning V2. |
| `data/demo-csv/*.csv` | Create | Five documented, header-based CSV scenarios for demo and tests. |
| `tests/csv-parser.test.js` | Create | Parser unit coverage. |
| `tests/inventory-validator.test.js` | Create | Schema and normalization unit coverage. |
| `tests/inventory-import-controller.test.js` | Create | Atomic import and reset integration coverage using test doubles. |
| `tests/dashboard-renderer.test.js` | Modify | Dock markup, headline grammar, semantics, and live-region regression coverage. |
| `tests/csv-demo-scenarios.test.js` | Create | Read demo files, evaluate them, and assert approved totals and headlines. |
| `tests/helpers/static-server.cjs` | Create | Test-only local static host for browser checks; never imported by app code. |
| `tests/csv-loader.browser.test.js` | Create | Playwright browser verification for import, failure preservation, reset, widths, console, and overflow. |
| `README.md` | Modify last | Document V2.1 only after verified implementation. |
| `docs/HANDOFF.md` | Modify last | Record verified implementation facts and the next task only after verification. |

## Shared Interfaces

```js
// csv-parser.js
export function parseCsv(text);
// Returns { ok: true, rows: Array<{ line: number, cells: string[] }> }
// or { ok: false, error: { line: number, column: number, message: string } }.

// inventory-validator.js
export const REQUIRED_COLUMNS;
export const OPTIONAL_COLUMNS;
export function validateInventoryRows(rows, { idPrefix = 'import' } = {});
// Returns { ok: true, products } or { ok: false, message, errors }.

// inventory-import-controller.js
export function createInventoryImportController(dependencies);
// Returns { getState, importFile, reset }.

// dashboard-renderer.js
export function getImportedHeadline(counts);
export function createEmptyCounts();
export function renderDashboard(container, viewModel);
```

`viewModel` is `{ phase, activeFileName, attemptedFileName, statusMessage, errors, evaluatedProducts, counts }`, where `phase` is `empty`, `checking`, `active`, or `hold`. The reset confirmation is an EMPTY view model with its exact status message, not a new operational state.

---

### Task 1: Parse quoted CSV text independently

**Files:**
- Create: `csv-parser.js`
- Create: `tests/csv-parser.test.js`

**Interfaces:**
- Produces `parseCsv(text)` for the validator; it never knows CSV business-column names.

- [ ] **Step 1: Write parser tests first**

```js
test('parses quoted commas, escaped quotes, and blank lines', () => {
  const result = parseCsv('productName,brand\n"Cream, Heavy","Fresh ""Route"""\n\nMilk,Hearth');
  assert.deepEqual(result, {
    ok: true,
    rows: [
      { line: 1, cells: ['productName', 'brand'] },
      { line: 2, cells: ['Cream, Heavy', 'Fresh "Route"'] },
      { line: 4, cells: ['Milk', 'Hearth'] },
    ],
  });
});

test('reports an unclosed quoted field with its source line', () => {
  assert.deepEqual(parseCsv('productName\n"Whole Milk'), {
    ok: false,
    error: { line: 2, column: 1, message: 'Unclosed quoted field.' },
  });
});
```

- [ ] **Step 2: Run the focused test before implementation**

Run: `node --test tests/csv-parser.test.js`

Expected: FAIL because `csv-parser.js` does not exist.

- [ ] **Step 3: Implement the smallest character-by-character parser**

```js
export function parseCsv(text) {
  // Track line, column, current cell, current row, and quoted-field mode.
  // Treat doubled quotes inside quotes as one literal quote.
  // Ignore only rows where every parsed cell trims to an empty string.
  // Return the first malformed-quote error without validating headers or values.
}
```

- [ ] **Step 4: Extend tests for CRLF, final newline, and a partial row**

```js
test('keeps a partial row for the validator instead of dropping it', () => {
  const result = parseCsv('productName,category\nWhole Milk');
  assert.deepEqual(result.rows[1], { line: 2, cells: ['Whole Milk'] });
});
```

- [ ] **Step 5: Verify and checkpoint**

Run: `node --test tests/csv-parser.test.js`

Expected: PASS; parser supports approved quoting and leaves schema decisions to the validator.

Checkpoint: Review that the parser neither evaluates products nor silently repairs malformed input.

### Task 2: Validate headers and normalize business rows

**Files:**
- Create: `inventory-validator.js`
- Create: `tests/inventory-validator.test.js`

**Interfaces:**
- Consumes `parseCsv(...).rows`.
- Produces `{ ok: true, products }` or `{ ok: false, message, errors }`.

- [ ] **Step 1: Write failing schema tests**

```js
test('accepts required headers in arbitrary order and ignores unknown columns', () => {
  const result = validateInventoryRows(rowsWithReorderedHeadersAndExtraColumn);
  assert.equal(result.ok, true);
  assert.equal(result.products[0].productName, 'Whole Milk');
});

test('rejects a missing, renamed, or duplicate required header', () => {
  const result = validateInventoryRows(rowsWithDuplicateQuantityHeader);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors[0], {
    row: 1, column: 'quantityOnHand', explanation: 'Header must appear exactly once.',
  });
});
```

- [ ] **Step 2: Run before implementation**

Run: `node --test tests/inventory-validator.test.js`

Expected: FAIL because the validator module does not exist.

- [ ] **Step 3: Implement header mapping and strict field validation**

```js
export const REQUIRED_COLUMNS = [
  'productName', 'category', 'brand', 'quantityOnHand',
  'reorderThreshold', 'salesRatePerDay', 'expirationDate',
];
export const OPTIONAL_COLUMNS = ['id', 'storageCondition'];

export function validateInventoryRows(rows, options = {}) {
  // Trim headers/cells, require exact case-sensitive names after trimming,
  // map any header order, and retain source line numbers for errors.
}
```

- [ ] **Step 4: Add row-value tests before expanding implementation**

```js
test('rejects blank required text, invalid dates, and non-finite numeric values', () => {
  const result = validateInventoryRows(rowsWithBlankBrandBadDateAndInfinity);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(({ row, column }) => [row, column]), [
    [2, 'brand'], [2, 'quantityOnHand'], [2, 'expirationDate'],
  ]);
});

test('accepts zero and decimal sales values without creating an evaluator rule', () => {
  const result = validateInventoryRows(rowsWithZeroAndDecimalNumbers);
  assert.equal(result.ok, true);
  assert.equal(result.products[0].salesRatePerDay, 0);
});
```

- [ ] **Step 5: Implement normalization and error capping**

```js
// Numeric values use Number(value) plus Number.isFinite(value) and value >= 0.
// Dates must match /^\d{4}-\d{2}-\d{2}$/ and round-trip as the same UTC date.
// Return at most five { row, column, explanation } entries and additionalErrorCount.
```

- [ ] **Step 6: Verify and checkpoint**

Run: `node --test tests/inventory-validator.test.js`

Expected: PASS for whitespace trimming, exact header names, duplicate detection, required text, real dates, finite nonnegative decimals, malformed rows, and capped row/column errors.

Checkpoint: Confirm no validator result invokes evaluator, renderer, File APIs, or DOM APIs.

### Task 3: Add optional fields and row limits to the validator boundary

**Files:**
- Modify: `inventory-validator.js`
- Modify: `tests/inventory-validator.test.js`

**Interfaces:**
- `validateInventoryRows` keeps the same result shape; valid rows include `id` and `storageCondition`.

- [ ] **Step 1: Write failing optional-field and limit tests**

```js
test('generates unique temporary IDs and defaults storage condition', () => {
  const result = validateInventoryRows(rowsWithoutOptionalHeaders, { idPrefix: 'import' });
  assert.equal(result.ok, true);
  assert.match(result.products[0].id, /^import-1$/);
  assert.equal(result.products[0].storageCondition, 'Not specified');
});

test('rejects duplicate supplied IDs and more than 250 nonblank product rows', () => {
  assert.equal(validateInventoryRows(rowsWithDuplicateId).ok, false);
  assert.equal(validateInventoryRows(rowsWith251Products).message,
    'The file exceeds the 250-product import limit.');
});
```

- [ ] **Step 2: Run before implementation**

Run: `node --test tests/inventory-validator.test.js`

Expected: FAIL for missing optional-field behavior and row-limit behavior.

- [ ] **Step 3: Implement optional normalization and row count**

```js
// Use supplied nonblank id values only when unique.
// Generate import-1, import-2, ... for missing or blank IDs.
// Default missing or blank storageCondition to 'Not specified'.
// Count nonblank product rows after parsing; reject row 251 and later as one file-level error.
```


- [ ] **Step 4: Verify and checkpoint**

Run: `node --test tests/inventory-validator.test.js`

Expected: PASS for optional columns, supplied-ID duplicates, generated temporary IDs, storage defaults, the 250-row guard, and valid zero sales.

Checkpoint: Verify none of these defaults persist across a controller reset or page refresh.

### Task 4: Build the all-or-nothing browser import controller

**Files:**
- Create: `inventory-import-controller.js`
- Create: `tests/inventory-import-controller.test.js`

**Interfaces:**
- Consumes injected `readText`, `parseCsv`, `validateInventoryRows`, evaluator/count/sort functions, and `render` callback.
- Produces `getState()`, `importFile(file)`, and `reset()`.

- [ ] **Step 1: Write controller integration tests first**

```js
test('starts empty and replaces state only after the whole CSV validates', async () => {
  const controller = createInventoryImportController(dependenciesFor(validCsv));
  assert.deepEqual(controller.getState().counts, createEmptyCounts());
  await controller.importFile(csvFile('balanced-inventory.csv'));
  assert.equal(controller.getState().phase, 'active');
  assert.equal(controller.getState().activeFileName, 'balanced-inventory.csv');
});

test('keeps active products and filename after a failed replacement', async () => {
  const controller = createControllerAfterSuccessfulBalancedImport();
  await controller.importFile(csvFile('invalid-inventory.csv'));
  assert.equal(controller.getState().phase, 'hold');
  assert.equal(controller.getState().activeFileName, 'balanced-inventory.csv');
  assert.equal(controller.getState().counts.Safe, 4);
});

test('rejects a non-CSV file and a file larger than one megabyte before parsing', async () => {
  assert.equal(getFileSelectionError({ name: 'inventory.txt', size: 3 }), 'Choose a .csv inventory file.');
  assert.equal(getFileSelectionError({ name: 'inventory.csv', size: 1_048_577 }),
    'The file exceeds the 1 MB import limit.');
});
```

- [ ] **Step 2: Run before implementation**

Run: `node --test tests/inventory-import-controller.test.js`

Expected: FAIL because the controller module does not exist.

- [ ] **Step 3: Implement state transitions with injected file reading**

```js
export function createInventoryImportController({ readText, parseCsv, validateInventoryRows, evaluateProduct, getStatusCounts, sortEvaluatedProducts, render }) {
  // Start with empty counts and no products.
  // Render CHECKING immediately, then replace active inventory only on complete success.
  // Preserve the prior active snapshot on parse, validation, type, size, or read failure.
  // Call render after every state transition.
}

export function getFileSelectionError(file) {
  if (!file || !file.name.toLowerCase().endsWith('.csv')) return 'Choose a .csv inventory file.';
  if (file.size > 1_048_576) return 'The file exceeds the 1 MB import limit.';
  return null;
}
```

- [ ] **Step 4: Add exact-message and reset tests**

```js
test('uses exact empty, success, failure, and reset messages', async () => {
  // Assert approved messages, including singular success for one product.
});

test('reset immediately clears memory and returns to EMPTY without sample data', async () => {
  // Assert null filename, no evaluated products, four zero counts, and reset confirmation.
});
```

- [ ] **Step 5: Implement browser File API adapter in `script.js` only**

```js
const readText = (file) => file.text();
fileInput.addEventListener('change', () => controller.importFile(fileInput.files[0]));
```

- [ ] **Step 6: Verify and checkpoint**

Run: `node --test tests/inventory-import-controller.test.js`

Expected: PASS; wrong-type and oversized files use exact messages before parsing, active state changes only after a whole-file success, failures preserve the active snapshot, and reset returns to import-first EMPTY.

Checkpoint: Inspect controller tests for accidental sample-data fetches, local storage, confirmation dialogs, or partial imports.

### Task 5: Refactor the renderer for dock states and imported headlines

**Files:**
- Modify: `dashboard-renderer.js`
- Modify: `tests/dashboard-renderer.test.js`

**Interfaces:**
- Consumes the controller's `viewModel`.
- Produces dock markup, zero-count rail, results markup, and `getImportedHeadline(counts)`.

- [ ] **Step 1: Write renderer tests before changing markup**

```js
test('renders EMPTY with zero counts, no product cards, and the approved import heading', () => {
  renderDashboard(container, emptyViewModel);
  assert.match(container.innerHTML, /Import a CSV inventory file to begin\./);
  assert.doesNotMatch(container.innerHTML, /class="product-card/);
});

test('uses imported headline grammar from evaluated counts', () => {
  assert.equal(getImportedHeadline({ Urgent: 1, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0 }),
    '1 case is at the red line.');
  assert.equal(getImportedHeadline({ Urgent: 0, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 4 }),
    '2 products need attention today.');
  assert.equal(getImportedHeadline({ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 6 }),
    'Inventory is clear for today.');
});
```

- [ ] **Step 2: Run before implementation**

Run: `node --test tests/dashboard-renderer.test.js`

Expected: FAIL because the current renderer only accepts products and counts and always emits the V2 urgent hero.

- [ ] **Step 3: Implement state-aware rendering without evaluator logic**

```js
export function createEmptyCounts() {
  return { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0 };
}

export function getImportedHeadline(counts) {
  // Urgent first; otherwise Low Stock + Expiring Soon; otherwise clear.
}

export function renderDashboard(container, viewModel) {
  // Render dock + rail in all states; render hero/cards only with active evaluated products.
}
```

- [ ] **Step 4: Add HOLD, active-file, error-list, and semantics tests**

```js
test('renders active and attempted filenames separately after a failed replacement', () => {
  renderDashboard(container, holdViewModel);
  assert.match(container.innerHTML, /ACTIVE FILE/);
  assert.match(container.innerHTML, /ATTEMPTED FILE/);
  assert.match(container.innerHTML, /<ul class="error-list"/);
});

test('keeps exactly one compact live status and no dashboard live region', () => {
  renderDashboard(container, holdViewModel);
  assert.equal((container.innerHTML.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.doesNotMatch(container.innerHTML, /class="dashboard"[^>]*aria-live/);
});
```

- [ ] **Step 5: Verify and checkpoint**

Run: `node --test tests/dashboard-renderer.test.js`

Expected: PASS for exact headings, zero rail, dock hierarchy, success/failure/reset copy, five-error cap display, semantic list, and existing V2 card content.

Checkpoint: Confirm renderer neither parses CSV nor mutates controller state.

### Task 6: Integrate the real dock controls and approved CSS

**Files:**
- Modify: `index.html`
- Modify: `script.js`
- Modify: `styles.css`
- Modify: `tests/dashboard-renderer.test.js`

**Interfaces:**
- `index.html` supplies the `#app` mount only; the renderer supplies a real labeled file input and controls.
- `script.js` delegates click, file-change, and reset events to the controller.

- [ ] **Step 1: Write markup regression tests first**

```js
test('uses a real labeled file input and non-modal controls', () => {
  renderDashboard(container, emptyViewModel);
  assert.match(container.innerHTML, /<input[^>]+type="file"/);
  assert.match(container.innerHTML, /accept="\.csv"/);
  assert.doesNotMatch(container.innerHTML, /<dialog|role="dialog"/);
});
```

- [ ] **Step 2: Run before implementation**

Run: `node --test tests/dashboard-renderer.test.js`

Expected: FAIL because the current V2 markup has no import control.

- [ ] **Step 3: Implement event wiring and loading removal**

```js
// Remove fetch('./data/sample-inventory.json') and loadDashboard().
// Render EMPTY on startup, bind Choose/Replace to the file input, and bind Clear to controller.reset().
// During CHECKING, disable import and reset controls; do not add a timeout.
```

- [ ] **Step 4: Implement approved styles exactly**

```css
/* Desktop expanded: padding: 24px 28px; grid approximately 70/30; gap: 28px. */
/* Desktop compact: padding: 14px 18px; grid 1fr auto; column-gap: 30px; row-gap: 18px. */
/* <=640px: 18px padding and full-width controls. <=350px: 14px padding and vertical actions. */
/* No fixed dock height; filenames, messages, and errors wrap. */
```

- [ ] **Step 5: Add accessibility/reduced-motion test assertions**

```js
test('keeps one primary heading per displayed state and exposes error focus target', () => {
  renderDashboard(container, firstImportHoldViewModel);
  assert.match(container.innerHTML, /id="import-error-summary" tabindex="-1"/);
});
```

- [ ] **Step 6: Verify and checkpoint**

Run: `node --test tests/dashboard-renderer.test.js tests/inventory-import-controller.test.js`

Expected: PASS; app startup is empty, control markup is semantic, no confirmation dialog exists, and the source no longer fetches sample inventory on load.

Checkpoint: Compare CSS against the visual spec: top rule, square corners, 44px controls, CHECKING two-pixel line only, 3px/3px two-layer focus, HOLD left edge, 390px and 320px spacing.

### Task 7: Create evaluator-driven CSV scenarios and automated scenario coverage

**Files:**
- Create: `data/demo-csv/balanced-inventory.csv`
- Create: `data/demo-csv/high-urgency-inventory.csv`
- Create: `data/demo-csv/expiration-heavy-inventory.csv`
- Create: `data/demo-csv/all-safe-inventory.csv`
- Create: `data/demo-csv/invalid-inventory.csv`
- Create: `tests/csv-demo-scenarios.test.js`

**Interfaces:**
- Every valid file has a header row and six rows using all nine supported columns: the seven required columns plus optional `id` and `storageCondition`.
- Test flow is parser → validator → evaluator → counts → headline.

| File | Exact evaluated totals | Exact headline |
| --- | --- | --- |
| `balanced-inventory.csv` | 0 Urgent / 1 Low Stock / 1 Expiring Soon / 4 Safe | `2 products need attention today.` |
| `high-urgency-inventory.csv` | 4 Urgent / 1 Low Stock / 1 Expiring Soon / 0 Safe | `4 cases are at the red line.` |
| `expiration-heavy-inventory.csv` | 0 Urgent / 0 Low Stock / 5 Expiring Soon / 1 Safe | `5 products need attention today.` |
| `all-safe-inventory.csv` | 0 Urgent / 0 Low Stock / 0 Expiring Soon / 6 Safe | `Inventory is clear for today.` |
| `invalid-inventory.csv` | No import; preserve the previously active results | No new dashboard headline |

- [ ] **Step 1: Write failing scenario tests first**

```js
const expected = {
  'balanced-inventory.csv': [{ Urgent: 0, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 4 }, '2 products need attention today.'],
  'high-urgency-inventory.csv': [{ Urgent: 4, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 0 }, '4 cases are at the red line.'],
  'expiration-heavy-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 5, Safe: 1 }, '5 products need attention today.'],
  'all-safe-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 6 }, 'Inventory is clear for today.'],
};
```

- [ ] **Step 2: Run before creating data**

Run: `node --test tests/csv-demo-scenarios.test.js`

Expected: FAIL because the demo CSV files do not exist.

- [ ] **Step 3: Create each data file from evaluator math, not display rules**

```text
balanced: 0 / 1 / 1 / 4; Heavy Cream low; Plain Greek Yogurt expiring.
high-urgency: 4 / 1 / 1 / 0; all four Urgent rows have real evaluator reasons.
expiration-heavy: 0 / 0 / 5 / 1; five rows expire in 2–7 days with healthy stock.
all-safe: 0 / 0 / 0 / 6; all rows are safe.
invalid: valid header; negative quantity and invalid date produce row-and-column errors.
```

- [ ] **Step 4: Add invalid-file preservation test**

```js
test('rejects invalid-inventory.csv and keeps a previously imported dashboard active', async () => {
  // Import balanced, then invalid; assert original counts/headline/active filename remain.
});
```

- [ ] **Step 5: Verify and checkpoint**

Run: `node --test tests/csv-demo-scenarios.test.js tests/inventory-import-controller.test.js`

Expected: PASS with exact approved totals and grammar-correct headlines produced by the evaluator pipeline; no dashboard code contains demo-specific count branches.

Checkpoint: Inspect the valid CSV headers and confirm all six-row files include `id` and `storageCondition` while the validator still accepts their absence in other user files.

### Task 8: Add browser-level import and responsive verification

**Files:**
- Create: `tests/helpers/static-server.cjs`
- Create: `tests/csv-loader.browser.test.js`

**Interfaces:**
- Test helper serves repository files locally only while browser tests run.
- Browser tests use `node_modules/playwright` version 1.61.1 already present in this checkout; no package manifest or dependency install is added.

- [ ] **Step 1: Write Playwright checks before browser integration**

```js
test('opens empty, imports a valid CSV, preserves active results on invalid replacement, and resets', async () => {
  // Assert 0/0/0/0, no cards, then balanced 0/1/1/4 and its headline.
  // Upload invalid-inventory.csv and assert the active filename and cards stay visible.
  // Click Clear inventory and assert EMPTY with no dialog.
});

test('has no console errors or horizontal overflow at desktop, 390px, and 320px', async () => {
  // Capture page errors/console errors; set each viewport; assert document scrollWidth <= innerWidth.
});
```

- [ ] **Step 2: Run before adding the browser harness**

Run: `node tests/csv-loader.browser.test.js`

Expected: FAIL because the browser test and test-only static host do not exist.

- [ ] **Step 3: Implement the test-only static host and browser spec**

```js
// tests/helpers/static-server.cjs serves files rooted at the repository for tests only.
// It does not appear in index.html, script.js, README runtime instructions, or deployment files.
// Browser test uses Playwright's chromium, FileChooser/setInputFiles, and temporary fixture paths.
```

- [ ] **Step 4: Verify accessibility browser behavior**

```js
// Assert one [aria-live="polite"][aria-atomic="true"] element, no live #app,
// focus moves to #import-error-summary on failure, and reduced-motion scan marker is stationary.
```

- [ ] **Step 5: Verify and checkpoint**

Run: `node tests/csv-loader.browser.test.js`

Expected: PASS at 1280px, 390px, and 320px with no console errors, no horizontal overflow, correctly wrapped filenames/errors, full-width mobile controls, and the active board preserved after invalid replacement.

Checkpoint: Save only approved final V2.1 screenshots if separately authorized; do not add temporary preview artifacts from `.superpowers/`.

### Task 9: Run full review and update user-facing documentation after verified behavior

**Files:**
- Modify: `README.md`
- Modify: `docs/HANDOFF.md`
- Review: all V2.1 application, test, data, and documentation files.

**Interfaces:**
- README describes verified behavior only.
- HANDOFF records current verified state and the next exact task only after all checks pass.

- [ ] **Step 1: Run the complete automated suite**

Run: `node --test tests/inventory-evaluator.test.js tests/dashboard-renderer.test.js tests/csv-parser.test.js tests/inventory-validator.test.js tests/inventory-import-controller.test.js tests/csv-demo-scenarios.test.js && node tests/csv-loader.browser.test.js`

Expected: PASS; evaluator regression totals remain 4 / 1 / 2 / 1 for the original sample data, every new unit/integration test passes, and browser checks pass.

- [ ] **Step 2: Perform final review before documentation**

```text
Review for bugs: atomic replacement, malformed input, file limits, reset, exact messages.
Review for maintainability: parser/validator/controller/renderer boundaries stay separate.
Review for accessibility: file input label, focus, headings, one live status, errors outside live region, reduced motion.
Review for tests: unit, integration, scenario, and browser coverage match every approved state.
Review for security: local File API only, no upload/network endpoint, safe text rendering, no dependency addition.
```

- [ ] **Step 3: Update README with verified V2.1 facts**

```markdown
CSV file selected → parsed and validated → evaluated → dashboard updated → reset returns empty state
```

Document the seven required columns, two optional columns, session-only imported data, and each demo CSV's purpose. Do not claim persistence, supplier integration, uploads to a server, or automatic orders.

- [ ] **Step 4: Update HANDOFF using verification evidence**

```text
Record V2.1 implementation status, exact test commands/results, demo files, browser widths, console result, next task, and any remaining blockers.
Keep .superpowers/ untracked and exclude it from any commit.
```

- [ ] **Step 5: Final repository checks and approval checkpoint**

Run: `git diff --check; git status --short --branch; git diff --name-only`

Expected: no whitespace errors; only intended V2.1 app, test, demo-data, README, HANDOFF, and approved documentation/screenshot files are present; `.superpowers/` remains untracked.

Checkpoint: Present findings, test evidence, screenshots, and the exact intended commit file list for user approval. Do not stage, commit, push, or deploy until the user explicitly approves.
