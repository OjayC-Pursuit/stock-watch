export const REQUIRED_COLUMNS = [
  'productName',
  'category',
  'brand',
  'quantityOnHand',
  'reorderThreshold',
  'salesRatePerDay',
  'expirationDate',
];

export const OPTIONAL_COLUMNS = ['id', 'storageCondition'];

const MAX_ROWS = 250;
const MAX_ERRORS = 5;

function makeError(row, column, explanation) {
  return { row, column, explanation };
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function readNumber(value) {
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function capErrors(errors) {
  return {
    errors: errors.slice(0, MAX_ERRORS),
    additionalErrorCount: Math.max(0, errors.length - MAX_ERRORS),
  };
}

export function validateInventoryRows(rows, { idPrefix = 'import' } = {}) {
  if (rows.length === 0) {
    return { ok: false, message: 'The file does not contain a CSV header row.', errors: [] };
  }

  const headerRow = rows[0];
  const headers = headerRow.cells.map((cell) => cell.trim());
  const headerIndexes = new Map();
  headers.forEach((header, index) => {
    if (!headerIndexes.has(header)) headerIndexes.set(header, []);
    headerIndexes.get(header).push(index);
  });

  const headerErrors = [];
  for (const column of REQUIRED_COLUMNS) {
    const indexes = headerIndexes.get(column) ?? [];
    if (indexes.length !== 1) {
      headerErrors.push(makeError(headerRow.line, column, 'Header must appear exactly once.'));
    }
  }
  for (const column of OPTIONAL_COLUMNS) {
    if ((headerIndexes.get(column) ?? []).length > 1) {
      headerErrors.push(makeError(headerRow.line, column, 'Header must appear at most once.'));
    }
  }
  if (headerErrors.length > 0) {
    return { ok: false, message: null, ...capErrors(headerErrors) };
  }

  const productRows = rows.slice(1);
  if (productRows.length === 0) {
    return { ok: false, message: 'The file has no product rows to import.', errors: [] };
  }
  if (productRows.length > MAX_ROWS) {
    return { ok: false, message: 'The file exceeds the 250-product import limit.', errors: [] };
  }

  const indexFor = (column) => headerIndexes.get(column)?.[0];
  const suppliedIds = new Set();
  const errors = [];
  const products = [];
  let generatedIds = 0;

  for (const row of productRows) {
    const valueFor = (column) => (row.cells[indexFor(column)] ?? '').trim();
    const values = Object.fromEntries([
      ...REQUIRED_COLUMNS,
      ...OPTIONAL_COLUMNS.filter((column) => indexFor(column) !== undefined),
    ].map((column) => [column, valueFor(column)]));

    for (const column of ['productName', 'category', 'brand']) {
      if (values[column] === '') {
        errors.push(makeError(row.line, column, 'A required value cannot be blank.'));
      }
    }
    for (const column of ['quantityOnHand', 'reorderThreshold', 'salesRatePerDay']) {
      if (readNumber(values[column]) === null) {
        errors.push(makeError(row.line, column, 'Value must be a finite number greater than or equal to zero.'));
      }
    }
    if (!isRealDate(values.expirationDate)) {
      errors.push(makeError(row.line, 'expirationDate', 'Use a real date in YYYY-MM-DD format.'));
    }
    if (values.id !== '') {
      if (suppliedIds.has(values.id)) {
        errors.push(makeError(row.line, 'id', 'Supplied IDs must be unique.'));
      }
      suppliedIds.add(values.id);
    }

    const id = values.id || `${idPrefix}-${++generatedIds}`;
    products.push({
      productName: values.productName,
      category: values.category,
      brand: values.brand,
      quantityOnHand: readNumber(values.quantityOnHand),
      reorderThreshold: readNumber(values.reorderThreshold),
      salesRatePerDay: readNumber(values.salesRatePerDay),
      expirationDate: values.expirationDate,
      id,
      storageCondition: values.storageCondition || 'Not specified',
    });
  }

  if (errors.length > 0) {
    return { ok: false, message: null, ...capErrors(errors) };
  }
  return { ok: true, products };
}
