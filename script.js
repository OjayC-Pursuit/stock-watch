import { evaluateProduct, getStatusCounts, sortEvaluatedProducts } from './inventory-evaluator.js';
import { renderDashboard } from './dashboard-renderer.js';
import { parseCsv } from './csv-parser.js';
import { validateInventoryRows } from './inventory-validator.js';
import { createInventoryImportController } from './inventory-import-controller.js';

const app = document.querySelector('#app');

const controller = createInventoryImportController({
  readText: (file) => file.text(),
  parseCsv,
  validateInventoryRows,
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
  render: (state) => {
    renderDashboard(app, state);
    app.setAttribute('aria-busy', state.phase === 'checking' ? 'true' : 'false');
    if (state.phase === 'hold' && state.errors.length > 0) {
      requestAnimationFrame(() => document.querySelector('#import-error-summary')?.focus());
    }
  },
});

app.addEventListener('change', (event) => {
  const fileInput = event.target.closest('#inventory-file');
  if (fileInput?.files?.[0]) controller.importFile(fileInput.files[0]);
});

app.addEventListener('click', (event) => {
  const action = event.target.closest('[data-import-action]')?.dataset.importAction;
  if (action === 'clear') controller.reset();
});
