# Inventory Prioritization Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first StockWatch dashboard feature so Alicia can see all eight sample products, their priorities, and the reasons behind each priority.

**Architecture:** Keep the browser app dependency-free. `inventory-evaluator.js` owns fixed-date calculations, status decisions, reasons, counts, and sort order; `dashboard-renderer.js` owns DOM output; `script.js` loads JSON and coordinates loading, success, and error states. `index.html` remains the semantic shell and `styles.css` implements the approved Modern Food Operations Workspace direction.

**Tech Stack:** HTML, CSS, browser JavaScript modules, existing JSON data, Node’s built-in test runner.

## Global Constraints

- Use `data/sample-inventory.json` as the only MVP data source; evaluate all eight products.
- Keep the demo date fixed at `2026-07-22`; do not add live-date mode or a date selector.
- Preserve primary-status precedence: Urgent → Low Stock → Expiring Soon → Safe.
- Preserve expected totals: 4 Urgent, 1 Low Stock, 2 Expiring Soon, 1 Safe. Report any mismatch; do not silently alter rules or data.
- Use no frameworks, packages, accounts, databases, uploads, supplier integrations, ordering, forecasting, reporting, or deployment.
- Keep recommendations display-only and do not add filters, product detail screens, or reviewed-state interactions in this feature.
- Implement both approved specifications: `docs/superpowers/specs/2026-07-23-inventory-prioritization-design.md` and `docs/visual-design-specification.md`.
- Do not commit or push unless the user explicitly asks.

---

## File Structure

- Create: `inventory-evaluator.js` — pure inventory evaluation, status counts, and sorting.
- Create: `dashboard-renderer.js` — loading, error, summary, group, and product-card DOM rendering.
- Create: `tests/inventory-evaluator.test.js` — Node built-in tests for the business rules and current sample-data totals.
- Modify: `index.html` — accessible dashboard shell and module entry point.
- Modify: `script.js` — JSON loading and app orchestration only.
- Modify: `styles.css` — approved visual system, status treatments, loading/error states, and responsive layout.
- Modify: `docs/HANDOFF.md` — update only after successful implementation and verification.

### Task 1: Build and test the independent inventory evaluator

**Files:**

- Create: `tests/inventory-evaluator.test.js`
- Create: `inventory-evaluator.js`

**Interfaces:**

- Consumes: raw products with the fields in `data/sample-inventory.json`.
- Produces: `evaluateProduct(product)`, `getStatusCounts(products)`, `sortEvaluatedProducts(products)`, `DEMO_DATE`, and `STATUS_ORDER`.

- [ ] **Step 1: Write the failing evaluator test**

```js
// tests/inventory-evaluator.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  DEMO_DATE,
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
} from '../inventory-evaluator.js';

const products = JSON.parse(
  readFileSync(new URL('../data/sample-inventory.json', import.meta.url), 'utf8'),
);

test('uses the approved fixed demo date', () => {
  assert.equal(DEMO_DATE, '2026-07-22');
});

test('assigns the approved primary statuses to the existing sample data', () => {
  const evaluated = products.map(evaluateProduct);
  const statuses = Object.fromEntries(evaluated.map((product) => [product.id, product.primaryStatus]));

  assert.deepEqual(statuses, {
    'DAIRY-001': 'Urgent',
    'DAIRY-002': 'Expiring Soon',
    'DAIRY-003': 'Urgent',
    'DAIRY-004': 'Expiring Soon',
    'DAIRY-005': 'Urgent',
    'DAIRY-006': 'Urgent',
    'DAIRY-007': 'Low Stock',
    'DAIRY-008': 'Safe',
  });
  assert.deepEqual(getStatusCounts(evaluated), {
    Urgent: 4,
    'Low Stock': 1,
    'Expiring Soon': 2,
    Safe: 1,
  });
});

test('keeps every reason while choosing one primary status', () => {
  const wholeMilk = evaluateProduct(products.find((product) => product.id === 'DAIRY-001'));
  assert.equal(wholeMilk.primaryStatus, 'Urgent');
  assert.match(wholeMilk.reasons.join(' '), /Low stock/);
  assert.match(wholeMilk.reasons.join(' '), /Projected stockout/);
  assert.match(wholeMilk.reasons.join(' '), /Expires in 3 days/);
});

test('does not project stockout or create an Urgent stockout alert for zero sales', () => {
  const product = evaluateProduct({
    ...products[0],
    quantityOnHand: 100,
    reorderThreshold: 10,
    salesRatePerDay: 0,
    expirationDate: '2026-08-20',
  });
  assert.equal(product.daysUntilStockout, null);
  assert.equal(product.primaryStatus, 'Safe');
});

test('marks expired inventory Urgent with its override action', () => {
  const product = evaluateProduct({ ...products[0], expirationDate: '2026-07-21' });
  assert.equal(product.primaryStatus, 'Urgent');
  assert.equal(product.recommendedAction, 'Remove from inventory today');
  assert.match(product.reasons.join(' '), /expired 1 day ago/);
});

test('sorts by status, then by the approved time-sensitive value', () => {
  const sorted = sortEvaluatedProducts(products.map(evaluateProduct));
  assert.deepEqual(sorted.map((product) => product.id), [
    'DAIRY-001',
    'DAIRY-005',
    'DAIRY-003',
    'DAIRY-006',
    'DAIRY-007',
    'DAIRY-004',
    'DAIRY-002',
    'DAIRY-008',
  ]);
});
```

