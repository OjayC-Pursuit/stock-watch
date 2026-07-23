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

test('nests status and product headings beneath the queue heading', () => {
  const evaluatedProducts = sortEvaluatedProducts(
    products.map(evaluateProduct),
  );
  const container = { innerHTML: '' };

  renderDashboard(
    container,
    evaluatedProducts,
    getStatusCounts(evaluatedProducts),
  );

  assert.match(container.innerHTML, /<h3 id="urgent-heading">Urgent<\/h3>/);
  assert.match(container.innerHTML, /<h4>Whole Milk<\/h4>/);
});
