import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCsv } from '../csv-parser.js';
import { validateInventoryRows } from '../inventory-validator.js';
import { evaluateProduct, getStatusCounts } from '../inventory-evaluator.js';
import { getImportedHeadline } from '../dashboard-renderer.js';

const expected = {
  'balanced-inventory.csv': [{ Urgent: 4, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 48 }, '4 cases are at the red line.'],
  'high-urgency-inventory.csv': [{ Urgent: 45, 'Low Stock': 10, 'Expiring Soon': 10, Safe: 15 }, '45 cases are at the red line.'],
  'expiration-heavy-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 60, Safe: 20 }, '60 products need attention today.'],
  'all-safe-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 80 }, 'Inventory is clear for today.'],
};
const approvedHeader = [
  'id',
  'productName',
  'category',
  'brand',
  'quantityOnHand',
  'reorderThreshold',
  'salesRatePerDay',
  'expirationDate',
  'storageCondition',
];

for (const [fileName, [counts, headline]] of Object.entries(expected)) {
  test(`${fileName} produces its approved totals and headline through the evaluator`, () => {
    const csv = readFileSync(new URL(`../data/demo-csv/${fileName}`, import.meta.url), 'utf8');
    const parsed = parseCsv(csv);
    const validated = validateInventoryRows(parsed.rows);
    assert.equal(validated.ok, true);
    assert.deepEqual(parsed.rows[0].cells, approvedHeader);
    const actualCounts = getStatusCounts(validated.products.map(evaluateProduct));
    assert.equal(validated.products.length, 80);
    assert.equal(Object.values(actualCounts).reduce((total, count) => total + count, 0), 80);
    assert.deepEqual(actualCounts, counts);
    assert.equal(getImportedHeadline(actualCounts), headline);
  });
}

test('invalid-inventory.csv is rejected with row and column errors', () => {
  const csv = readFileSync(new URL('../data/demo-csv/invalid-inventory.csv', import.meta.url), 'utf8');
  const parsed = parseCsv(csv);
  const result = validateInventoryRows(parsed.rows);
  assert.deepEqual(parsed.rows[0].cells, approvedHeader);
  assert.equal(parsed.rows.length - 1, 80);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 5);
  assert.deepEqual(result.errors.map((error) => [error.row, error.column]), [
    [2, 'quantityOnHand'], [3, 'expirationDate'], [4, 'brand'], [5, 'salesRatePerDay'], [7, 'id'],
  ]);
});
