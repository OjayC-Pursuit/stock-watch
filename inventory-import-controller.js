const EMPTY_COUNTS = {
  Urgent: 0,
  'Low Stock': 0,
  'Expiring Soon': 0,
  Safe: 0,
};

export function getFileSelectionError(file) {
  if (!file || !file.name?.toLowerCase().endsWith('.csv')) {
    return 'Choose a .csv inventory file.';
  }
  if (file.size > 1_048_576) {
    return 'The file exceeds the 1 MB import limit.';
  }
  return null;
}

function emptyState(statusMessage = '') {
  return {
    phase: 'empty',
    activeSourceType: null,
    retrySourceType: null,
    activeFileName: null,
    attemptedFileName: null,
    statusMessage,
    errors: [],
    additionalErrorCount: 0,
    evaluatedProducts: [],
    counts: { ...EMPTY_COUNTS },
  };
}

export function createInventoryImportController({
  readText,
  parseCsv,
  validateInventoryRows,
  loadFreshRouteRecords,
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
  render,
}) {
  let state = emptyState();
  const publish = () => render(state);
  const setFailure = (fileName, message, errors = [], additionalErrorCount = 0, retrySourceType = null) => {
    state = {
      ...state,
      phase: 'hold',
      attemptedFileName: fileName,
      retrySourceType,
      statusMessage: message,
      errors,
      additionalErrorCount,
    };
    publish();
  };

  const importFile = async (file) => {
    const selectionError = getFileSelectionError(file);
    if (selectionError) {
      setFailure(file?.name ?? '', selectionError);
      return;
    }

    state = { ...state, phase: 'checking', attemptedFileName: file.name, statusMessage: `Checking ${file.name}…`, errors: [], additionalErrorCount: 0 };
    publish();

    try {
      const parsed = parseCsv(await readText(file));
      if (!parsed.ok) {
        setFailure(file.name, `Could not import ${file.name}. Fix the listed issues and try again.`, [{
          row: parsed.error.line,
          column: parsed.error.column,
          explanation: parsed.error.message,
        }]);
        return;
      }
      const validated = validateInventoryRows(parsed.rows);
      if (!validated.ok) {
        setFailure(file.name, validated.message ?? `Could not import ${file.name}. Fix the listed issues and try again.`, validated.errors, validated.additionalErrorCount ?? 0);
        return;
      }
      const evaluatedProducts = sortEvaluatedProducts(validated.products.map(evaluateProduct));
      const counts = getStatusCounts(evaluatedProducts);
      const count = evaluatedProducts.length;
      state = {
        phase: 'active',
        activeSourceType: 'uploaded-csv',
        retrySourceType: null,
        activeFileName: file.name,
        attemptedFileName: null,
        statusMessage: `Imported ${file.name} — ${count} product${count === 1 ? '' : 's'} loaded.`,
        errors: [],
        additionalErrorCount: 0,
        evaluatedProducts,
        counts,
      };
      publish();
    } catch {
      setFailure(file.name, `Could not import ${file.name}. Fix the listed issues and try again.`);
    }
  };

  const loadFreshRouteSample = async () => {
    state = {
      ...state,
      phase: 'checking',
      attemptedFileName: null,
      retrySourceType: null,
      statusMessage: 'Loading FreshRoute sample\u2026',
      errors: [],
      additionalErrorCount: 0,
    };
    publish();

    try {
      const loaded = await loadFreshRouteRecords();
      if (!loaded?.ok) {
        setFailure(
          '',
          'Could not load the FreshRoute sample. Try again.',
          [],
          0,
          'freshroute-sample',
        );
        return;
      }

      const evaluatedProducts = sortEvaluatedProducts(loaded.records.map(evaluateProduct));
      const counts = getStatusCounts(evaluatedProducts);
      state = {
        phase: 'active',
        activeSourceType: 'freshroute-sample',
        retrySourceType: null,
        activeFileName: null,
        attemptedFileName: null,
        statusMessage: 'FreshRoute sample loaded \u2014 8 inventory records.',
        errors: [],
        additionalErrorCount: 0,
        evaluatedProducts,
        counts,
      };
      publish();
    } catch {
      setFailure(
        '',
        'Could not load the FreshRoute sample. Try again.',
        [],
        0,
        'freshroute-sample',
      );
    }
  };

  const retry = async () => {
    if (state.retrySourceType === 'freshroute-sample') {
      await loadFreshRouteSample();
    }
  };

  const reset = () => {
    state = emptyState('Inventory cleared. Import a CSV inventory file to begin.');
    publish();
  };

  publish();
  return { getState: () => state, importFile, loadFreshRouteSample, retry, reset };
}
