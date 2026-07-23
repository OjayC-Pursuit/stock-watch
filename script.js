import {
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
} from './inventory-evaluator.js';
import {
  renderDashboard,
  renderError,
  renderLoading,
} from './dashboard-renderer.js';

const app = document.querySelector('#app');

async function loadDashboard() {
  renderLoading(app);

  try {
    const response = await fetch('./data/sample-inventory.json');

    if (!response.ok) {
      throw new Error('Inventory data could not be loaded.');
    }

    const products = await response.json();

    if (!Array.isArray(products)) {
      throw new Error('Inventory data is not a product list.');
    }

    const evaluatedProducts = sortEvaluatedProducts(
      products.map(evaluateProduct),
    );
    const counts = getStatusCounts(evaluatedProducts);

    renderDashboard(app, evaluatedProducts, counts);
  } catch (error) {
    renderError(app);
  } finally {
    app.setAttribute('aria-busy', 'false');
  }
}

loadDashboard();
