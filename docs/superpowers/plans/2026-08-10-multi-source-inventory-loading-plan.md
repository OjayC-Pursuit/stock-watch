# StockWatch Multi-Source Inventory Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add validated FreshRoute, uploaded CSV, and deterministic Kaggle historical inventory sources without changing StockWatch’s evaluator.

**Architecture:** Source adapters produce normalized StockWatch records. A shared internal validator checks those records, then the existing evaluator, count/sort functions, and renderer run unchanged. The controller owns atomic replacement, source state, Retry, and Reset. The renderer owns the approved Source Manifest Switchboard markup and source-aware copy.

**Tech Stack:** Plain HTML, CSS, JavaScript ES modules, browser File APIs, local bundled-file fetches, Node built-in test runner, and existing Playwright. No package, backend, persistence, database, framework, or live Kaggle API call.

## Global Constraints

- Functional spec: docs/superpowers/specs/2026-08-10-multi-source-inventory-loading-design.md.
- Visual spec: docs/superpowers/specs/2026-08-10-multi-source-inventory-loading-visual-design.md.
- Preserve the evaluator fixed date 2026-07-22, statuses, reasons, actions, counts, and sorting.
- Preserve the existing uploaded CSV schema, 1 MB limit, 250-row limit, all-or-nothing validation, and invalid-CSV recovery.
- Final active inventory is exactly 8 FreshRoute records, at most 250 uploaded products, or exactly 80 Kaggle records.
- The 4,325-row Kaggle source never reaches the evaluator renderer boundary.
- Keep .superpowers ignored. Do not commit, push, merge, or deploy without user approval.

## File Map

| File | Change | Responsibility |
| --- | --- | --- |
| inventory-normalizer.js | Create | Validate normalized StockWatch records independently of source format. |
| inventory-source-loaders.js | Create | FreshRoute adapter, Kaggle schema/row adapter, and deterministic selector. |
| inventory-import-controller.js | Modify | Source-aware atomic loading, Retry, Reset, and source state. |
| inventory-validator.js | Modify minimally | Keep current CSV behavior; export strict helper only when it avoids duplication. |
| dashboard-renderer.js | Modify | Source picker, source state, Kaggle labels/context, recovery markup. |
| script.js | Modify | File API and local fetch adapters plus UI event delegation. |
| styles.css | Modify | Approved source lanes, historical stripe, states, responsive layouts. |
| tests/inventory-normalizer.test.js | Create | Common internal validation. |
| tests/inventory-source-loaders.test.js | Create | FreshRoute/Kaggle adapters and selection. |
| tests/inventory-import-controller.test.js | Modify | Source transactions, failure preservation, Retry, Reset. |
| tests/dashboard-renderer.test.js | Modify | Approved markup, copy, and semantics. |
| tests/csv-loader.browser.test.js | Modify | End-to-end sources and desktop/mobile verification. |
| README.md | Modify last | Verified source behavior and Kaggle attribution. |
| docs/HANDOFF.md | Modify last | Verified implementation state and next task. |

## Shared Interfaces

~~~js
// inventory-normalizer.js
export function validateNormalizedInventory(records, options);
// options = { expectedCount, sourceType }
// { ok: true, records } or { ok: false, diagnostics }

// inventory-source-loaders.js
export const SOURCE_TYPES = {
  FRESHROUTE: 'freshroute-sample',
  UPLOAD: 'uploaded-csv',
  KAGGLE: 'kaggle-historical-training',
};
export function normalizeFreshRouteSample(rawRecords);
export function buildKaggleTrainingSnapshot(rows, { evaluateProduct });
// Returns final normalized records; temporary evaluation is used only for selection.
export function selectKaggleSnapshot(evaluatedRecords);

// inventory-import-controller.js
// Returns getState, importFile, loadFreshRouteSample,
// loadKaggleSnapshot, retry, and reset.
export function createInventoryImportController(dependencies);
~~~

The controller view model adds sourceType, activeSource, attemptedSource, retrySourceType, exclusionMessage, and source-aware status. The renderer reads that view model only; it never fetches, parses, validates, normalizes, or evaluates.

---

## Commit 1: Add the shared validator and FreshRoute source

