const REQUIRED_TEXT_FIELDS = ['id', 'productName', 'category', 'brand'];
const REQUIRED_NUMBER_FIELDS = [
  'quantityOnHand',
  'reorderThreshold',
  'salesRatePerDay',
];

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isNonNegativeFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Checks normalized, source-agnostic StockWatch records before they enter the
 * evaluator. It intentionally returns the original records, including their
 * sourceMetadata, so source evidence stays separate from evaluator inputs.
 */
export function validateNormalizedInventory(
  records,
  { expectedRecordCount, sourceType } = {},
) {
  const diagnostics = [];

  if (!Array.isArray(records)) {
    return {
      ok: false,
      diagnostics: ['The source did not provide an inventory-record list.'],
    };
  }

  if (
    Number.isInteger(expectedRecordCount) &&
    records.length !== expectedRecordCount
  ) {
    diagnostics.push(
      `${sourceType ?? 'This source'} must provide exactly ${expectedRecordCount} inventory records.`,
    );
  }

  const ids = new Set();

  records.forEach((record, index) => {
    const rowLabel = `Record ${index + 1}`;

    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      diagnostics.push(`${rowLabel} must be an inventory record.`);
      return;
    }

    for (const field of REQUIRED_TEXT_FIELDS) {
      if (typeof record[field] !== 'string' || !record[field].trim()) {
        diagnostics.push(`${rowLabel}: ${field} is required.`);
      }
    }

    for (const field of REQUIRED_NUMBER_FIELDS) {
      if (!isNonNegativeFiniteNumber(record[field])) {
        diagnostics.push(
          `${rowLabel}: ${field} must be a finite number greater than or equal to zero.`,
        );
      }
    }

    if (!isValidCalendarDate(record.expirationDate)) {
      diagnostics.push(`${rowLabel}: expirationDate must be a real YYYY-MM-DD date.`);
    }

    if (typeof record.id === 'string' && record.id.trim()) {
      if (ids.has(record.id)) {
        diagnostics.push(`${rowLabel}: Duplicate id "${record.id}".`);
      }
      ids.add(record.id);
    }
  });

  return diagnostics.length
    ? { ok: false, diagnostics }
    : { ok: true, records };
}
