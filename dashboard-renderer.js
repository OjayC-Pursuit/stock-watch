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
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five'];

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

function urgencyTiming(product) {
  if (product.daysUntilStockout !== null && product.daysUntilStockout <= 2) {
    return `${product.daysUntilStockout.toFixed(1)} d stockout`;
  }

  if (product.daysUntilExpiration < 0) {
    return `${Math.abs(product.daysUntilExpiration)} d expired`;
  }

  return `${product.daysUntilExpiration} d expiry`;
}

function productCard(product) {
  const details = STATUS_DETAILS[product.primaryStatus];
  const timing =
    product.primaryStatus === 'Urgent'
      ? `<span class="pressure-tag">! ${urgencyTiming(product)}</span>`
      : statusLabel(product.primaryStatus);

  return `
    <article class="product-card status-${details.className}">
      <div class="case-topline">
        <p class="case-id">${product.id} · ${product.storageCondition}</p>
        ${timing}
      </div>

      <h3>${product.productName}</h3>
      <p class="product-category">${product.category} · ${product.brand}</p>

      <dl class="inventory-facts">
        <div class="critical-fact">
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

      <div class="reason-block">
        <p class="card-kicker">Why it is here</p>
        ${renderReasons(product)}
      </div>

      <p class="recommended-action">
        <span>Recommended action</span>
        <strong>${product.recommendedAction} →</strong>
      </p>
    </article>
  `;
}

function summaryRailItem(status, count) {
  const details = STATUS_DETAILS[status];

  return `
    <article class="rail-item status-${details.className}">
      <span class="rail-signal" aria-hidden="true"></span>
      <strong>${count}</strong>
      <span class="rail-status">
        <span class="status-icon" aria-hidden="true">${details.icon}</span>
        ${status}
      </span>
      <small>${details.sectionDescription}</small>
    </article>
  `;
}

function freshRouteHeroBrand() {
  return `
    <div class="freshroute-hero-brand">
      <svg
        class="freshroute-hero-mark"
        viewBox="0 0 108 108"
        aria-hidden="true"
        focusable="false"
      >
        <path
          class="hero-route"
          d="M13 73c18 0 20-39 42-39h33"
        ></path>
        <path class="hero-arrow" d="m75 19 18 15-18 15"></path>
        <path
          class="hero-leaf"
          d="M20 62C7 43 19 27 44 27c0 23-11 36-24 35Z"
        ></path>
      </svg>
      <span>FreshRoute</span>
    </div>
  `;
}

function heroLead(product) {
  if (!product) {
    return `
      <p class="hero-brief">
        <strong>No urgent case leads today.</strong>
        Continue through the remaining inventory signals.
      </p>
    `;
  }

  const timing =
    product.daysUntilStockout !== null
      ? `At ${product.daysUntilStockout.toFixed(1)} days to projected stockout`
      : `With ${product.daysUntilExpiration} days until expiration`;

  return `
    <p class="hero-brief">
      <strong>Start with ${product.productName}.</strong>
      ${timing}, it leads today’s action sequence.
    </p>
  `;
}

function urgentHeadline(count) {
  const countLabel = NUMBER_WORDS[count] ?? String(count);
  const noun = count === 1 ? 'case is' : 'cases are';
  return `${countLabel} ${noun} at the red line.`;
}

function urgentSection(products) {
  return `
    <section class="urgent-board" aria-labelledby="urgent-heading">
      <header class="urgent-header">
        <span class="signal-code">P1</span>
        <h2 id="urgent-heading">Urgent action queue · ${products.length} cases</h2>
        <p>Immediate action is needed</p>
      </header>
      <div class="urgent-grid">
        ${products.map(productCard).join('')}
      </div>
    </section>
  `;
}

function statusLane(status, products, count) {
  const details = STATUS_DETAILS[status];
  const groupProducts = products.filter(
    (product) => product.primaryStatus === status,
  );

  if (groupProducts.length === 0) {
    return '';
  }

  return `
    <section
      class="status-lane status-${details.className}"
      aria-labelledby="${details.className}-heading"
    >
      <header class="lane-header">
        <div>
          <p class="eyebrow">${status === 'Safe' ? 'Stable inventory' : 'Next signal'}</p>
          <h2 id="${details.className}-heading">${status}</h2>
        </div>
        <strong>${count}</strong>
      </header>
      <p class="lane-description">${details.sectionDescription}</p>
      <div class="lane-products">
        ${groupProducts.map(productCard).join('')}
      </div>
    </section>
  `;
}

export function renderLoading(container) {
  container.innerHTML = `
    <section class="workspace-skeleton" aria-label="Loading inventory briefing">
      <div class="skeleton-rail">
        ${Array.from({ length: 4 }, () => '<span class="skeleton rail-placeholder"></span>').join('')}
      </div>
      <div class="skeleton hero-placeholder"></div>
      <div class="skeleton board-heading-placeholder"></div>
      <div class="skeleton-card-grid">
        ${Array.from({ length: 4 }, () => '<span class="skeleton card-placeholder"></span>').join('')}
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
        <h1>Today’s inventory could not load.</h1>
        <p>Refresh the page and try again before reviewing today’s priorities.</p>
      </div>
    </section>
  `;
}

export function renderDashboard(container, products, counts) {
  const urgentProducts = products.filter(
    (product) => product.primaryStatus === 'Urgent',
  );

  container.innerHTML = `
    <section class="priority-rail" aria-label="Inventory signal summary">
      ${STATUS_GROUPS.map((status) => summaryRailItem(status, counts[status])).join('')}
    </section>

    <section class="board-hero" aria-labelledby="priority-headline">
      <div class="hero-message">
        <p class="eyebrow">Morning inventory signal</p>
        <h1 id="priority-headline">${urgentHeadline(counts.Urgent)}</h1>
        ${heroLead(urgentProducts[0])}
      </div>
      ${freshRouteHeroBrand()}
    </section>

    ${urgentSection(urgentProducts)}

    <div class="secondary-board">
      ${STATUS_GROUPS.slice(1)
        .map((status) => statusLane(status, products, counts[status]))
        .join('')}
    </div>
  `;
}
