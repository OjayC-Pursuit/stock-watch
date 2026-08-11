import { evaluateProduct, getStatusCounts, sortEvaluatedProducts } from './inventory-evaluator.js';
import { renderDashboard } from './dashboard-renderer.js';
import { parseCsv } from './csv-parser.js';
import { validateInventoryRows } from './inventory-validator.js';
import { createInventoryImportController } from './inventory-import-controller.js';
import {
  parseFreshRouteSample,
  parseKaggleTrainingSnapshot,
} from './inventory-source-loaders.js';

const app = document.querySelector('#app');

async function readBundledText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not read ${path}.`);
  return response.text();
}

const controller = createInventoryImportController({
  readText: (file) => file.text(),
  parseCsv,
  validateInventoryRows,
  loadFreshRouteRecords: async () => parseFreshRouteSample(
    await readBundledText('./data/sample-inventory.json'),
  ),
  loadKaggleRecords: async () => parseKaggleTrainingSnapshot(
    await readBundledText('./data/demo-csv/dairy_dataset.csv'),
  ),
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
  render: (state) => {
    renderDashboard(app, state);
    app.setAttribute('aria-busy', 'false');
    if (state.phase === 'hold') {
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
  if (action === 'freshroute') controller.loadFreshRouteSample();
  if (action === 'kaggle') controller.loadKaggleSnapshot();
  if (action === 'retry') controller.retry();
  if (action === 'clear') controller.reset();
});
