import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createEmptyCounts,
  formatExpiration,
  getImportedHeadline,
  renderDashboard,
} from '../dashboard-renderer.js';
import {
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
} from '../inventory-evaluator.js';

const products = JSON.parse(
  readFileSync(new URL('../data/sample-inventory.json', import.meta.url), 'utf8'),
);

test('uses singular day wording for one day until expiration', () => {
  assert.equal(
    formatExpiration({
      expirationDate: '2026-07-23',
      daysUntilExpiration: 1,
    }),
    '2026-07-23 · 1 day',
  );
});

test('does not make the entire dashboard a live region', () => {
  const page = readFileSync(
    new URL('../index.html', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(
    page,
    /<main[\s\S]*?id="app"[\s\S]*?aria-live=/,
  );
});

test('renders the selected red-line board and prominent FreshRoute identity', () => {
  const evaluatedProducts = sortEvaluatedProducts(
    products.map(evaluateProduct),
  );
  const container = { innerHTML: '' };

  renderDashboard(
    container,
    evaluatedProducts,
    getStatusCounts(evaluatedProducts),
  );

  assert.match(
    container.innerHTML,
    /<h1 id="priority-headline">Four cases are at the red line\.<\/h1>/,
  );
  assert.match(container.innerHTML, /class="freshroute-hero-brand"/);
  assert.match(container.innerHTML, />FreshRoute<\/span>/);
  assert.match(container.innerHTML, /class="priority-rail"/);
});

test('nests product headings beneath their status groups', () => {
  const evaluatedProducts = sortEvaluatedProducts(
    products.map(evaluateProduct),
  );
  const container = { innerHTML: '' };

  renderDashboard(
    container,
    evaluatedProducts,
    getStatusCounts(evaluatedProducts),
  );

  assert.match(
    container.innerHTML,
    /<h2 id="urgent-heading">Urgent action queue · 4 cases<\/h2>/,
  );
  assert.match(container.innerHTML, /<h3>Whole Milk<\/h3>/);
});

test('renders an import-first empty state and grammar-correct imported headlines', () => {
  const container = { innerHTML: '' };
  renderDashboard(container, {
    phase: 'empty', activeFileName: null, attemptedFileName: null,
    statusMessage: '', errors: [], additionalErrorCount: 0,
    evaluatedProducts: [], counts: createEmptyCounts(),
  });
  assert.match(container.innerHTML, /Choose an inventory source to begin\./);
  assert.doesNotMatch(container.innerHTML, /class="product-card/);
  assert.equal(getImportedHeadline({ Urgent: 1, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0 }), '1 case is at the red line.');
  assert.equal(getImportedHeadline({ Urgent: 0, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 0 }), '2 products need attention today.');
});

test('does not leave ACTIVE dock aria-labelledby pointing to an absent EMPTY heading', () => {
  const container = { innerHTML: '' };
  renderDashboard(container, {
    phase: 'active', activeFileName: 'balanced-inventory.csv', attemptedFileName: null,
    statusMessage: 'Imported balanced-inventory.csv — 1 product loaded.', errors: [], additionalErrorCount: 0,
    evaluatedProducts: [], counts: createEmptyCounts(),
  });
  assert.doesNotMatch(container.innerHTML, /aria-labelledby="manifest-title"/);
});

test('associates the ACTIVE replacement control with the real file input', () => {
  const container = { innerHTML: '' };
  renderDashboard(container, {
    phase: 'active', activeFileName: 'balanced-inventory.csv', attemptedFileName: null,
    statusMessage: '', errors: [], additionalErrorCount: 0, evaluatedProducts: [], counts: createEmptyCounts(),
  });
  assert.match(container.innerHTML, /<label[^>]+for="inventory-file"[^>]*>Upload CSV<\/label>/);
});

test('escapes imported filenames, error text, and product fields before rendering', () => {
  const container = { innerHTML: '' };
  renderDashboard(container, {
    phase: 'active', activeFileName: '<img src=x onerror=alert(1)>.csv', attemptedFileName: null,
    statusMessage: 'Imported <unsafe>.csv — 1 product loaded.', errors: [], additionalErrorCount: 0,
    evaluatedProducts: [{ ...products[0], productName: '<script>alert(1)</script>', primaryStatus: 'Safe', reasons: [], daysUntilExpiration: 10, daysUntilStockout: null, recommendedAction: 'No immediate action needed' }],
    counts: { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 1 },
  });
  assert.doesNotMatch(container.innerHTML, /<script>|<img src=x/);
  assert.match(container.innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test('renders the three-source manifest switchboard in the true no-data state', () => {
  const container = { innerHTML: '' };

  renderDashboard(container, {
    phase: 'empty', activeSource: null, activeFileName: null, attemptedFileName: null,
    statusMessage: '', errors: [], additionalErrorCount: 0, exclusionNote: null,
    evaluatedProducts: [], counts: createEmptyCounts(),
  });

  assert.match(container.innerHTML, /Choose an inventory source to begin\./);
  assert.match(container.innerHTML, /<fieldset[^>]*aria-label="Choose inventory source"/);
  assert.match(container.innerHTML, /Load FreshRoute sample/);
  assert.match(container.innerHTML, /Upload CSV/);
  assert.match(container.innerHTML, /Load Kaggle historical training snapshot/);
  assert.equal((container.innerHTML.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.doesNotMatch(container.innerHTML, /class="product-card/);
});

test('renders source-aware Kaggle identity, historical headline, and card context', () => {
  const product = evaluateProduct({
    id: 'KAGGLE-ROW-0042', productName: 'Milk', category: 'Dairy', brand: 'Amul',
    quantityOnHand: 129, reorderThreshold: 43.17, salesRatePerDay: 558 / 22,
    expirationDate: '2026-08-13', storageCondition: 'Tetra Pack',
    sourceType: 'kaggle-historical-training',
    sourceMetadata: { Location: 'Uttar Pradesh', Date: '2021-12-01' },
  });
  const container = { innerHTML: '' };

  renderDashboard(container, {
    phase: 'active',
    activeSource: { type: 'kaggle-historical-training', title: 'Kaggle historical training snapshot' },
    activeFileName: null, attemptedFileName: null,
    statusMessage: 'Kaggle historical training snapshot loaded \u2014 80 inventory records.',
    exclusionNote: '80 historical records loaded; 2 ineligible source rows excluded.',
    errors: [], additionalErrorCount: 0, evaluatedProducts: [product],
    counts: { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 1 },
  });

  assert.match(container.innerHTML, /Historical training snapshot &mdash; not current inventory/);
  assert.match(container.innerHTML, /Historical inventory signal/);
  assert.match(container.innerHTML, /0 products need attention in this snapshot\./);
  assert.match(container.innerHTML, /Historical snapshot &middot; Uttar Pradesh &middot; Source date 2021-12-01/);
  assert.match(container.innerHTML, /129 liters\/kg/);
  assert.match(container.innerHTML, /80 historical records loaded; 2 ineligible source rows excluded\./);
});

test('keeps bundled Retry separate from CSV upload recovery in HOLD', () => {
  const container = { innerHTML: '' };
  const baseState = {
    activeSource: null, activeFileName: null, attemptedFileName: null,
    errors: [], additionalErrorCount: 0, exclusionNote: null,
    evaluatedProducts: [], counts: createEmptyCounts(),
  };

  renderDashboard(container, {
    ...baseState, phase: 'hold', retrySourceType: 'freshroute-sample',
    attemptedSource: { type: 'freshroute-sample', title: 'FreshRoute sample' },
    statusMessage: 'Could not load the FreshRoute sample. Try again.',
  });
  assert.match(container.innerHTML, /data-import-action="retry"/);
  assert.match(container.innerHTML, /Retry FreshRoute sample/);

  renderDashboard(container, {
    ...baseState, phase: 'hold', retrySourceType: null,
    attemptedFileName: 'invalid-inventory.csv',
    statusMessage: 'Could not import invalid-inventory.csv. Fix the listed issues and try again.',
    errors: [{ row: 2, column: 'brand', explanation: 'Brand is required.' }],
  });
  assert.doesNotMatch(container.innerHTML, /data-import-action="retry"/);
  assert.match(container.innerHTML, /Choose a corrected file and upload it again\./);
});