- [ ] **Step 2: Run the test to confirm it fails before implementation**

Run: `node --experimental-default-type=module --test tests/inventory-evaluator.test.js`

Expected: FAIL because `inventory-evaluator.js` does not exist yet.

- [ ] **Step 3: Implement the evaluator module**

```js
// inventory-evaluator.js
export const DEMO_DATE = '2026-07-22';
export const STATUS_ORDER = ['Urgent', 'Low Stock', 'Expiring Soon', 'Safe'];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDaysUntilExpiration(days) {
  if (days < 0) return `expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function getCalendarDayDifference(dateString, referenceDate = DEMO_DATE) {
  return Math.round((toUtcDate(dateString) - toUtcDate(referenceDate)) / DAY_IN_MS);
}

export function evaluateProduct(product, demoDate = DEMO_DATE) {
  const daysUntilExpiration = getCalendarDayDifference(product.expirationDate, demoDate);
  const validSalesRate = Number.isFinite(product.salesRatePerDay) && product.salesRatePerDay > 0;
  const daysUntilStockout = validSalesRate ? product.quantityOnHand / product.salesRatePerDay : null;
  const isLowStock = product.quantityOnHand <= product.reorderThreshold;
  const isExpired = daysUntilExpiration < 0;
  const isExpiringSoon = daysUntilExpiration >= 0 && daysUntilExpiration <= 7;
  const isStockoutUrgent = daysUntilStockout !== null && daysUntilStockout <= 2;
  const isLowStockAndNearExpiry = isLowStock && daysUntilExpiration >= 0 && daysUntilExpiration <= 3;
  const reasons = [];

  if (isLowStock) reasons.push(`Low stock: ${product.quantityOnHand} on hand (threshold ${product.reorderThreshold})`);
  if (daysUntilStockout !== null) reasons.push(`Projected stockout in ${daysUntilStockout.toFixed(1)} days`);
  if (isExpired || isExpiringSoon || isLowStockAndNearExpiry) reasons.push(formatDaysUntilExpiration(daysUntilExpiration));

  let primaryStatus = 'Safe';
  let recommendedAction = 'No immediate action needed';

  if (isExpired) {
    primaryStatus = 'Urgent';
    recommendedAction = 'Remove from inventory today';
  } else if (isStockoutUrgent || isLowStockAndNearExpiry) {
    primaryStatus = 'Urgent';
    recommendedAction = 'Take action today';
  } else if (isLowStock) {
    primaryStatus = 'Low Stock';
    recommendedAction = 'Reorder soon';
  } else if (isExpiringSoon) {
    primaryStatus = 'Expiring Soon';
    recommendedAction = 'Use or sell soon';
  }

  return { ...product, daysUntilExpiration, daysUntilStockout, primaryStatus, reasons, recommendedAction };
}

export function getStatusCounts(products) {
  return STATUS_ORDER.reduce((counts, status) => ({ ...counts, [status]: products.filter((product) => product.primaryStatus === status).length }), {});
}

