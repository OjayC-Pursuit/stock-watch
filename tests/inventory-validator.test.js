import assert from 'node:assert/strict';
import test from 'node:test';
import { validateInventoryRows } from '../inventory-validator.js';

const header = [
  'productName', 'category', 'brand', 'quantityOnHand', 'reorderThreshold',
  'salesRatePerDay', 'expirationDate', 'id', 'storageCondition',
];

function rows(values, extra = {}) {
  return [
    { line: 1, cells: extra.headers ?? header },
    ...values.map((cells, index) => ({ line: index + 2, cells })),
  ];
}

const validRow = [
  'Whole Milk', 'Milk', 'Hearth Valley', '18', '24', '14', '2026-07-25',
  'DAIRY-001', 'Refrigerated',
];

test('accepts headers in arbitrary order, trims values, and ignores extras', () => {
  const result = validateInventoryRows(rows([
    ['  Whole Milk ', ' 18 ', 'Milk', '2026-07-25', 'Hearth Valley', '14', '24', 'note', 'DAIRY-001', 'Refrigerated'],
  ], { headers: [' productName ', 'quantityOnHand', 'category', 'expirationDate', 'brand', 'salesRatePerDay', 'reorderThreshold', 'notes', 'id', 'storageCondition'] }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.products[0], {
    productName: 'Whole Milk', category: 'Milk', brand: 'Hearth Valley',
    quantityOnHand: 18, reorderThreshold: 24, salesRatePerDay: 14,
    expirationDate: '2026-07-25', id: 'DAIRY-001', storageCondition: 'Refrigerated',
  });
});

test('rejects missing or duplicate required headers', () => {
  const result = validateInventoryRows(rows([validRow], {
    headers: [...header.filter((name) => name !== 'brand'), 'quantityOnHand'],
  }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map((error) => error.column), ['brand', 'quantityOnHand']);
});

test('rejects required blanks, invalid dates, negative, nonnumeric, and non-finite numbers', () => {
  const result = validateInventoryRows(rows([
    ['Whole Milk', 'Milk', '', '-1', 'Infinity', 'nope', '2026-02-30', 'id-1', ''],
  ]));
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map((error) => error.column), [
    'brand', 'quantityOnHand', 'reorderThreshold', 'salesRatePerDay', 'expirationDate',
  ]);
});

test('accepts zero and decimal numbers, generates IDs, and defaults storage', () => {
  const result = validateInventoryRows(rows([
    ['Cream', 'Cream', 'FreshRoute', '0.5', '0', '0', '2026-08-10', '', ''],
    ['Yogurt', 'Yogurt', 'FreshRoute', '1', '0.25', '2.5', '2026-08-11', '', ''],
  ]), { idPrefix: 'import' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.products.map((product) => [product.id, product.storageCondition, product.salesRatePerDay]), [
    ['import-1', 'Not specified', 0], ['import-2', 'Not specified', 2.5],
  ]);
});

test('rejects duplicate supplied IDs and caps displayed errors at five', () => {
  const repeated = Array.from({ length: 6 }, (_, index) => [
    '', 'Milk', 'Brand', '1', '1', '1', '2026-08-10', `same-${index < 2 ? 1 : index}`, 'Cold',
  ]);
  const result = validateInventoryRows(rows(repeated));
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 5);
  assert.equal(result.additionalErrorCount, 2);
});

test('rejects a header-only file and more than 250 product rows', () => {
  assert.equal(validateInventoryRows([{ line: 1, cells: header }]).message,
    'The file has no product rows to import.');
  assert.equal(validateInventoryRows(rows(Array.from({ length: 251 }, () => validRow))).message,
    'The file exceeds the 250-product import limit.');
});
