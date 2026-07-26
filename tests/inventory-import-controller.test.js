import assert from 'node:assert/strict';
import test from 'node:test';
import { createInventoryImportController, getFileSelectionError } from '../inventory-import-controller.js';
import { parseCsv } from '../csv-parser.js';
import { validateInventoryRows } from '../inventory-validator.js';
import { evaluateProduct, getStatusCounts, sortEvaluatedProducts } from '../inventory-evaluator.js';

const validCsv = `productName,category,brand,quantityOnHand,reorderThreshold,salesRatePerDay,expirationDate\nWhole Milk,Milk,Hearth,18,24,14,2026-07-25`;
const invalidCsv = `productName,category,brand,quantityOnHand,reorderThreshold,salesRatePerDay,expirationDate\nWhole Milk,Milk,Hearth,-1,24,14,2026-07-25`;

function file(name, text, size = text.length) {
  return { name, size, text: async () => text };
}

function controllerFor(textByName = {}) {
  const renders = [];
  const controller = createInventoryImportController({
    readText: (selected) => selected.text(), parseCsv, validateInventoryRows,
    evaluateProduct, getStatusCounts, sortEvaluatedProducts,
    render: (state) => renders.push(state),
  });
  return { controller, renders, textByName };
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
  assert.equal(controller.getState().statusMessage,
    'Inventory cleared. Import a CSV inventory file to begin.');
});

test('rejects wrong types and oversized files before parsing', () => {
  assert.equal(getFileSelectionError({ name: 'inventory.txt', size: 1 }), 'Choose a .csv inventory file.');
  assert.equal(getFileSelectionError({ name: 'inventory.csv', size: 1_048_577 }),
    'The file exceeds the 1 MB import limit.');
});
