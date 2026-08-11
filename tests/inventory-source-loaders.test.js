import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FRESHROUTE_SOURCE_TYPE,
  normalizeFreshRouteSample,
  parseFreshRouteSample,
} from '../inventory-source-loaders.js';

const samplePath = new URL('../data/sample-inventory.json', import.meta.url);
const freshRouteSample = JSON.parse(readFileSync(samplePath, 'utf8'));

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