export function sortEvaluatedProducts(products) {
  const statusIndex = (status) => STATUS_ORDER.indexOf(status);
  const timingValue = (product) => {
    if (product.primaryStatus === 'Urgent' || product.primaryStatus === 'Low Stock') return product.daysUntilStockout ?? Infinity;
    return product.daysUntilExpiration;
  };

  return [...products].sort((first, second) =>
    statusIndex(first.primaryStatus) - statusIndex(second.primaryStatus)
    || timingValue(first) - timingValue(second)
    || first.productName.localeCompare(second.productName),
  );
}
```

- [ ] **Step 4: Run evaluator tests**

Run: `node --experimental-default-type=module --test tests/inventory-evaluator.test.js`

Expected: 6 passing tests, including the `4 / 1 / 2 / 1` total and approved sort order.

### Task 2: Create the semantic app shell and load orchestration

**Files:**

- Modify: `index.html`
- Modify: `script.js`
- Create: `dashboard-renderer.js`

**Interfaces:**

- Consumes: `evaluateProduct`, `getStatusCounts`, and `sortEvaluatedProducts` from `inventory-evaluator.js`.
- Produces: `renderLoading(container)`, `renderDashboard(container, products)`, and `renderError(container)` from `dashboard-renderer.js`.

- [ ] **Step 1: Replace the static placeholder shell with semantic dashboard regions**

```html
<!-- Replace the current <body> content in index.html -->
<body>
  <header class="site-header">
    <p class="eyebrow">Daily inventory briefing</p>
    <h1>StockWatch</h1>
    <p class="briefing">Good morning, Alicia. Here is what needs your attention today.</p>
    <p class="demo-date">Demo inventory date: <time datetime="2026-07-22">July 22, 2026</time></p>
  </header>
  <main class="dashboard" id="app" aria-busy="true" aria-live="polite"></main>
  <script type="module" src="script.js"></script>
</body>
```

- [ ] **Step 2: Add loading and error orchestration**

```js
// script.js
import { evaluateProduct, getStatusCounts, sortEvaluatedProducts } from './inventory-evaluator.js';
import { renderDashboard, renderError, renderLoading } from './dashboard-renderer.js';

const app = document.querySelector('#app');

async function loadDashboard() {
  renderLoading(app);
  try {
    const response = await fetch('./data/sample-inventory.json');
    if (!response.ok) throw new Error('Inventory data could not be loaded.');
    const products = await response.json();
    if (!Array.isArray(products)) throw new Error('Inventory data is not a product list.');

    const evaluatedProducts = sortEvaluatedProducts(products.map(evaluateProduct));
    renderDashboard(app, evaluatedProducts, getStatusCounts(evaluatedProducts));
  } catch (error) {
    renderError(app);
  } finally {
    app.setAttribute('aria-busy', 'false');
  }
}

loadDashboard();
```

- [ ] **Step 3: Add loading and error renderers before the full renderer**

```js
// dashboard-renderer.js
export function renderLoading(container) {
  container.innerHTML = `
    <section class="workspace-skeleton" aria-label="Loading inventory briefing">
      <div class="skeleton skeleton-summary"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </section>`;
}

export function renderError(container) {
  container.innerHTML = `
    <section class="workspace-error" role="alert">
      <p class="eyebrow">Inventory review unavailable</p>
      <h2>Today’s inventory could not load.</h2>
      <p>Refresh the page and try again before reviewing today’s priorities.</p>
    </section>`;
}
```

- [ ] **Step 4: Verify loading and error behavior manually**

Run: `python -m http.server 8000`

Expected: `http://localhost:8000` first shows a structured skeleton, then dashboard content. Temporarily rename the JSON file only for this local check; the page should show the operational recovery message. Restore the filename immediately after testing.

### Task 3: Render the priority summary and all product work cards

**Files:**

- Modify: `dashboard-renderer.js`

**Interfaces:**

- Consumes: evaluated, sorted product objects and the four-key count object.
- Produces: a full dashboard with four summary counts and all eight expanded cards.

- [ ] **Step 1: Add the renderer helpers and full dashboard renderer**