**Goal:** Validate the existing bundled sample through the new common contract and load it transactionally.

**Files:**
- Create: inventory-normalizer.js
- Create: tests/inventory-normalizer.test.js
- Create: inventory-source-loaders.js
- Create: tests/inventory-source-loaders.test.js
- Modify: inventory-import-controller.js
- Modify: tests/inventory-import-controller.test.js

### Task 1: Write the common internal-record validator

- [ ] **Step 1: Write failing tests.**

~~~js
test('accepts a complete normalized record and preserves sourceMetadata', () => {
  const metadata = { original: 'sample' };
  const result = validateNormalizedInventory([validRecord({ sourceMetadata: metadata })], {
    expectedCount: 1, sourceType: 'freshroute-sample',
  });
  assert.equal(result.ok, true);
  assert.equal(result.records[0].sourceMetadata, metadata);
});

test('rejects blank text, invalid dates, duplicate IDs, and invalid numbers', () => {
  const result = validateNormalizedInventory([
    validRecord({ productName: '', quantityOnHand: -1, expirationDate: '2026-02-30' }),
    validRecord(),
  ], { expectedCount: 2, sourceType: 'freshroute-sample' });
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.map(({ field }) => field), [
    'productName', 'quantityOnHand', 'expirationDate', 'id',
  ]);
});
~~~

- [ ] **Step 2: Run before implementation.**

Run: node --test tests/inventory-normalizer.test.js

Expected: FAIL because inventory-normalizer.js does not exist.

- [ ] **Step 3: Implement minimal source-independent validation.**

~~~js
export function validateNormalizedInventory(records, { expectedCount, sourceType }) {
  // Require expected count when supplied, unique nonblank IDs, text fields,
  // finite nonnegative numbers, real YYYY-MM-DD date, and exact sourceType.
  // Never inspect or mutate sourceMetadata.
  return diagnostics.length ? { ok: false, diagnostics } : { ok: true, records };
}
~~~

- [ ] **Step 4: Verify.**

Run: node --test tests/inventory-normalizer.test.js

Expected: PASS; no evaluator, DOM, File API, or source-file dependency exists in the new validator.

### Task 2: Add the FreshRoute adapter and controller entry point

- [ ] **Step 1: Write failing adapter tests.**

~~~js
test('normalizes the eight bundled FreshRoute records with source metadata', () => {
  const result = normalizeFreshRouteSample(sampleInventory);
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 8);
  assert.equal(result.records[0].sourceType, 'freshroute-sample');
  assert.deepEqual(result.records[0].sourceMetadata, sampleInventory[0]);
});

test('rejects the complete FreshRoute source when one record is invalid', () => {
  const bad = sampleInventory.map((row) => ({ ...row }));
  bad[7].quantityOnHand = -1;
  assert.equal(normalizeFreshRouteSample(bad).ok, false);
});
~~~

- [ ] **Step 2: Write failing controller tests.**

~~~js
test('loads FreshRoute with the exact source message and eight active records', async () => {
  const { controller } = controllerFor({ freshRouteResult: validFreshRouteResult });
  await controller.loadFreshRouteSample();
  assert.equal(controller.getState().sourceType, 'freshroute-sample');
  assert.equal(controller.getState().evaluatedProducts.length, 8);
  assert.equal(controller.getState().statusMessage,
    'FreshRoute sample loaded — 8 inventory records.');
});

test('preserves active inventory after FreshRoute failure and retries FreshRoute', async () => {
  const { controller, setFreshRouteResult } = controllerFor({ freshRouteResult: validFreshRouteResult });
  await controller.importFile(validCsvFile);
  setFreshRouteResult({ ok: false, diagnostics: [{ field: 'quantityOnHand' }] });
  await controller.loadFreshRouteSample();
  assert.equal(controller.getState().retrySourceType, 'freshroute-sample');
  assert.equal(controller.getState().activeSource.title, 'balanced-inventory.csv');
  setFreshRouteResult(validFreshRouteResult);
  await controller.retry();
  assert.equal(controller.getState().sourceType, 'freshroute-sample');
});
~~~

- [ ] **Step 3: Implement the adapter and transaction hook.**

