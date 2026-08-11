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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function isHistoricalRecord(product) {
  return product.sourceType === 'kaggle-historical-training';
}

function historicalContext(product) {
  if (!isHistoricalRecord(product)) return '';
  return `<p class="historical-context">Historical snapshot &middot; ${escapeHtml(product.sourceMetadata?.Location ?? 'Not specified')} &middot; Source date ${escapeHtml(product.sourceMetadata?.Date ?? 'Not specified')}</p>`;
}

function stockValue(value, product) {
  return isHistoricalRecord(product) ? `${value} liters/kg` : value;
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
        <p class="case-id">${escapeHtml(product.id)} · ${escapeHtml(product.storageCondition)}</p>
        ${timing}
      </div>

      <h3>${escapeHtml(product.productName)}</h3>
      <p class="product-category">${escapeHtml(product.category)} · ${escapeHtml(product.brand)}</p>

      ${historicalContext(product)}
      <dl class="inventory-facts">
        <div class="critical-fact">
          <dt>On hand</dt>
          <dd>${stockValue(product.quantityOnHand, product)}</dd>
        </div>
        <div>
          <dt>Reorder threshold</dt>
          <dd>${stockValue(product.reorderThreshold, product)}</dd>
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

function historicalHeadline(counts) {
  const attention = counts.Urgent + counts['Low Stock'] + counts['Expiring Soon'];
  return `${attention} product${attention === 1 ? '' : 's'} need attention in this snapshot.`;
}

function renderEvaluatedDashboard(
  container,
  products,
  counts,
  headline = urgentHeadline(counts.Urgent),
  sourceType = null,
) {
  const urgentProducts = products.filter(
    (product) => product.primaryStatus === 'Urgent',
  );

  container.innerHTML = `
    <section class="priority-rail" aria-label="Inventory signal summary">
      ${STATUS_GROUPS.map((status) => summaryRailItem(status, counts[status])).join('')}
    </section>

    <section class="board-hero${sourceType === 'kaggle-historical-training' ? ' is-historical' : ''}" aria-labelledby="priority-headline">
      <div class="hero-message">
        <p class="eyebrow">${sourceType === 'kaggle-historical-training' ? 'Historical inventory signal' : 'Morning inventory signal'}</p>
        <h1 id="priority-headline">${headline}</h1>
        ${sourceType === 'kaggle-historical-training'
          ? '<p class="hero-brief"><strong>Historical training data.</strong> Review the prioritized records in this curated snapshot.</p>'
          : heroLead(urgentProducts[0])}
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

export function createEmptyCounts() {
  return { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 0 };
}

export function getImportedHeadline(counts) {
  if (counts.Urgent > 0) {
    return `${counts.Urgent} case${counts.Urgent === 1 ? ' is' : 's are'} at the red line.`;
  }
  const attentionCount = counts['Low Stock'] + counts['Expiring Soon'];
  if (attentionCount > 0) {
    return `${attentionCount} product${attentionCount === 1 ? ' needs' : 's need'} attention today.`;
  }
  return 'Inventory is clear for today.';
}

function renderImportStatus(viewModel) {
  return `<p class="import-status" aria-live="polite" aria-atomic="true">${escapeHtml(viewModel.statusMessage || '')}</p>`;
}

function renderManifestDock(viewModel) {
  const hasActiveInventory = viewModel.activeFileName !== null;
  const checking = viewModel.phase === 'checking';
  const holding = viewModel.phase === 'hold';
  const active = viewModel.phase === 'active';
  const seal = holding ? 'HOLD' : checking ? 'CHECKING' : active ? 'ACTIVE' : 'EMPTY';
  const actions = hasActiveInventory
    ? `<div class="manifest-actions"><label class="action-button secondary" for="inventory-file"${checking ? ' aria-disabled="true"' : ''}>Replace CSV</label><button type="button" class="action-button tertiary" data-import-action="clear"${checking ? ' disabled' : ''}>Clear inventory</button></div>`
    : `<div class="manifest-actions"><label class="action-button primary" for="inventory-file">Choose CSV file</label></div>`;
  const fileInput = `<input id="inventory-file" class="visually-hidden" type="file" accept=".csv,text/csv"${checking ? ' disabled' : ''}>`;
  const activeIdentity = hasActiveInventory
    ? `<div class="active-file"><span class="file-label">ACTIVE FILE</span><div class="filename-line"><span class="filename">${escapeHtml(viewModel.activeFileName)}</span><span class="product-count">${viewModel.evaluatedProducts.length} products</span></div></div>`
    : `<div><h1 class="manifest-title" id="manifest-title">Import a CSV inventory file to begin.</h1><p class="manifest-copy">Choose the inventory export you want StockWatch to evaluate.</p></div>`;
  const errors = holding && viewModel.errors.length > 0
    ? `<section class="hold-panel" aria-labelledby="import-error-summary" tabindex="-1"><div class="hold-heading"><span class="state-seal is-hold" aria-hidden="true">! HOLD</span><div><span class="file-label">ATTEMPTED FILE</span><span class="filename">${escapeHtml(viewModel.attemptedFileName || '')}</span></div></div><h2 id="import-error-summary">Review the flagged rows.</h2><ul class="error-list">${viewModel.errors.map((error) => `<li><span class="error-meta">Row ${escapeHtml(error.row)} · ${escapeHtml(error.column)}</span><p class="error-message">${escapeHtml(error.explanation)}</p></li>`).join('')}</ul>${viewModel.additionalErrorCount ? `<p class="additional-errors">+ ${viewModel.additionalErrorCount} additional issues</p>` : ''}</section>`
    : '';
  const dockLabel = hasActiveInventory ? 'aria-label="Receiving manifest"' : 'aria-labelledby="manifest-title"';
  return `<section class="manifest-dock${hasActiveInventory ? ' is-compact' : ''}${checking ? ' is-checking' : ''}" ${dockLabel}><div class="manifest-header"><p class="manifest-kicker">RECEIVING MANIFEST · CSV</p><span class="state-seal ${active ? 'is-active' : ''}${holding ? ' is-hold' : ''}"><span aria-hidden="true">${active ? '✓' : holding ? '!' : checking ? '⋯' : '○'}</span>${seal}</span></div><div class="${hasActiveInventory ? 'active-layout' : 'manifest-empty-layout'}">${activeIdentity}<div>${actions}${hasActiveInventory ? '' : '<p class="manifest-helper">CSV only · Up to 1 MB · Maximum 250 products</p>'}</div></div>${renderImportStatus(viewModel)}${fileInput}${errors}</section>`;
}

function getActiveSource(viewModel) {
  if (viewModel.activeSource) return viewModel.activeSource;
  if (viewModel.activeFileName) {
    return { type: 'uploaded-csv', title: viewModel.activeFileName };
  }
  return null;
}

function sourceCountLabel(source, count) {
  if (source.type === 'uploaded-csv') {
    return `${count} product${count === 1 ? '' : 's'}`;
  }
  return `${count} inventory record${count === 1 ? '' : 's'}`;
}

function sourcePicker(checking) {
  const unavailable = checking ? ' disabled' : '';
  const labelUnavailable = checking ? ' aria-disabled="true"' : '';
  return `
    <fieldset class="source-picker" aria-label="Choose inventory source"${checking ? ' aria-busy="true"' : ''}>
      <legend>Choose inventory source</legend>
      <div class="source-lane">
        <p class="source-code">FR SAMPLE</p>
        <h2>FreshRoute sample</h2>
        <p>Bundled demonstration &middot; 8 inventory records</p>
        <button type="button" class="action-button secondary" data-import-action="freshroute"${unavailable}>Load FreshRoute sample</button>
      </div>
      <div class="source-lane">
        <p class="source-code">CSV</p>
        <h2>Upload CSV</h2>
        <p>Your inventory export &middot; CSV only &middot; Up to 250 products</p>
        <label class="action-button primary" for="inventory-file"${labelUnavailable}>Upload CSV</label>
      </div>
      <div class="source-lane source-lane-historical">
        <p class="source-code">HISTORICAL</p>
        <h2>Kaggle training snapshot</h2>
        <p>Curated training set &middot; 80 of 4,325 historical rows</p>
        <button type="button" class="action-button secondary" data-import-action="kaggle"${unavailable}>Load Kaggle historical training snapshot</button>
      </div>
    </fieldset>
  `;
}

function holdPanel(viewModel) {
  if (viewModel.phase !== 'hold') return '';

  const attempted = viewModel.attemptedSource?.title || viewModel.attemptedFileName || 'Inventory source';
  const bundledFailure = Boolean(viewModel.retrySourceType);
  const csvErrors = viewModel.errors?.length > 0;
  const retry = bundledFailure
    ? `<button type="button" class="action-button retry-action" data-import-action="retry" aria-label="Retry ${escapeHtml(attempted)}">Retry</button>`
    : '';
  const csvRecovery = !bundledFailure
    ? `<div class="hold-recovery"><label class="action-button primary" for="inventory-file">Upload CSV</label><p class="manifest-helper">Choose a corrected file and upload it again.</p></div>`
    : '';
  const errorDetails = csvErrors
    ? `<ul class="error-list">${viewModel.errors.map((error) => `<li><span class="error-meta">Row ${escapeHtml(error.row)} &middot; ${escapeHtml(error.column)}</span><p class="error-message">${escapeHtml(error.explanation)}</p></li>`).join('')}</ul>${viewModel.additionalErrorCount ? `<p class="additional-errors">+ ${viewModel.additionalErrorCount} additional issues</p>` : ''}`
    : '';
  return `
    <section class="hold-panel" aria-labelledby="import-error-summary">
      <div class="hold-heading">
        <span class="state-seal is-hold" aria-hidden="true">! HOLD</span>
        <div><span class="file-label">ATTEMPTED SOURCE</span><span class="filename">${escapeHtml(attempted)}</span></div>
      </div>
      <h2 id="import-error-summary" tabindex="-1">Source load needs attention.</h2>
      <p class="error-message">${escapeHtml(viewModel.statusMessage || '')}</p>
      ${errorDetails}
      <div class="hold-actions">${retry}${csvRecovery}</div>
    </section>
  `;
}

function renderMultiSourceManifestDock(viewModel) {
  const source = getActiveSource(viewModel);
  const checking = viewModel.phase === 'checking';
  const holding = viewModel.phase === 'hold';
  const active = viewModel.phase === 'active';
  const seal = holding ? 'HOLD' : checking ? 'CHECKING' : active ? 'ACTIVE' : 'EMPTY';
  const sourceTitle = source?.title ?? '';
  const sourceCount = viewModel.evaluatedProducts?.length ?? 0;
  const identity = source
    ? `<div class="active-source${source.type === 'kaggle-historical-training' ? ' is-historical' : ''}">
        <span class="file-label">ACTIVE SOURCE</span>
        <div class="filename-line"><span class="filename">${escapeHtml(sourceTitle)}</span><span class="product-count">${sourceCountLabel(source, sourceCount)}</span></div>
        ${source.type === 'kaggle-historical-training' ? '<p class="historical-source-label">Historical training snapshot &mdash; not current inventory</p>' : ''}
        ${checking && viewModel.attemptedSource ? `<p class="loading-source"><span>LOADING SOURCE</span>${escapeHtml(viewModel.attemptedSource.title)}</p>` : ''}
      </div>`
    : `<div><h1 class="manifest-title" id="manifest-title">Choose an inventory source to begin.</h1><p class="manifest-copy">Load a FreshRoute sample, upload your inventory CSV, or review the historical training snapshot.</p></div>`;
  const dockLabel = source ? 'aria-label="Receiving manifest"' : 'aria-labelledby="manifest-title"';
  const input = `<input id="inventory-file" class="visually-hidden" type="file" accept=".csv,text/csv"${checking ? ' disabled' : ''}>`;
  const clear = source ? `<button type="button" class="action-button tertiary clear-action" data-import-action="clear"${checking ? ' disabled' : ''}>Clear inventory</button>` : '';

  return `
    <section class="manifest-dock manifest-switchboard${source ? ' is-compact' : ''}${checking ? ' is-checking' : ''}" ${dockLabel}>
      <div class="manifest-header">
        <p class="manifest-kicker">RECEIVING MANIFEST &middot; INVENTORY SOURCES</p>
        <span class="state-seal ${active ? 'is-active' : ''}${holding ? ' is-hold' : ''}"><span aria-hidden="true">${active ? '✓' : holding ? '!' : checking ? '⋯' : '○'}</span>${seal}</span>
      </div>
      <div class="${source ? 'active-layout' : 'manifest-empty-layout'}">${identity}</div>
      <div class="source-actions-rail">${sourcePicker(checking)}${clear}</div>
      <div class="source-status" aria-live="polite" aria-atomic="true">${escapeHtml(viewModel.statusMessage || '')}${viewModel.exclusionNote ? `<p class="exclusion-note">${escapeHtml(viewModel.exclusionNote)}</p>` : ''}</div>
      ${input}
      ${holdPanel(viewModel)}
    </section>
  `;
}

export function renderDashboard(container, productsOrViewModel, counts) {
  if (Array.isArray(productsOrViewModel)) {
    renderEvaluatedDashboard(container, productsOrViewModel, counts);
    return;
  }
  const viewModel = productsOrViewModel;
  const dock = renderMultiSourceManifestDock(viewModel);
  if (viewModel.evaluatedProducts.length === 0) {
    container.innerHTML = `${dock}<section class="priority-rail" aria-label="Inventory signal summary">${STATUS_GROUPS.map((status) => summaryRailItem(status, viewModel.counts[status])).join('')}</section>`;
    return;
  }
  const resultsContainer = { innerHTML: '' };
  const source = getActiveSource(viewModel);
  const sourceType = source?.type ?? null;
  const headline = sourceType === 'kaggle-historical-training'
    ? historicalHeadline(viewModel.counts)
    : getImportedHeadline(viewModel.counts);
  renderEvaluatedDashboard(
    resultsContainer,
    viewModel.evaluatedProducts,
    viewModel.counts,
    headline,
    sourceType,
  );
  container.innerHTML = `${dock}${resultsContainer.innerHTML}`;
}
