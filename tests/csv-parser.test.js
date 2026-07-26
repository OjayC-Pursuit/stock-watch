import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv } from '../csv-parser.js';

test('parses quoted commas, escaped quotes, CRLF, and blank lines', () => {
  const result = parseCsv(
    'productName,brand\r\n"Cream, Heavy","Fresh ""Route"""\r\n\r\nMilk,Hearth\r\n',
  );

  assert.deepEqual(result, {
    ok: true,
    rows: [
      { line: 1, cells: ['productName', 'brand'] },
      { line: 2, cells: ['Cream, Heavy', 'Fresh "Route"'] },
      { line: 4, cells: ['Milk', 'Hearth'] },
    ],
  });
});

test('keeps partial rows for the validator', () => {
  assert.deepEqual(parseCsv('productName,category\nWhole Milk'), {
    ok: true,
    rows: [
      { line: 1, cells: ['productName', 'category'] },
      { line: 2, cells: ['Whole Milk'] },
    ],
  });
});

test('reports an unclosed quoted field with its source location', () => {
  assert.deepEqual(parseCsv('productName\n"Whole Milk'), {
    ok: false,
    error: { line: 2, column: 1, message: 'Unclosed quoted field.' },
  });
});
