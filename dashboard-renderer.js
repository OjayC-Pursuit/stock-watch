const STATUS_DETAILS = {
  Urgent: {
    className: 'urgent',
    icon: '!',
    sectionDescription: 'Immediate action is needed',
  },
  'Low Stock': {
    className: 'low-stock',
    icon: '↓',
    sectionDescription: 'Inventory needs replenishment soon',
  },
  'Expiring Soon': {
    className: 'expiring-soon',
    icon: '◷',
    sectionDescription: 'Shelf life needs attention',
  },
  Safe: {
    className: 'safe',
    icon: '✓',
    sectionDescription: 'No immediate inventory issue',
  },
};

const STATUS_GROUPS = ['Urgent', 'Low Stock', 'Expiring Soon', 'Safe'];

function formatStockout(days) {
  return days === null ? 'Not projected' : `${days.toFixed(1)} days`;
}

export function formatExpiration(product) {
  if (product.daysUntilExpiration < 0) {
    const elapsedDays = Math.abs(product.daysUntilExpiration);
    return `${product.expirationDate} · expired ${elapsedDays} day${
      elapsedDays === 1 ? '' : 's'
    } ago`;
  }

  if (product.daysUntilExpiration === 0) {
    return `${product.expirationDate} · today`;
  }

  return `${product.expirationDate} · ${product.daysUntilExpiration} day${
    product.daysUntilExpiration === 1 ? '' : 's'
  }`;
}

function statusLabel(status) {
  const details = STATUS_DETAILS[status];

  return `
    <span class="status-label status-${details.className}">
      <span class="status-icon" aria-hidden="true">${details.icon}</span>
      ${status}
    </span>
  `;
}

function renderReasons(product) {
  if (product.reasons.length === 0) {
    return '<p class="reason-safe">No immediate inventory issues.</p>';
  }

  return `
    <ul class="reason-list" aria-label="Status reasons">
      ${product.reasons.map((reason) => `<li>${reason}</li>`).join('')}
    </ul>
  `;
}

function productCard(product) {
  const details = STATUS_DETAILS[product.primaryStatus];

  return `
    <article class="product-card status-${details.className}">
      <div class="card-topline">
        <div>
          <p class="product-category">${product.category} · ${product.brand}</p>
          <h4>${product.productName}</h4>
        </div>
        ${statusLabel(product.primaryStatus)}
      </div>

      <div class="reason-block">
        <p class="card-kicker">Why it is here</p>
        ${renderReasons(product)}
      </div>

      <dl class="inventory-facts">
        <div>
          <dt>On hand</dt>
          <dd>${product.quantityOnHand}</dd>
        </div>
        <div>
          <dt>Reorder threshold</dt>
          <dd>${product.reorderThreshold}</dd>
        </div>
        <div>
          <dt>Sales rate</dt>
          <dd>${product.salesRatePerDay} / day</dd>
        </div>
        <div>
          <dt>Expiration</dt>
          <dd>${formatExpiration(product)}</dd>
        </div>
        <div>
          <dt>Projected stockout</dt>
          <dd>${formatStockout(product.daysUntilStockout)}</dd>
        </div>
      </dl>

      <p class="recommended-action">
        <span>Recommended action</span>
        ${product.recommendedAction}
      </p>
    </article>
  `;
}

function summaryCard(status, count) {
  const details = STATUS_DETAILS[status];

  return `
    <article class="summary-card status-${details.className}">
      <div class="summary-card-label">
        <span class="status-icon" aria-hidden="true">${details.icon}</span>
        <span>${status}</span>
      </div>
      <strong>${count}</strong>
      <p>${details.sectionDescription}</p>
    </article>
  `;
}

function statusSection(status, products) {
  const details = STATUS_DETAILS[status];
  const groupProducts = products.filter(
    (product) => product.primaryStatus === status,
  );

  if (groupProducts.length === 0) {
    return '';
  }

  const safeClass = status === 'Safe' ? ' safe-inventory' : '';

  return `
    <section
      class="status-group status-${details.className}${safeClass}"
      aria-labelledby="${details.className}-heading"
    >
      <div class="group-heading">
        <div>
          <p class="eyebrow">${status === 'Safe' ? 'Reviewed and stable' : 'Action queue'}</p>
          <h3 id="${details.className}-heading">${status}</h3>
        </div>
        <p>${details.sectionDescription}</p>
      </div>
      <div class="product-stack">
        ${groupProducts.map(productCard).join('')}
      </div>
    </section>
  `;
}

export function renderLoading(container) {
  container.innerHTML = `
    <section class="workspace-skeleton" aria-label="Loading inventory briefing">
      <div class="skeleton-heading">
        <span class="skeleton-line skeleton-line-short"></span>
        <span class="skeleton-line skeleton-line-heading"></span>
      </div>
      <div class="skeleton-summary">
        ${Array.from({ length: 4 }, () => '<span class="skeleton summary-placeholder"></span>').join('')}
      </div>
      <div class="skeleton-stack">
        ${Array.from({ length: 3 }, () => '<span class="skeleton card-placeholder"></span>').join('')}
      </div>
    </section>
  `;
}

export function renderError(container) {
  container.innerHTML = `
    <section class="workspace-error" role="alert">
      <span class="error-mark" aria-hidden="true">!</span>
      <div>
        <p class="eyebrow">Inventory review unavailable</p>
        <h2>Today’s inventory could not load.</h2>
        <p>Refresh the page and try again before reviewing today’s priorities.</p>
      </div>
    </section>
  `;
}

export function renderDashboard(container, products, counts) {
  container.innerHTML = `
    <section class="inventory-health" aria-labelledby="health-heading">
      <div class="section-intro">
        <div>
          <p class="eyebrow">Inventory health</p>
          <h2 id="health-heading">Today’s condition</h2>
        </div>
        <p>All ${products.length} products have been evaluated.</p>
      </div>
      <div class="summary-grid">
        ${STATUS_GROUPS.map((status) => summaryCard(status, counts[status])).join('')}
      </div>
    </section>

    <section class="attention-queue" aria-labelledby="attention-heading">
      <div class="section-intro queue-intro">
        <div>
          <p class="eyebrow">Needs attention today</p>
          <h2 id="attention-heading">Work through the priorities</h2>
        </div>
        <p>Start with the most time-sensitive item in each group.</p>
      </div>
      ${STATUS_GROUPS.map((status) => statusSection(status, products)).join('')}
    </section>
  `;
}
