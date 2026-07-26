import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCsv } from '../csv-parser.js';
import { validateInventoryRows } from '../inventory-validator.js';
import { evaluateProduct, getStatusCounts } from '../inventory-evaluator.js';
import { getImportedHeadline } from '../dashboard-renderer.js';

const expected = {
  'balanced-inventory.csv': [{ Urgent: 0, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 4 }, '2 products need attention today.'],
  'high-urgency-inventory.csv': [{ Urgent: 4, 'Low Stock': 1, 'Expiring Soon': 1, Safe: 0 }, '4 cases are at the red line.'],
  'expiration-heavy-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 5, Safe: 1 }, '5 products need attention today.'],
  'all-safe-inventory.csv': [{ Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 6 }, 'Inventory is clear for today.'],
};

for (const [fileName, [counts, headline]] of Object.entries(expected)) {
  test(`${fileName} produces its approved totals and headline through the evaluator`, () => {
    const csv = readFileSync(new URL(`../data/demo-csv/${fileName}`, import.meta.url), 'utf8');
    const parsed = parseCsv(csv);
    const validated = validateInventoryRows(parsed.rows);
    assert.equal(validated.ok, true);
    const actualCounts = getStatusCounts(validated.products.map(evaluateProduct));
    assert.deepEqual(actualCounts, counts);
    assert.equal(getImportedHeadline(actualCounts), headline);
  });
}

test('invalid-inventory.csv is rejected with row and column errors', () => {
  const csv = readFileSync(new URL('../data/demo-csv/invalid-inventory.csv', import.meta.url), 'utf8');
  const result = validateInventoryRows(parseCsv(csv).rows);
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map((error) => [error.row, error.column]), [
    [2, 'quantityOnHand'], [3, 'expirationDate'],
  ]);
});
