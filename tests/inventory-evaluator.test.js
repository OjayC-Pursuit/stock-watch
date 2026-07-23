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
  const statuses = Object.fromEntries(
    evaluated.map((product) => [product.id, product.primaryStatus]),
  );

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
  const wholeMilk = evaluateProduct(
    products.find((product) => product.id === 'DAIRY-001'),
  );

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

test('keeps non-triggering projections out of Safe status reasons', () => {
  const mozzarella = evaluateProduct(
    products.find((product) => product.id === 'DAIRY-008'),
  );

  assert.equal(mozzarella.primaryStatus, 'Safe');
  assert.deepEqual(mozzarella.reasons, []);
  assert.equal(mozzarella.daysUntilStockout, 4);
});

test('marks expired inventory Urgent with its override action', () => {
  const product = evaluateProduct({
    ...products[0],
    expirationDate: '2026-07-21',
  });

  assert.equal(product.primaryStatus, 'Urgent');
  assert.equal(product.recommendedAction, 'Remove from inventory today');
  assert.match(product.reasons.join(' '), /expired 1 day ago/);
});

test('sorts by status, then by the approved time-sensitive value', () => {
  const sorted = sortEvaluatedProducts(products.map(evaluateProduct));

  assert.deepEqual(
    sorted.map((product) => product.id),
    [
      'DAIRY-001',
      'DAIRY-005',
      'DAIRY-003',
      'DAIRY-006',
      'DAIRY-007',
      'DAIRY-004',
      'DAIRY-002',
      'DAIRY-008',
    ],
  );
});
