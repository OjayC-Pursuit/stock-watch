import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  formatExpiration,
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
