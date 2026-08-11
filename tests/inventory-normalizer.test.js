import assert from 'node:assert/strict';
import test from 'node:test';

import { validateNormalizedInventory } from '../inventory-normalizer.js';

function createRecord(overrides = {}) {
  return {
    id: 'FRESHROUTE-001',
    productName: 'Whole Milk',
    category: 'Milk',
    brand: 'FreshRoute Farms',
    quantityOnHand: 18,
    reorderThreshold: 25,
    salesRatePerDay: 8,
    expirationDate: '2026-07-28',
    storageCondition: 'Refrigerated',
    sourceType: 'freshroute-sample',
    sourceMetadata: { originalId: 'FRESHROUTE-001' },
    ...overrides,
  };
}

test('validates normalized inventory without changing its traceability metadata', () => {
  const record = createRecord();

  const result = validateNormalizedInventory([record], {
    expectedRecordCount: 1,
    sourceType: 'freshroute-sample',
  });

  assert.equal(result.ok, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].sourceMetadata, record.sourceMetadata);
});

test('rejects invalid internal fields and duplicate IDs as a whole source failure', () => {
  const result = validateNormalizedInventory(
    [
      createRecord({ quantityOnHand: -1 }),
      createRecord({ expirationDate: '2026-02-30' }),
    ],
    { expectedRecordCount: 2, sourceType: 'freshroute-sample' },
  );

  assert.equal(result.ok, false);
  assert.match(result.diagnostics.join('\n'), /quantityOnHand/i);
  assert.match(result.diagnostics.join('\n'), /expirationDate/i);
  assert.match(result.diagnostics.join('\n'), /Duplicate id/i);
});

test('rejects a source whose normalized record count does not match its contract', () => {
  const result = validateNormalizedInventory([createRecord()], {
    expectedRecordCount: 8,
    sourceType: 'freshroute-sample',
  });

  assert.equal(result.ok, false);
  assert.match(result.diagnostics[0], /exactly 8 inventory records/i);
});
