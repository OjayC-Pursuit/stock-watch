import { validateNormalizedInventory } from './inventory-normalizer.js';

export const FRESHROUTE_SOURCE_TYPE = 'freshroute-sample';

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
