import assert from 'node:assert/strict';
import test from 'node:test';
import { createInventoryImportController, getFileSelectionError } from '../inventory-import-controller.js';
import { parseCsv } from '../csv-parser.js';
import { normalizeFreshRouteSample } from '../inventory-source-loaders.js';
import { validateInventoryRows } from '../inventory-validator.js';
import { evaluateProduct, getStatusCounts, sortEvaluatedProducts } from '../inventory-evaluator.js';

const validCsv = `productName,category,brand,quantityOnHand,reorderThreshold,salesRatePerDay,expirationDate\nWhole Milk,Milk,Hearth,18,24,14,2026-07-25`;
const invalidCsv = `productName,category,brand,quantityOnHand,reorderThreshold,salesRatePerDay,expirationDate\nWhole Milk,Milk,Hearth,-1,24,14,2026-07-25`;

function file(name, text, size = text.length) {
  return { name, size, text: async () => text };
}

function sourceRecords(count, prefix) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    productName: `${prefix} Product ${index + 1}`,
    category: 'Dairy',
    brand: `${prefix} Farms`,
    quantityOnHand: 20,
    reorderThreshold: 10,
    salesRatePerDay: 2,
    expirationDate: '2026-08-15',
    storageCondition: 'Refrigerated',
    sourceType: prefix === 'KAGGLE' ? 'kaggle-historical-training' : 'freshroute-sample',
    sourceMetadata: { Location: 'Test location' },
  }));
}

function controllerFor({ loadFreshRouteRecords, loadKaggleRecords } = {}) {
  const renders = [];
  const controller = createInventoryImportController({
    readText: (selected) => selected.text(), parseCsv, validateInventoryRows,
    evaluateProduct, getStatusCounts, sortEvaluatedProducts,
    loadFreshRouteRecords,
    loadKaggleRecords,
    render: (state) => renders.push(state),
  });
  return { controller, renders };
}

test('starts empty and replaces state only after a complete valid import', async () => {
  const { controller, renders } = controllerFor();
  assert.deepEqual(controller.getState().counts, {
    Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0,
  });

  await controller.importFile(file('balanced-inventory.csv', validCsv));
  assert.equal(controller.getState().phase, 'active');
  assert.equal(controller.getState().activeFileName, 'balanced-inventory.csv');
  assert.equal(controller.getState().statusMessage, 'Imported balanced-inventory.csv — 1 product loaded.');
  assert.equal(renders.at(-1).evaluatedProducts.length, 1);
});

test('preserves active inventory after an invalid replacement and resets empty', async () => {
  const { controller } = controllerFor();
  await controller.importFile(file('balanced-inventory.csv', validCsv));
  await controller.importFile(file('invalid-inventory.csv', invalidCsv));

  assert.equal(controller.getState().phase, 'hold');
  assert.equal(controller.getState().activeFileName, 'balanced-inventory.csv');
  assert.equal(controller.getState().attemptedFileName, 'invalid-inventory.csv');
  assert.equal(controller.getState().evaluatedProducts.length, 1);
  assert.equal(controller.getState().statusMessage,
    'Could not import invalid-inventory.csv. Fix the listed issues and try again.');

  controller.reset();
  assert.equal(controller.getState().phase, 'empty');
  assert.equal(controller.getState().activeFileName, null);
  assert.equal(controller.getState().evaluatedProducts.length, 0);
  assert.equal(controller.getState().statusMessage, '');
});

test('rejects wrong types and oversized files before parsing', () => {
  assert.equal(getFileSelectionError({ name: 'inventory.txt', size: 1 }), 'Choose a .csv inventory file.');
  assert.equal(getFileSelectionError({ name: 'inventory.csv', size: 1_048_577 }),
    'The file exceeds the 1 MB import limit.');
});

test('loads all eight validated FreshRoute records only after the source succeeds', async () => {
  const sourceRecords = Array.from({ length: 8 }, (_, index) => ({
    id: `FRESHROUTE-${String(index + 1).padStart(3, '0')}`,
    productName: `FreshRoute Product ${index + 1}`,
    category: 'Dairy',
    brand: 'FreshRoute Farms',
    quantityOnHand: 20,
    reorderThreshold: 10,
    salesRatePerDay: 2,
    expirationDate: '2026-08-15',
  }));
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => normalizeFreshRouteSample(sourceRecords),
  });

  await controller.loadFreshRouteSample();

  assert.equal(controller.getState().phase, 'active');
  assert.equal(controller.getState().activeSourceType, 'freshroute-sample');
  assert.equal(controller.getState().evaluatedProducts.length, 8);
  assert.equal(controller.getState().statusMessage,
    'FreshRoute sample loaded \u2014 8 inventory records.');
});