```js
// Append to dashboard-renderer.js
const STATUS_ICON = {
  Urgent: '⚠',
  'Low Stock': '↓',
  'Expiring Soon': '◷',
  Safe: '✓',
};

const STATUS_CLASS = {
  Urgent: 'urgent',
  'Low Stock': 'low-stock',
  'Expiring Soon': 'expiring-soon',
  Safe: 'safe',
};

function formatStockout(days) {
  return days === null ? 'Not projected' : `${days.toFixed(1)} days`;
}

function productCard(product) {
  const statusClass = STATUS_CLASS[product.primaryStatus];
  return `
    <article class="product-card status-${statusClass}">
      <div class="card-topline">
        <p class="product-category">${product.category} · ${product.brand}</p>
        <p class="status-label"><span aria-hidden="true">${STATUS_ICON[product.primaryStatus]}</span> ${product.primaryStatus}</p>
      </div>
      <h3>${product.productName}</h3>
      <ul class="reason-list" aria-label="Reasons for attention">${product.reasons.map((reason) => `<li>${reason}</li>`).join('')}</ul>
      <dl class="inventory-facts">
        <div><dt>On hand</dt><dd>${product.quantityOnHand}</dd></div>
        <div><dt>Reorder threshold</dt><dd>${product.reorderThreshold}</dd></div>
        <div><dt>Sales rate</dt><dd>${product.salesRatePerDay} / day</dd></div>
        <div><dt>Expiration</dt><dd>${product.expirationDate} (${product.daysUntilExpiration} days)</dd></div>
        <div><dt>Projected stockout</dt><dd>${formatStockout(product.daysUntilStockout)}</dd></div>
      </dl>
      <p class="recommended-action"><span>Recommended action</span>${product.recommendedAction}</p>
    </article>`;
}

export function renderDashboard(container, products, counts) {
  const groups = ['Urgent', 'Low Stock', 'Expiring Soon', 'Safe'];
  container.innerHTML = `
    <section class="inventory-health" aria-labelledby="health-heading">
      <div class="section-intro"><p class="eyebrow">Inventory health</p><h2 id="health-heading">Today’s condition</h2></div>
      <div class="summary-grid">${groups.map((status) => `<article class="summary-card status-${STATUS_CLASS[status]}"><span>${STATUS_ICON[status]} ${status}</span><strong>${counts[status]}</strong></article>`).join('')}</div>
    </section>
    <section class="attention-queue" aria-labelledby="attention-heading">
      <div class="section-intro"><p class="eyebrow">Needs attention today</p><h2 id="attention-heading">Work through the priorities</h2></div>
      ${groups.map((status) => {
        const groupProducts = products.filter((product) => product.primaryStatus === status);
        return groupProducts.length ? `<section class="status-group status-${STATUS_CLASS[status]}" aria-labelledby="${STATUS_CLASS[status]}-heading"><h2 id="${STATUS_CLASS[status]}-heading">${status}</h2><div class="product-stack">${groupProducts.map(productCard).join('')}</div></section>` : '';
      }).join('')}
    </section>`;
}
```

- [ ] **Step 2: Verify the required dashboard output in the browser**

Run: `python -m http.server 8000`

Expected: four summary cards read 4 Urgent, 1 Low Stock, 2 Expiring Soon, and 1 Safe; all eight cards appear; cards are grouped in approved priority order; within groups, Whole Milk, Sharp Cheddar Block, Salted Butter, and Cottage Cheese lead the Urgent queue.

### Task 4: Apply the approved Modern Food Operations Workspace visual system

**Files:**

- Modify: `styles.css`

**Interfaces:**

- Consumes: the semantic class names emitted by `dashboard-renderer.js`.
- Produces: desktop and mobile visual hierarchy, accessible status treatments, skeleton state, and error state.

- [ ] **Step 1: Replace starter CSS with the approved visual tokens and layout**