~~~js
export function normalizeFreshRouteSample(rawRecords) {
  const records = rawRecords.map((record) => ({
    id: record.id, productName: record.productName, category: record.category,
    brand: record.brand, quantityOnHand: record.quantityOnHand,
    reorderThreshold: record.reorderThreshold, salesRatePerDay: record.salesRatePerDay,
    expirationDate: record.expirationDate, storageCondition: record.storageCondition,
    sourceType: SOURCE_TYPES.FRESHROUTE, sourceMetadata: record,
  }));
  return validateNormalizedInventory(records, {
    expectedCount: 8, sourceType: SOURCE_TYPES.FRESHROUTE,
  });
}
~~~

- [ ] **Step 4: Verify FreshRoute and CSV regression.**

Run: node --test tests/inventory-normalizer.test.js tests/inventory-source-loaders.test.js tests/inventory-import-controller.test.js

Expected: PASS; FreshRoute loading is atomic and existing CSV assertions pass unchanged.

**Suggested commit message:** Add validated FreshRoute sample source

---

## Commit 2: Add the deterministic Kaggle training snapshot

**Goal:** Parse the 4,325-row bundled source, preserve source evidence, and produce exactly 80 evaluated records with 12/12/16/40 statuses.

**Files:**
- Modify: inventory-source-loaders.js
- Modify: tests/inventory-source-loaders.test.js
- Modify: tests/inventory-normalizer.test.js

### Task 3: Implement Kaggle schema validation and row normalization

- [ ] **Step 1: Write header tests first.**

~~~js
test('requires exact single-occurrence Kaggle headers after trimming', () => {
  assert.equal(buildKaggleTrainingSnapshot(rowsMissingLocation, deps).ok, false);
  assert.equal(buildKaggleTrainingSnapshot(rowsWithDuplicateProductName, deps).ok, false);
  assert.equal(buildKaggleTrainingSnapshot(rowsWithDuplicateCustomerLocation, deps).ok, false);
});

test('allows Customer Location to be absent and keeps extra columns in metadata', () => {
  const result = buildKaggleTrainingSnapshot(rowsWithoutCustomerLocationAndWithExtra, deps);
  assert.equal(result.ok, true);
  assert.equal(result.records[0].sourceMetadata['Extra audit field'], 'kept');
});
~~~

- [ ] **Step 2: Write row-rule tests first.**

~~~js
test('derives a source-tagged Kaggle record from valid values', () => {
  const result = normalizeKaggleRow(validKaggleRow({ line: 42 }), headerIndexes);
  assert.equal(result.record.id, 'KAGGLE-ROW-0042');
  assert.equal(result.record.category, 'Dairy');
  assert.equal(result.record.salesRatePerDay, 558 / 22);
  assert.equal(result.record.expirationDate, '2026-08-13');
});

test('excludes invalid shelf life, dates, stock values, and blank Location', () => {
  for (const row of [badShelfLife, fractionalShelfLife, badDate, negativeStock, blankLocation]) {
    assert.equal(normalizeKaggleRow(row, headerIndexes).ok, false);
  }
});

test('keeps blank and whitespace Storage Condition eligible as Not specified', () => {
  assert.equal(normalizeKaggleRow(blankStorage, headerIndexes).record.storageCondition, 'Not specified');
});
~~~

- [ ] **Step 3: Implement exact adapter rules.**

~~~js
const KAGGLE_REQUIRED_COLUMNS = [
  'Location', 'Date', 'Product ID', 'Product Name', 'Brand',
  'Quantity Sold (liters/kg)', 'Shelf Life (days)', 'Storage Condition',
  'Production Date', 'Expiration Date', 'Quantity in Stock (liters/kg)',
  'Minimum Stock Threshold (liters/kg)',
];
const KAGGLE_OPTIONAL_COLUMNS = ['Customer Location'];
// Validate real historical dates but do not require chronological ordering.
// Require positive integer shelf life, nonnegative finite stock/sold values.
// Derive expiration from DEMO_DATE plus shelf life.
// Preserve complete original row in sourceMetadata.
~~~

- [ ] **Step 4: Verify mapping/evaluator separation.**

