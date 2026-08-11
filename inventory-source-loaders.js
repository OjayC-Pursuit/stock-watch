import { validateNormalizedInventory } from './inventory-normalizer.js';
import { parseCsv } from './csv-parser.js';
import { evaluateProduct } from './inventory-evaluator.js';

export const FRESHROUTE_SOURCE_TYPE = 'freshroute-sample';
export const KAGGLE_SOURCE_TYPE = 'kaggle-historical-training';

const KAGGLE_REQUIRED_COLUMNS = [
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
const KAGGLE_OPTIONAL_COLUMNS = ['Customer Location'];
const KAGGLE_STATUS_TARGETS = [
  ['Urgent', 12],
  ['Low Stock', 12],
  ['Expiring Soon', 16],
  ['Safe', 40],
];
const KAGGLE_DEMO_DATE = '2026-07-22';

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseFiniteNonNegativeNumber(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    return null;
  }
  const number = Number(trimmed);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function parsePositiveWholeNumber(value) {
  const number = parseFiniteNonNegativeNumber(value);
  return number !== null && Number.isInteger(number) && number > 0 ? number : null;
}

function addCalendarDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function toSourceMetadata(cells, headerIndexes) {
  return Object.fromEntries(
    [...headerIndexes.entries()].map(([header, index]) => [header, cells[index]]),
  );
}

function sourceRowNumber(record) {
  return Number.isInteger(record.sourceRowNumber) ? record.sourceRowNumber : Infinity;
}

function locationFor(record) {
  return String(record.sourceMetadata?.Location ?? '').trim();
}

function withoutEvaluationFields(record) {
  const {
    daysUntilExpiration,
    daysUntilStockout,
    primaryStatus,
    reasons,
    recommendedAction,
    ...normalizedRecord
  } = record;
  return normalizedRecord;
}

export function parseFreshRouteSample(sourceText) {
  if (typeof sourceText !== 'string') {
    return {
      ok: false,
      diagnostics: ['The FreshRoute sample must be valid JSON.'],
    };
  }

  try {
    return normalizeFreshRouteSample(JSON.parse(sourceText));
  } catch {
    return {
      ok: false,
      diagnostics: ['The FreshRoute sample must be valid JSON.'],
    };
  }
}

/**
 * Adapts the bundled FreshRoute JSON into StockWatch's source-agnostic record
 * shape. The raw source object remains intact in sourceMetadata for traceability.
 */
export function normalizeFreshRouteSample(rawRecords) {
  if (!Array.isArray(rawRecords)) {
    return {
      ok: false,
      diagnostics: ['The FreshRoute sample is not an inventory-record list.'],
    };
  }

  const records = rawRecords.map((record) => ({
    id: record?.id,
    productName: record?.productName,
    category: record?.category,
    brand: record?.brand,
    quantityOnHand: record?.quantityOnHand,
    reorderThreshold: record?.reorderThreshold,
    salesRatePerDay: record?.salesRatePerDay,
    expirationDate: record?.expirationDate,
    storageCondition: record?.storageCondition ?? 'Not specified',
    sourceType: FRESHROUTE_SOURCE_TYPE,
    sourceMetadata: record,
  }));

  return validateNormalizedInventory(records, {
    expectedRecordCount: 8,
    sourceType: 'FreshRoute sample',
  });
}

export function validateKaggleHeaders(headerCells) {
  if (!Array.isArray(headerCells)) {
    return { ok: false, diagnostics: ['The Kaggle source does not contain a header row.'] };
  }

  const trimmedHeaders = headerCells.map((header) => String(header ?? '').trim());
  const diagnostics = [];
  const allKnownHeaders = [...KAGGLE_REQUIRED_COLUMNS, ...KAGGLE_OPTIONAL_COLUMNS];

  for (const header of KAGGLE_REQUIRED_COLUMNS) {
    const count = trimmedHeaders.filter((value) => value === header).length;
    if (count === 0) diagnostics.push(`Missing required Kaggle header: ${header}.`);
    if (count > 1) diagnostics.push(`Duplicate required Kaggle header: ${header}.`);
  }
  for (const header of KAGGLE_OPTIONAL_COLUMNS) {
    if (trimmedHeaders.filter((value) => value === header).length > 1) {
      diagnostics.push(`Duplicate optional Kaggle header: ${header}.`);
    }
  }

  if (diagnostics.length) return { ok: false, diagnostics };

  const headerIndexes = new Map();
  trimmedHeaders.forEach((header, index) => {
    if (!headerIndexes.has(header) || !allKnownHeaders.includes(header)) {
      headerIndexes.set(header, index);
    }
  });
  return { ok: true, headerIndexes };
}

export function normalizeKaggleRow(row, headerIndexes) {
  if (!row || !Array.isArray(row.cells) || !(headerIndexes instanceof Map)) {
    return { ok: false, diagnostics: ['The Kaggle row is malformed.'] };
  }

  const valueFor = (header) => row.cells[headerIndexes.get(header)];
  const requiredTextHeaders = ['Location', 'Date', 'Product ID', 'Product Name', 'Brand', 'Production Date', 'Expiration Date'];
  const diagnostics = [];

  for (const header of requiredTextHeaders) {
    if (!String(valueFor(header) ?? '').trim()) {
      diagnostics.push(`${header} is required.`);
    }
  }
  for (const header of ['Date', 'Production Date', 'Expiration Date']) {
    if (!isValidCalendarDate(String(valueFor(header) ?? '').trim())) {
      diagnostics.push(`${header} must be a real YYYY-MM-DD date.`);
    }
  }

  const shelfLife = parsePositiveWholeNumber(valueFor('Shelf Life (days)'));
  if (shelfLife === null) diagnostics.push('Shelf Life (days) must be a positive whole number.');

  const quantityOnHand = parseFiniteNonNegativeNumber(valueFor('Quantity in Stock (liters/kg)'));
  const reorderThreshold = parseFiniteNonNegativeNumber(valueFor('Minimum Stock Threshold (liters/kg)'));
  const quantitySold = parseFiniteNonNegativeNumber(valueFor('Quantity Sold (liters/kg)'));
  if (quantityOnHand === null) diagnostics.push('Quantity in Stock (liters/kg) must be a finite non-negative number.');
  if (reorderThreshold === null) diagnostics.push('Minimum Stock Threshold (liters/kg) must be a finite non-negative number.');
  if (quantitySold === null) diagnostics.push('Quantity Sold (liters/kg) must be a finite non-negative number.');

  if (diagnostics.length) return { ok: false, diagnostics };

  const rawStorageCondition = valueFor('Storage Condition');
  return {
    ok: true,
    record: {
      id: `KAGGLE-ROW-${String(row.line).padStart(4, '0')}`,
      productName: String(valueFor('Product Name')).trim(),
      category: 'Dairy',
      brand: String(valueFor('Brand')).trim(),
      quantityOnHand,
      reorderThreshold,
      salesRatePerDay: quantitySold / shelfLife,
      expirationDate: addCalendarDays(KAGGLE_DEMO_DATE, shelfLife),
      storageCondition: String(rawStorageCondition ?? '').trim() || 'Not specified',
      sourceType: KAGGLE_SOURCE_TYPE,
      sourceRowNumber: row.line,
      sourceMetadata: toSourceMetadata(row.cells, headerIndexes),
    },
  };
}

export function selectKaggleSnapshot(evaluatedCandidates) {
  const selected = [];
  const productNames = new Map();
  const brands = new Map();
  const locations = new Map();

  for (const [status, target] of KAGGLE_STATUS_TARGETS) {
    const candidates = evaluatedCandidates.filter((record) => record.primaryStatus === status);
    if (candidates.length < target) {
      return { ok: false, diagnostics: [`The Kaggle source cannot provide ${target} ${status} records.`] };
    }

    const available = [...candidates];
    for (let count = 0; count < target; count += 1) {
      available.sort((first, second) => {
        const score = (record) => (productNames.get(record.productName) ?? 0)
          + (brands.get(record.brand) ?? 0)
          + (locations.get(locationFor(record)) ?? 0);
        return score(first) - score(second)
          || sourceRowNumber(first) - sourceRowNumber(second);
      });
      const record = available.shift();
      selected.push(record);
      productNames.set(record.productName, (productNames.get(record.productName) ?? 0) + 1);
      brands.set(record.brand, (brands.get(record.brand) ?? 0) + 1);
      const location = locationFor(record);
      locations.set(location, (locations.get(location) ?? 0) + 1);
    }
  }

  return { ok: true, records: selected };
}

export function buildKaggleTrainingSnapshot(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, diagnostics: ['The Kaggle source does not contain a header row.'] };
  }

  const headerResult = validateKaggleHeaders(rows[0].cells);
  if (!headerResult.ok) return headerResult;

  const eligibleRecords = [];
  const exclusionDiagnostics = [];
  for (const row of rows.slice(1)) {
    const result = normalizeKaggleRow(row, headerResult.headerIndexes);
    if (result.ok) eligibleRecords.push(result.record);
    else exclusionDiagnostics.push({ line: row.line, diagnostics: result.diagnostics });
  }

  const internalValidation = validateNormalizedInventory(eligibleRecords, {
    sourceType: 'Kaggle historical training snapshot',
  });
  if (!internalValidation.ok) return internalValidation;

  const selection = selectKaggleSnapshot(eligibleRecords.map(evaluateProduct));
  if (!selection.ok) {
    return { ...selection, excludedRowCount: exclusionDiagnostics.length, exclusionDiagnostics };
  }

  return {
    ok: true,
    records: selection.records.map(withoutEvaluationFields),
    excludedRowCount: exclusionDiagnostics.length,
    exclusionDiagnostics,
  };
}

export function parseKaggleTrainingSnapshot(sourceText) {
  const parsed = parseCsv(sourceText);
  if (!parsed.ok) {
    return {
      ok: false,
      diagnostics: [`Could not parse Kaggle CSV at line ${parsed.error.line}.`],
    };
  }
  return buildKaggleTrainingSnapshot(parsed.rows);
}