```css
/* styles.css */
:root {
  --paper: #f7f4ed;
  --ink: #22322d;
  --muted: #64716c;
  --line: #d8dfd6;
  --card: #fffdf8;
  --urgent: #9c2f32;
  --low-stock: #9b6510;
  --expiring-soon: #846213;
  --safe: #2f6b4f;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: var(--ink);
  background: var(--paper);
}

* { box-sizing: border-box; }
body { margin: 0; }
.site-header, .dashboard { width: min(1100px, calc(100% - 32px)); margin: 0 auto; }
.site-header { padding: 56px 0 28px; border-bottom: 1px solid var(--line); }
.eyebrow { margin: 0 0 8px; color: var(--muted); font-size: .75rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
h1, h2, h3, p { margin-top: 0; }
h1 { max-width: 18ch; margin-bottom: 12px; font-size: clamp(2.25rem, 5vw, 4.5rem); letter-spacing: -.05em; line-height: .96; }
.briefing { max-width: 54ch; margin-bottom: 8px; font-size: 1.12rem; line-height: 1.55; }
.demo-date { color: var(--muted); font-size: .92rem; }
.dashboard { padding: 36px 0 72px; }
.section-intro { display: grid; gap: 0; margin-bottom: 18px; }
.section-intro h2, .status-group h2 { margin-bottom: 0; font-size: 1.35rem; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.summary-card, .product-card, .workspace-error { border: 1px solid var(--line); border-radius: 18px; background: var(--card); }
.summary-card { min-height: 126px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
.summary-card span, .status-label { font-weight: 700; }
.summary-card strong { font-size: 2.35rem; line-height: 1; }
.attention-queue { margin-top: 48px; }
.status-group { margin-top: 34px; }
.product-stack { display: grid; gap: 16px; margin-top: 14px; }
.product-card { padding: 22px; box-shadow: 0 10px 28px rgb(34 50 45 / .05); }
.card-topline { display: flex; justify-content: space-between; gap: 16px; align-items: start; }
.product-category { margin-bottom: 8px; color: var(--muted); font-size: .88rem; }
.product-card h3 { margin-bottom: 14px; font-size: 1.45rem; }
.status-label { margin: 0; white-space: nowrap; }
.reason-list { margin: 0 0 18px; padding-left: 20px; line-height: 1.5; }
.inventory-facts { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 0; padding-top: 16px; border-top: 1px solid var(--line); }
.inventory-facts div { min-width: 0; }
.inventory-facts dt { color: var(--muted); font-size: .76rem; }
.inventory-facts dd { margin: 4px 0 0; font-weight: 700; }
.recommended-action { margin: 18px 0 0; padding: 12px 14px; border-radius: 10px; background: #eef1eb; font-weight: 700; }
.recommended-action span { display: block; margin-bottom: 3px; color: var(--muted); font-size: .74rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.status-urgent .status-label, .summary-card.status-urgent span { color: var(--urgent); }
.status-low-stock .status-label, .summary-card.status-low-stock span { color: var(--low-stock); }
.status-expiring-soon .status-label, .summary-card.status-expiring-soon span { color: var(--expiring-soon); }
.status-safe .status-label, .summary-card.status-safe span { color: var(--safe); }
.workspace-skeleton { display: grid; gap: 16px; }
.skeleton { border-radius: 18px; background: linear-gradient(90deg, #ebece6, #f5f3ed, #ebece6); background-size: 200% 100%; animation: loading 1.3s infinite; }
.skeleton-summary { height: 126px; }
.skeleton-card { height: 230px; }
.workspace-error { margin-top: 28px; padding: 28px; }
@keyframes loading { to { background-position: -200% 0; } }
@media (max-width: 760px) {
  .site-header, .dashboard { width: min(100% - 24px, 1100px); }
  .site-header { padding-top: 36px; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .inventory-facts { grid-template-columns: repeat(2, 1fr); }
  .card-topline { display: block; }
  .status-label { margin: 0 0 12px; }
}
@media (max-width: 440px) { .summary-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

- [ ] **Step 2: Verify responsive and accessibility behavior manually**

Run: `python -m http.server 8000`

Expected: at desktop width, cards have generous work-card spacing and complete facts; at 375px width, information stacks without hiding status, reasons, or action. Keyboard tabbing shows a visible focus style on future controls, and status text/icons remain understandable without relying on color.

### Task 5: Perform end-to-end verification and update project continuity

**Files:**

- Modify: `docs/HANDOFF.md`

**Interfaces:**

- Consumes: completed evaluator tests and browser verification.
- Produces: an accurate handoff for the next work session.

- [ ] **Step 1: Run the automated evaluator verification**

Run: `node --experimental-default-type=module --test tests/inventory-evaluator.test.js`

Expected: all 6 tests pass, including the fixed demo date, zero-sales safeguard, expired override, totals, and sort order.

- [ ] **Step 2: Run the browser verification checklist**

Run: `python -m http.server 8000`

Verify at `http://localhost:8000`:

```text
[ ] All 8 existing products render.
[ ] Summary reads Urgent 4, Low Stock 1, Expiring Soon 2, Safe 1.
[ ] Whole Milk, Sharp Cheddar Block, Salted Butter, and Cottage Cheese are Urgent.
[ ] Heavy Cream is Low Stock.
[ ] Plain Greek Yogurt and 2% Milk are Expiring Soon.
[ ] Shredded Mozzarella is Safe.
[ ] Cards show primary status, all reasons, supporting facts, and display-only action.
[ ] The demo date reads July 22, 2026.
[ ] Loading uses the briefing-shaped skeleton; a failed JSON load shows recovery guidance.
[ ] Desktop and mobile preserve hierarchy and visible reasoning.
[ ] Browser console contains no errors.
```

- [ ] **Step 3: Update the handoff after verified implementation**

Replace the project-state and completed-work portions of `docs/HANDOFF.md` with the verified result, and set its next exact task to the next approved MVP slice. Preserve the settled rules and specifications. Use this wording for the completed work:

```md
The first inventory-prioritization dashboard feature is implemented and verified against the existing eight-product sample data. The evaluator, summary counts, sorted work-task cards, loading state, error state, and responsive visual direction are in place.
```

- [ ] **Step 4: Check the final working tree without committing**

Run: `git status --short --branch`

Expected: application and documentation changes are visible for user review. Do not stage, commit, or push unless the user explicitly requests it.
