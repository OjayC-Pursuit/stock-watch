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
  assert.match(container.innerHTML, /Import a CSV inventory file to begin\./);
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
  assert.match(container.innerHTML, /<label[^>]+for="inventory-file"[^>]*>Replace CSV<\/label>/);
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