test('preserves active inventory when FreshRoute fails and retries the same source', async () => {
  let attempts = 0;
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => {
      attempts += 1;
      return attempts === 1
        ? { ok: false, diagnostics: ['Invalid bundled record.'] }
        : normalizeFreshRouteSample(Array.from({ length: 8 }, (_, index) => ({
          id: `FRESHROUTE-${String(index + 1).padStart(3, '0')}`,
          productName: `FreshRoute Product ${index + 1}`,
          category: 'Dairy',
          brand: 'FreshRoute Farms',
          quantityOnHand: 20,
          reorderThreshold: 10,
          salesRatePerDay: 2,
          expirationDate: '2026-08-15',
        })));
    },
  });

  await controller.importFile(file('balanced-inventory.csv', validCsv));
  await controller.loadFreshRouteSample();

  assert.equal(controller.getState().phase, 'hold');
  assert.equal(controller.getState().activeFileName, 'balanced-inventory.csv');
  assert.equal(controller.getState().evaluatedProducts.length, 1);
  assert.equal(controller.getState().statusMessage,
    'Could not load the FreshRoute sample. Try again.');

  await controller.retry();

  assert.equal(attempts, 2);
  assert.equal(controller.getState().phase, 'active');
  assert.equal(controller.getState().activeSourceType, 'freshroute-sample');
  assert.equal(controller.getState().evaluatedProducts.length, 8);
});

test('keeps the true no-data state after a first FreshRoute failure', async () => {
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => ({ ok: false, diagnostics: ['Invalid bundled record.'] }),
  });

  await controller.loadFreshRouteSample();

  assert.equal(controller.getState().phase, 'hold');
  assert.equal(controller.getState().activeSourceType, null);
  assert.equal(controller.getState().activeFileName, null);
  assert.equal(controller.getState().evaluatedProducts.length, 0);
  assert.equal(controller.getState().statusMessage,
    'Could not load the FreshRoute sample. Try again.');
});

test('switches CSV, FreshRoute, and Kaggle only after each source succeeds', async () => {
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => ({ ok: true, records: sourceRecords(8, 'FRESHROUTE') }),
    loadKaggleRecords: async () => ({ ok: true, records: sourceRecords(80, 'KAGGLE') }),
  });

  await controller.importFile(file('balanced-inventory.csv', validCsv));
  await controller.loadFreshRouteSample();
  assert.equal(controller.getState().activeSource.type, 'freshroute-sample');
  assert.equal(controller.getState().evaluatedProducts.length, 8);

  await controller.loadKaggleSnapshot();
  assert.equal(controller.getState().activeSource.type, 'kaggle-historical-training');
  assert.equal(controller.getState().evaluatedProducts.length, 80);
  assert.equal(controller.getState().statusMessage,
    'Kaggle historical training snapshot loaded \u2014 80 inventory records.');
});

test('keeps active records during a pending Kaggle replacement and after its failure', async () => {
  let rejectKaggle;
  const deferredKaggle = new Promise((resolve, reject) => {
    rejectKaggle = reject;
  });
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => ({ ok: true, records: sourceRecords(8, 'FRESHROUTE') }),
    loadKaggleRecords: async () => deferredKaggle,
  });

  await controller.loadFreshRouteSample();
  const pending = controller.loadKaggleSnapshot();
  assert.equal(controller.getState().phase, 'checking');
  assert.equal(controller.getState().activeSource.type, 'freshroute-sample');
  assert.deepEqual(controller.getState().attemptedSource, {
    type: 'kaggle-historical-training',
    title: 'Kaggle historical training snapshot',
  });
  assert.equal(controller.getState().evaluatedProducts.length, 8);

  rejectKaggle(new Error('read failed'));
  await pending;

  assert.equal(controller.getState().phase, 'hold');
  assert.equal(controller.getState().activeSource.type, 'freshroute-sample');
  assert.equal(controller.getState().evaluatedProducts.length, 8);
  assert.equal(controller.getState().statusMessage,
    'Could not load the Kaggle historical training snapshot. Try again.');
  assert.equal(controller.getState().retrySourceType, 'kaggle-historical-training');
});

test('retries a failed Kaggle source but does not retry an invalid uploaded CSV', async () => {
  let kaggleAttempts = 0;
  const { controller } = controllerFor({
    loadFreshRouteRecords: async () => ({ ok: true, records: sourceRecords(8, 'FRESHROUTE') }),
    loadKaggleRecords: async () => {
      kaggleAttempts += 1;
      return kaggleAttempts === 1
        ? { ok: false, diagnostics: ['source issue'] }
        : { ok: true, records: sourceRecords(80, 'KAGGLE') };
    },
  });

  await controller.loadFreshRouteSample();
  await controller.loadKaggleSnapshot();
  await controller.retry();
  assert.equal(kaggleAttempts, 2);
  assert.equal(controller.getState().activeSource.type, 'kaggle-historical-training');

  await controller.importFile(file('invalid-inventory.csv', invalidCsv));
  assert.equal(controller.getState().retrySourceType, null);
  await controller.retry();
  assert.equal(kaggleAttempts, 2);
  assert.equal(controller.getState().activeSource.type, 'kaggle-historical-training');
});

test('reset clears records, source identity, transient messages, retry state, and exclusion notes', async () => {
  const { controller } = controllerFor({
    loadKaggleRecords: async () => ({
      ok: true,
      records: sourceRecords(80, 'KAGGLE'),
      excludedRowCount: 2,
    }),
  });

  await controller.loadKaggleSnapshot();
  controller.reset();

  assert.equal(controller.getState().phase, 'empty');
  assert.equal(controller.getState().activeSource, null);
  assert.equal(controller.getState().activeSourceType, null);
  assert.equal(controller.getState().retrySourceType, null);
  assert.equal(controller.getState().statusMessage, '');
  assert.equal(controller.getState().exclusionNote, null);
  assert.deepEqual(controller.getState().evaluatedProducts, []);
  assert.deepEqual(controller.getState().counts, {
    Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0,
  });
});
