import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildKaggleTrainingSnapshot,
  FRESHROUTE_SOURCE_TYPE,
  KAGGLE_SOURCE_TYPE,
  normalizeFreshRouteSample,
  normalizeKaggleRow,
  parseFreshRouteSample,
  parseKaggleTrainingSnapshot,
  selectKaggleSnapshot,
  validateKaggleHeaders,
} from '../inventory-source-loaders.js';
import { parseCsv } from '../csv-parser.js';
import { evaluateProduct, getStatusCounts } from '../inventory-evaluator.js';

const samplePath = new URL('../data/sample-inventory.json', import.meta.url);
const freshRouteSample = JSON.parse(readFileSync(samplePath, 'utf8'));
const kagglePath = new URL('../data/demo-csv/dairy_dataset.csv', import.meta.url);

const KAGGLE_HEADERS = [
  'Location',
  'Date',
  'Product ID',
  'Product Name',
  'Brand',
  'Quantity Sold (liters/kg)',
  'Shelf Life (days)',
  'Storage Condition',
  'Production Date',
  'Expiration Date',
  'Quantity in Stock (liters/kg)',
  'Minimum Stock Threshold (liters/kg)',
];

function kaggleRow(overrides = {}) {
  const values = {
    Location: 'Uttar Pradesh',
    Date: '2021-12-01',
    'Product ID': '1',
    'Product Name': 'Milk',
    Brand: 'Amul',
    'Quantity Sold (liters/kg)': '558',
    'Shelf Life (days)': '22',
    'Storage Condition': 'Tetra Pack',
    'Production Date': '2021-10-03',
    'Expiration Date': '2021-10-25',
    'Quantity in Stock (liters/kg)': '129',
    'Minimum Stock Threshold (liters/kg)': '43.17',
    ...overrides,
  };
  return {
    line: 42,
    cells: KAGGLE_HEADERS.map((header) => values[header]),
  };
}

function kaggleHeaderIndexes(headers = KAGGLE_HEADERS) {
  return new Map(headers.map((header, index) => [header, index]));
}

test('normalizes the bundled FreshRoute JSON into exactly eight valid inventory records', () => {
  const result = normalizeFreshRouteSample(freshRouteSample);

  assert.equal(result.ok, true);
  assert.equal(result.records.length, 8);
  assert.equal(result.records[0].sourceType, FRESHROUTE_SOURCE_TYPE);
  assert.equal(result.records[0].sourceMetadata, freshRouteSample[0]);
  assert.deepEqual(
    result.records.map((record) => record.id),
    freshRouteSample.map((record) => record.id),
  );
});

test('fails the entire FreshRoute source when any bundled record is invalid', () => {
  const invalidSample = freshRouteSample.map((record) => ({ ...record }));
  invalidSample[3].salesRatePerDay = -1;

  const result = normalizeFreshRouteSample(invalidSample);

  assert.equal(result.ok, false);
  assert.match(result.diagnostics.join('\n'), /salesRatePerDay/i);
});

test('parses the bundled FreshRoute JSON text and rejects malformed source text', () => {
  const validResult = parseFreshRouteSample(readFileSync(samplePath, 'utf8'));
  const invalidResult = parseFreshRouteSample('{ not valid JSON');

  assert.equal(validResult.ok, true);
  assert.equal(validResult.records.length, 8);
  assert.equal(invalidResult.ok, false);
  assert.match(invalidResult.diagnostics[0], /valid JSON/i);
});

test('normalizes a valid Kaggle row with stable identity, derived timing, and preserved source evidence', () => {
  const sourceRow = kaggleRow();

  const result = normalizeKaggleRow(sourceRow, kaggleHeaderIndexes());

  assert.equal(result.ok, true);
  assert.equal(result.record.id, 'KAGGLE-ROW-0042');
  assert.equal(result.record.sourceType, KAGGLE_SOURCE_TYPE);
  assert.equal(result.record.category, 'Dairy');
  assert.equal(result.record.salesRatePerDay, 558 / 22);
  assert.equal(result.record.expirationDate, '2026-08-13');
  assert.equal(result.record.sourceMetadata['Product ID'], '1');
  assert.equal(result.record.sourceMetadata.Location, 'Uttar Pradesh');
});

test('excludes Kaggle rows with invalid shelf life, dates, stock values, or visible location', () => {
  const invalidRows = [
    kaggleRow({ 'Shelf Life (days)': '0' }),
    kaggleRow({ 'Shelf Life (days)': '2.5' }),
    kaggleRow({ Date: '2021-02-30' }),
    kaggleRow({ 'Quantity in Stock (liters/kg)': '-1' }),
    kaggleRow({ Location: '   ' }),
  ];

  for (const row of invalidRows) {
    assert.equal(normalizeKaggleRow(row, kaggleHeaderIndexes()).ok, false);
  }
});

test('keeps blank Kaggle storage eligible with a descriptive default', () => {
  const result = normalizeKaggleRow(
    kaggleRow({ 'Storage Condition': '   ' }),
    kaggleHeaderIndexes(),
  );

  assert.equal(result.ok, true);
  assert.equal(result.record.storageCondition, 'Not specified');
  assert.equal(result.record.sourceMetadata['Storage Condition'], '   ');
});