Run: node --test tests/inventory-source-loaders.test.js tests/inventory-normalizer.test.js tests/inventory-evaluator.test.js

Expected: PASS; evaluator code remains unchanged and sees only standard normalized fields.

### Task 4: Implement deterministic diversity selection

- [ ] **Step 1: Write failing selection tests.**

~~~js
test('returns exactly 12 Urgent, 12 Low Stock, 16 Expiring Soon, and 40 Safe records', () => {
  const result = selectKaggleSnapshot(evaluatedCandidates);
  assert.equal(result.ok, true);
  assert.deepEqual(getStatusCounts(result.records), {
    Urgent: 12, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 40,
  });
});

test('uses diversity score then original row number, and is repeatable', () => {
  const first = buildKaggleTrainingSnapshot(fullSourceRows, deps);
  const second = buildKaggleTrainingSnapshot(fullSourceRows, deps);
  assert.deepEqual(first.records.map(({ id }) => id), second.records.map(({ id }) => id));
});

test('fails when exclusions prevent a required status target', () => {
  const result = selectKaggleSnapshot(onlyElevenUrgentCandidates);
  assert.equal(result.ok, false);
  assert.match(result.diagnostics[0].message, /Urgent/);
});
~~~

- [ ] **Step 2: Implement only the approved scoring rule.**

~~~js
const TARGETS = [
  ['Urgent', 12], ['Low Stock', 12], ['Expiring Soon', 16], ['Safe', 40],
];

function diversityScore(record, counts) {
  return (counts.productName.get(record.productName) ?? 0)
    + (counts.brand.get(record.brand) ?? 0)
    + (counts.location.get(record.sourceMetadata.Location) ?? 0);
}
// For each target, choose the lowest score; ties use the lowest original CSV row.
// Update productName, brand, and location counts after every chosen record.
~~~

- [ ] **Step 3: Test the real bundled source.**

~~~js
test('reads 4325 Kaggle source rows but returns only 80 final active records', () => {
  const result = buildKaggleTrainingSnapshot(parseCsv(fullCsv).rows, deps);
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 80);
  assert.deepEqual(getStatusCounts(result.records.map(evaluateProduct)), {
    Urgent: 12, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 40,
  });
});
~~~

- [ ] **Step 4: Verify.**

Run: node --test tests/inventory-source-loaders.test.js

Expected: PASS; stable generated IDs, stable ordered output, row exclusions, zero exclusions, and target-mix failure are covered.

**Suggested commit message:** Add deterministic Kaggle training snapshot loader

---

## Commit 3: Generalize transactions to every source

**Goal:** Preserve active inventory while any replacement is checking; give bundled-source failures Retry and keep CSV recovery unchanged.

**Files:**
- Modify: inventory-import-controller.js
- Modify: script.js
- Modify: tests/inventory-import-controller.test.js

### Task 5: Add source-aware controller state

- [ ] **Step 1: Write failure, switching, and Reset tests.**

~~~js
test('switches CSV, FreshRoute, and Kaggle only after complete success', async () => {
  const { controller } = controllerFor(allSuccessfulSources);
  await controller.importFile(validCsvFile);
  await controller.loadFreshRouteSample();
  await controller.loadKaggleSnapshot();
  assert.equal(controller.getState().activeSource.type, 'kaggle-historical-training');
  assert.equal(controller.getState().evaluatedProducts.length, 80);
});

test('keeps active records during CHECKING and bundled HOLD', async () => {
  const { controller, deferredKaggle } = controllerFor(withDeferredKaggle);
  await controller.loadFreshRouteSample();
  const pending = controller.loadKaggleSnapshot();
  assert.equal(controller.getState().phase, 'checking');
  assert.equal(controller.getState().evaluatedProducts.length, 8);
  deferredKaggle.reject(new Error('read failed'));
  await pending;
  assert.equal(controller.getState().activeSource.type, 'freshroute-sample');
  assert.equal(controller.getState().statusMessage,
    'Could not load the Kaggle historical training snapshot. Try again.');
});

test('reset clears active source, failure, Retry, notes, and records', async () => {
  const { controller } = controllerFor(allSuccessfulSources);
  await controller.loadKaggleSnapshot();
  controller.reset();
  assert.deepEqual(controller.getState(), expectTrueNoDataState());
});
~~~

