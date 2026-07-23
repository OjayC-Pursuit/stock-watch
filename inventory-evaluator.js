export const DEMO_DATE = '2026-07-22';
export const STATUS_ORDER = ['Urgent', 'Low Stock', 'Expiring Soon', 'Safe'];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toUtcDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatDaysUntilExpiration(days) {
  if (days < 0) {
    const elapsedDays = Math.abs(days);
    return `expired ${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  }

  if (days === 0) {
    return 'Expires today';
  }

  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function getCalendarDayDifference(
  dateString,
  referenceDate = DEMO_DATE,
) {
  return Math.round(
    (toUtcDate(dateString) - toUtcDate(referenceDate)) / DAY_IN_MS,
  );
}

export function evaluateProduct(product) {
  const daysUntilExpiration = getCalendarDayDifference(
    product.expirationDate,
    DEMO_DATE,
  );
  const validSalesRate =
    Number.isFinite(product.salesRatePerDay) && product.salesRatePerDay > 0;
  const daysUntilStockout = validSalesRate
    ? product.quantityOnHand / product.salesRatePerDay
    : null;
  const isLowStock = product.quantityOnHand <= product.reorderThreshold;
  const isExpired = daysUntilExpiration < 0;
  const isExpiringSoon =
    daysUntilExpiration >= 0 && daysUntilExpiration <= 7;
  const isStockoutUrgent =
    daysUntilStockout !== null && daysUntilStockout <= 2;
  const isLowStockAndNearExpiry =
    isLowStock && daysUntilExpiration >= 0 && daysUntilExpiration <= 3;
  const reasons = [];

  if (isLowStock) {
    reasons.push(
      `Low stock: ${product.quantityOnHand} on hand (threshold ${product.reorderThreshold})`,
    );
  }

  if (isStockoutUrgent) {
    reasons.push(`Projected stockout in ${daysUntilStockout.toFixed(1)} days`);
  }

  if (isExpired || isExpiringSoon || isLowStockAndNearExpiry) {
    reasons.push(formatDaysUntilExpiration(daysUntilExpiration));
  }

  let primaryStatus = 'Safe';
  let recommendedAction = 'No immediate action needed';

  if (isExpired) {
    primaryStatus = 'Urgent';
    recommendedAction = 'Remove from inventory today';
  } else if (isStockoutUrgent || isLowStockAndNearExpiry) {
    primaryStatus = 'Urgent';
    recommendedAction = 'Take action today';
  } else if (isLowStock) {
    primaryStatus = 'Low Stock';
    recommendedAction = 'Reorder soon';
  } else if (isExpiringSoon) {
    primaryStatus = 'Expiring Soon';
    recommendedAction = 'Use or sell soon';
  }

  return {
    ...product,
    daysUntilExpiration,
    daysUntilStockout,
    primaryStatus,
    reasons,
    recommendedAction,
  };
}

export function getStatusCounts(products) {
  return STATUS_ORDER.reduce(
    (counts, status) => ({
      ...counts,
      [status]: products.filter(
        (product) => product.primaryStatus === status,
      ).length,
    }),
    {},
  );
}

export function sortEvaluatedProducts(products) {
  const statusIndex = (status) => STATUS_ORDER.indexOf(status);
  const timingValue = (product) => {
    if (
      product.primaryStatus === 'Urgent' ||
      product.primaryStatus === 'Low Stock'
    ) {
      return product.daysUntilStockout ?? Infinity;
    }

    return product.daysUntilExpiration;
  };

  return [...products].sort(
    (first, second) =>
      statusIndex(first.primaryStatus) - statusIndex(second.primaryStatus) ||
      timingValue(first) - timingValue(second) ||
      first.productName.localeCompare(second.productName),
  );
}