test('enforces exact Kaggle headers while allowing an absent Customer Location and preserving extra columns', () => {
  const missingRequired = [
    { line: 1, cells: KAGGLE_HEADERS.filter((header) => header !== 'Location') },
    kaggleRow(),
  ];
  const duplicateOptional = [
    { line: 1, cells: [...KAGGLE_HEADERS, 'Customer Location', 'Customer Location'] },
    { line: 2, cells: [...kaggleRow().cells, 'Kerala', 'Kerala'] },
  ];
  const duplicateRequired = [
    { line: 1, cells: [...KAGGLE_HEADERS, 'Product Name'] },
    { line: 2, cells: [...kaggleRow().cells, 'Milk'] },
  ];

  assert.equal(buildKaggleTrainingSnapshot(missingRequired).ok, false);
  assert.equal(buildKaggleTrainingSnapshot(duplicateOptional).ok, false);
  assert.equal(buildKaggleTrainingSnapshot(duplicateRequired).ok, false);
  const result = validateKaggleHeaders([...KAGGLE_HEADERS, 'Extra audit field']);
  assert.equal(result.ok, true);
  assert.equal(result.headerIndexes.get('Extra audit field'), 12);
  const normalized = normalizeKaggleRow(
    { line: 2, cells: [...kaggleRow().cells, 'kept'] },
    result.headerIndexes,
  );
  assert.equal(normalized.ok, true);
  assert.equal(normalized.record.sourceMetadata['Extra audit field'], 'kept');
});

test('selects the approved fixed Kaggle status mix deterministically and fails when a target is unavailable', () => {
  const candidates = [
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `U-${index}`, productName: `Urgent ${index}`, brand: 'Brand U',
      sourceMetadata: { Location: 'Location U' }, primaryStatus: 'Urgent',
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `L-${index}`, productName: `Low ${index}`, brand: 'Brand L',
      sourceMetadata: { Location: 'Location L' }, primaryStatus: 'Low Stock',
    })),
    ...Array.from({ length: 16 }, (_, index) => ({
      id: `E-${index}`, productName: `Expiring ${index}`, brand: 'Brand E',
      sourceMetadata: { Location: 'Location E' }, primaryStatus: 'Expiring Soon',
    })),
    ...Array.from({ length: 40 }, (_, index) => ({
      id: `S-${index}`, productName: `Safe ${index}`, brand: 'Brand S',
      sourceMetadata: { Location: 'Location S' }, primaryStatus: 'Safe',
    })),
  ].map((candidate, index) => ({ ...candidate, sourceRowNumber: index + 2 }));

  const first = selectKaggleSnapshot(candidates);
  const second = selectKaggleSnapshot(candidates);
  const insufficient = selectKaggleSnapshot(candidates.filter((candidate) => candidate.primaryStatus !== 'Urgent' || candidate.id !== 'U-11'));

  assert.equal(first.ok, true);
  assert.deepEqual(getStatusCounts(first.records), {
    Urgent: 12, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 40,
  });
  assert.deepEqual(first.records.map((record) => record.id), second.records.map((record) => record.id));
  assert.equal(insufficient.ok, false);
  assert.match(insufficient.diagnostics[0], /Urgent/i);
});

test('parses the bundled Kaggle CSV into the approved deterministic 80-record snapshot', () => {
  const fullSource = readFileSync(kagglePath, 'utf8');
  const first = parseKaggleTrainingSnapshot(fullSource);
  const second = parseKaggleTrainingSnapshot(fullSource);

  assert.equal(parseCsv(fullSource).rows.length, 4326);
  assert.equal(first.ok, true);
  assert.equal(first.records.length, 80);
  assert.equal(first.excludedRowCount, 0);
  assert.ok(Object.hasOwn(first.records[0].sourceMetadata, 'Customer Location'));
  assert.deepEqual(getStatusCounts(first.records.map(evaluateProduct)), {
    Urgent: 12, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 40,
  });
  assert.deepEqual(first.records.map((record) => record.id), second.records.map((record) => record.id));
});

test('fails malformed Kaggle CSV text and excludes invalid rows before selecting a valid snapshot', () => {
  const malformed = parseKaggleTrainingSnapshot('Location,"Date\nUttar Pradesh,2021-12-01');
  const parsed = parseCsv(readFileSync(kagglePath, 'utf8'));
  const invalidFirstRecord = {
    ...parsed.rows[1],
    cells: [...parsed.rows[1].cells],
  };
  invalidFirstRecord.cells[0] = '';
  const result = buildKaggleTrainingSnapshot([
    parsed.rows[0],
    invalidFirstRecord,
    ...parsed.rows.slice(2),
  ]);

  assert.equal(malformed.ok, false);
  assert.equal(result.ok, true);
  assert.equal(result.excludedRowCount, 1);
  assert.equal(result.records.length, 80);
});