- [ ] **Step 2: Implement descriptors and generic transaction helpers.**

~~~js
const SOURCE_DESCRIPTORS = {
  freshRoute: {
    type: 'freshroute-sample', title: 'FreshRoute sample',
    loadingMessage: 'Loading FreshRoute sample…',
    successMessage: 'FreshRoute sample loaded — 8 inventory records.',
    failureMessage: 'Could not load the FreshRoute sample. Try again.',
  },
  kaggle: {
    type: 'kaggle-historical-training', title: 'Kaggle historical training snapshot',
    loadingMessage: 'Building Kaggle historical training snapshot…',
    successMessage: 'Kaggle historical training snapshot loaded — 80 inventory records.',
    failureMessage: 'Could not load the Kaggle historical training snapshot. Try again.',
  },
};
// beginLoad preserves active snapshot; activate evaluates/counts/sorts only valid final records.
// bundled failure stores retrySourceType; CSV validation failure does not.
~~~

- [ ] **Step 3: Add browser-only source reads in script.js.**

~~~js
const loadFreshRouteRecords = async () => normalizeFreshRouteSample(
  await fetch('./data/sample-inventory.json').then(requireOkJson),
);
const loadKaggleRecords = async () => buildKaggleTrainingSnapshot(
  parseCsv(await fetch('./data/demo-csv/dairy_dataset.csv').then(requireOkText)).rows,
  { evaluateProduct },
);
// requireOkJson and requireOkText reject non-OK fetch responses.
~~~

- [ ] **Step 4: Verify transaction and CSV regressions.**

Run: node --test tests/inventory-import-controller.test.js tests/csv-parser.test.js tests/inventory-validator.test.js tests/csv-demo-scenarios.test.js

Expected: PASS; all source transitions are atomic and existing CSV behavior is unchanged.

**Suggested commit message:** Add transactional multi-source inventory controller

---

## Commit 4: Implement the approved Source Manifest Switchboard

**Goal:** Render all approved source controls, active identity, historical treatment, source-specific recovery, and responsive behavior.

**Files:**
- Modify: dashboard-renderer.js
- Modify: script.js
- Modify: styles.css
- Modify: tests/dashboard-renderer.test.js
- Modify: tests/csv-loader.browser.test.js

### Task 6: Test and implement source-aware renderer markup

- [ ] **Step 1: Write failing renderer tests.**

~~~js
test('renders true no-data with three source choices and no cards', () => {
  renderDashboard(container, trueNoDataState);
  assert.match(container.innerHTML, /Choose an inventory source to begin\./);
  assert.match(container.innerHTML, /Load FreshRoute sample/);
  assert.match(container.innerHTML, /Upload CSV/);
  assert.match(container.innerHTML, /Load Kaggle historical training snapshot/);
  assert.doesNotMatch(container.innerHTML, /product-card/);
});

test('renders Kaggle labels, source context, record terminology, and liters/kg', () => {
  renderDashboard(container, activeKaggleState);
  assert.match(container.innerHTML, /Historical training snapshot — not current inventory/);
  assert.match(container.innerHTML, /Historical inventory signal/);
  assert.match(container.innerHTML, /products need attention in this snapshot/);
  assert.match(container.innerHTML, /Historical snapshot · Albany · Source date 2022-02-17/);
  assert.match(container.innerHTML, /liters\/kg/);
});

test('renders Retry only for bundled HOLD states', () => {
  renderDashboard(container, freshRouteHoldState);
  assert.match(container.innerHTML, /data-import-action=\"retry\"/);
  renderDashboard(container, csvHoldState);
  assert.doesNotMatch(container.innerHTML, /data-import-action=\"retry\"/);
  assert.match(container.innerHTML, /Choose a corrected file and upload it again\./);
});
~~~

- [ ] **Step 2: Implement renderer helpers.**

~~~js
function sourcePicker(viewModel) {
  return '<fieldset aria-label="Choose inventory source">'
    + freshRouteLane(viewModel) + uploadLane(viewModel) + kaggleLane(viewModel)
    + '</fieldset>';
}
function activeSourceIdentity(viewModel) {
  return '<span class="file-label">ACTIVE SOURCE</span>'
    + sourceTitleAndCount(viewModel.activeSource);
}
function sourceHoldPanel(viewModel) {
  return viewModel.retrySourceType ? bundledRetryMarkup(viewModel) : csvRecoveryMarkup(viewModel);
}
function historicalContext(product) {
  return product.sourceType === 'kaggle-historical-training'
    ? '<p class="historical-context">Historical snapshot · ' + escapeHtml(product.sourceMetadata.Location)
      + ' · Source date ' + escapeHtml(product.sourceMetadata.Date) + '</p>'
    : '';
}
function getImportedHeadline(counts, sourceType) {
  return sourceType === 'kaggle-historical-training'
    ? historicalHeadline(counts)
    : uploadedHeadline(counts);
}
~~~

- [ ] **Step 3: Preserve accessibility contract.**

~~~js
test('keeps one compact live source-status region and semantic picker group', () => {
  renderDashboard(container, activeKaggleState);
  assert.equal((container.innerHTML.match(/aria-live=\"polite\"/g) ?? []).length, 1);
  assert.match(container.innerHTML, /<fieldset[^>]*aria-label=\"Choose inventory source\"/);
  renderDashboard(container, freshRouteHoldState);
  assert.match(container.innerHTML, /id=\"import-error-summary\" tabindex=\"-1\"/);
});
~~~

- [ ] **Step 4: Wire data-import-action events.**

~~~js
if (action === 'freshroute') controller.loadFreshRouteSample();
if (action === 'kaggle') controller.loadKaggleSnapshot();
if (action === 'retry') controller.retry();
if (action === 'clear') controller.reset();
~~~

- [ ] **Step 5: Verify renderer/controller integration.**

Run: node --test tests/dashboard-renderer.test.js tests/inventory-import-controller.test.js

Expected: PASS; exact copy, source identity, Retry boundary, live-region boundary, focus target, and CSV behavior all hold.

### Task 7: Test and implement approved CSS

- [ ] **Step 1: Add browser checks before CSS changes.**

~~~js
test('has no horizontal overflow at 1280px, 390px, and 320px with source controls', async () => {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('button', { name: 'Load Kaggle historical training snapshot' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }
});
~~~

- [ ] **Step 2: Implement visual-spec measurements only.**

~~~css
.source-picker { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.source-lane + .source-lane { border-left: 1px solid var(--chiller-blue); }
.source-lane-historical::before { width: 4px; background: repeating-linear-gradient(180deg, var(--chiller-blue) 0 4px, var(--ice-paper) 4px 8px); }
@media (max-width: 640px) { .source-picker { grid-template-columns: 1fr; } .manifest-dock { padding: 18px; } }
@media (max-width: 350px) { .manifest-dock { padding: 14px; } .source-actions { gap: 10px; } }
~~~

- [ ] **Step 3: Add source-aware facts without new product behavior.**

~~~css
.historical-context { color: var(--steel); font: 0.68rem/1.4 "Cascadia Mono", Consolas, monospace; overflow-wrap: anywhere; }
.source-action { min-height: 44px; }
.source-action:focus-visible { outline: 3px solid var(--deep-blue); outline-offset: 3px; box-shadow: 0 0 0 5px var(--milk-white); }
@media (prefers-reduced-motion: reduce) { .manifest-dock.is-checking::before { animation: none; } }
~~~

- [ ] **Step 4: Verify browser behavior.**

Run: node --test tests/dashboard-renderer.test.js tests/csv-loader.browser.test.js

Expected: PASS; source controls, 80 Kaggle cards, 390px/320px wrapping, focus, motion, console, and no-overflow checks pass.

**Suggested commit message:** Add multi-source manifest switchboard

---

## Commit 5: Verify and document the completed feature

**Goal:** Add full integration coverage, write verified README/HANDOFF facts, and prepare the feature branch for user review.

**Files:**
- Modify: tests/csv-loader.browser.test.js
- Modify: README.md
- Modify: docs/HANDOFF.md

### Task 8: Add complete browser workflow coverage

- [ ] **Step 1: Write the final end-to-end test.**

~~~js
test('switches all sources, preserves failures, retries bundled sources, and resets', async () => {
  await page.getByRole('heading', { name: 'Choose an inventory source to begin.' }).waitFor();
  assert.equal(await page.locator('.rail-item').count(), 4);
  await page.getByRole('button', { name: 'Load FreshRoute sample' }).click();
  await page.getByText('FreshRoute sample loaded — 8 inventory records.').waitFor();
  assert.equal(await page.locator('.product-card').count(), 8);
  await page.getByRole('button', { name: 'Load Kaggle historical training snapshot' }).click();
  await page.getByText('Kaggle historical training snapshot loaded — 80 inventory records.').waitFor();
  assert.equal(await page.locator('.product-card').count(), 80);
  assert.deepEqual(await dashboardCounts(page), { Urgent: 12, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 40 });
  // Use a test-only failed bundled response; assert 80 cards remain and Retry succeeds.
  // Upload invalid-inventory.csv; assert no Retry and the 80-card board remains.
  await page.getByRole('button', { name: 'Clear inventory' }).click();
  assert.equal(await page.locator('.product-card').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Retry' }).count(), 0);
});
~~~

- [ ] **Step 2: Run the full suite.**

Run:
~~~powershell
node --test tests/inventory-evaluator.test.js tests/dashboard-renderer.test.js tests/csv-parser.test.js tests/inventory-validator.test.js tests/inventory-normalizer.test.js tests/inventory-source-loaders.test.js tests/inventory-import-controller.test.js tests/csv-demo-scenarios.test.js tests/csv-loader.browser.test.js
~~~

Expected: PASS; all existing tests remain green and every approved multi-source state is covered.

- [ ] **Step 3: Run the required browser review.**

Verify desktop, 390px, and 320px for no-data, FreshRoute, upload, Kaggle, bundled CHECKING, bundled HOLD/Retry, invalid CSV recovery, failed replacement, Reset, no console errors, visible focus, reduced motion, and no horizontal overflow.

### Task 9: Update documentation only from verified evidence

- [ ] **Step 1: Update README.**

Document the three-source flow, FreshRoute eight-record behavior, uploaded CSV boundary, Kaggle title/link/period/license, bundled-not-live limitation, 4,325-to-80 curation, derived expiration, derived sales-rate proxy, liters/kg limitation, and Reset behavior. Keep product story and live link intact.

- [ ] **Step 2: Update HANDOFF.**

Replace stale pre-feature state with verified branch state, full test command/results, source outcomes, browser checks, remaining review gate, and the next exact task. Do not copy the specs.

- [ ] **Step 3: Perform final quality review.**

~~~text
Bugs: atomic replacement, 8/80/250 boundaries, deterministic selection, exclusions, Retry, Reset, CSV regression.
Maintainability: adapters, normalizer, controller, evaluator, renderer, and browser wiring remain separate.
Accessibility: picker semantics, one live region, focus, reduced motion, contrast, targets, source-aware language.
Security: local bundled fetches and File APIs only; no secret, remote write, unsafe rendering, or dependency.
~~~

- [ ] **Step 4: Run repository checks.**

Run:
~~~powershell
git diff --check
git status --short --branch
git diff --name-only
~~~

Expected: no whitespace errors; only intended feature, tests, README, HANDOFF, and approved docs are changed; .superpowers stays ignored.

**Suggested commit message:** Document and verify multi-source inventory loading

## Proposed Commit Sequence

1. Add validated FreshRoute sample source
2. Add deterministic Kaggle training snapshot loader
3. Add transactional multi-source inventory controller
4. Add multi-source manifest switchboard
5. Document and verify multi-source inventory loading

## Plan Review

- Every approved functional rule maps to a test-first task: shared pipeline, exact source boundaries, mappings, validation, historical timing, metadata, selection, messages, failures, Retry, and Reset.
- Every visual requirement maps to Commit 4 or final browser verification: picker lanes, state copy, archival stripe, responsive dimensions, accessibility, and motion.
- No prohibited scope is planned.
- The visual specification heading still says Proposed for approval, but the user’s explicit approval makes it authoritative. This is a documentation-status mismatch, not an implementation blocker.
