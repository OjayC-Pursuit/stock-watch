const EMPTY_COUNTS = {
  Urgent: 0,
  'Low Stock': 0,
  'Expiring Soon': 0,
  Safe: 0,
};

const SOURCE_DESCRIPTORS = {
  freshRoute: {
    type: 'freshroute-sample',
    title: 'FreshRoute sample',
    loadingMessage: 'Loading FreshRoute sample\u2026',
    successMessage: 'FreshRoute sample loaded \u2014 8 inventory records.',
    failureMessage: 'Could not load the FreshRoute sample. Try again.',
  },
  kaggle: {
    type: 'kaggle-historical-training',
    title: 'Kaggle historical training snapshot',
    loadingMessage: 'Building Kaggle historical training snapshot\u2026',
    successMessage: 'Kaggle historical training snapshot loaded \u2014 80 inventory records.',
    failureMessage: 'Could not load the Kaggle historical training snapshot. Try again.',
  },
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
    activeSource: null,
    activeSourceType: null,
    attemptedSource: null,
    retrySourceType: null,
    activeFileName: null,
    attemptedFileName: null,
    statusMessage,
    errors: [],
    additionalErrorCount: 0,
    exclusionNote: null,
    evaluatedProducts: [],
    counts: { ...EMPTY_COUNTS },
  };
}

export function createInventoryImportController({
  readText,
  parseCsv,
  validateInventoryRows,
  loadFreshRouteRecords,
  loadKaggleRecords,
  evaluateProduct,
  getStatusCounts,
  sortEvaluatedProducts,
  render,
}) {
  let state = emptyState();
  const publish = () => render(state);

  const setFailure = (
    attemptedFileName,
    message,
    errors = [],
    additionalErrorCount = 0,
    retrySourceType = null,
  ) => {
    state = {
      ...state,
      phase: 'hold',
      attemptedFileName,
      attemptedSource: retrySourceType
        ? { type: retrySourceType, title: SOURCE_DESCRIPTORS.freshRoute.type === retrySourceType
          ? SOURCE_DESCRIPTORS.freshRoute.title
          : SOURCE_DESCRIPTORS.kaggle.title }
        : attemptedFileName
          ? { type: 'uploaded-csv', title: attemptedFileName }
          : null,
      retrySourceType,
      statusMessage: message,
      errors,
      additionalErrorCount,
    };
    publish();
  };

  const evaluateAndActivate = (descriptor, loaded) => {
    const evaluatedProducts = sortEvaluatedProducts(loaded.records.map(evaluateProduct));
    const excludedRowCount = loaded.excludedRowCount ?? 0;
    state = {
      phase: 'active',
      activeSource: { type: descriptor.type, title: descriptor.title },
      activeSourceType: descriptor.type,
      attemptedSource: null,
      retrySourceType: null,
      activeFileName: null,
      attemptedFileName: null,
      statusMessage: descriptor.successMessage,
      errors: [],
      additionalErrorCount: 0,
      exclusionNote: excludedRowCount > 0
        ? `80 historical records loaded; ${excludedRowCount} ineligible source rows excluded.`
        : null,
      evaluatedProducts,
      counts: getStatusCounts(evaluatedProducts),
    };
    publish();
  };

  const runBundledSource = async (descriptor, loadRecords) => {
    state = {
      ...state,
      phase: 'checking',
      attemptedFileName: null,
      attemptedSource: { type: descriptor.type, title: descriptor.title },
      retrySourceType: null,
      statusMessage: descriptor.loadingMessage,
      errors: [],
      additionalErrorCount: 0,
    };
    publish();

    try {
      const loaded = await loadRecords();
      if (!loaded?.ok || !Array.isArray(loaded.records)) {
        setFailure('', descriptor.failureMessage, [], 0, descriptor.type);
        return;
      }
      evaluateAndActivate(descriptor, loaded);
    } catch {
      setFailure('', descriptor.failureMessage, [], 0, descriptor.type);
    }
  };

  const importFile = async (file) => {
    const selectionError = getFileSelectionError(file);
    if (selectionError) {
      setFailure(file?.name ?? '', selectionError);
      return;
    }

    state = {
      ...state,
      phase: 'checking',
      attemptedFileName: file.name,
      attemptedSource: { type: 'uploaded-csv', title: file.name },
      retrySourceType: null,
      statusMessage: `Checking ${file.name}\u2026`,
      errors: [],
      additionalErrorCount: 0,
    };
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
        setFailure(
          file.name,
          validated.message ?? `Could not import ${file.name}. Fix the listed issues and try again.`,
          validated.errors,
          validated.additionalErrorCount ?? 0,
        );
        return;
      }

      const evaluatedProducts = sortEvaluatedProducts(validated.products.map(evaluateProduct));
      const count = evaluatedProducts.length;
      state = {
        phase: 'active',
        activeSource: { type: 'uploaded-csv', title: file.name },
        activeSourceType: 'uploaded-csv',
        attemptedSource: null,
        retrySourceType: null,
        activeFileName: file.name,
        attemptedFileName: null,
        statusMessage: `Imported ${file.name} \u2014 ${count} product${count === 1 ? '' : 's'} loaded.`,
        errors: [],
        additionalErrorCount: 0,
        exclusionNote: null,
        evaluatedProducts,
        counts: getStatusCounts(evaluatedProducts),
      };
      publish();
    } catch {
      setFailure(file.name, `Could not import ${file.name}. Fix the listed issues and try again.`);
    }
  };

  const loadFreshRouteSample = async () => runBundledSource(
    SOURCE_DESCRIPTORS.freshRoute,
    loadFreshRouteRecords,
  );

  const loadKaggleSnapshot = async () => runBundledSource(
    SOURCE_DESCRIPTORS.kaggle,
    loadKaggleRecords,
  );

  const retry = async () => {
    if (state.retrySourceType === SOURCE_DESCRIPTORS.freshRoute.type) {
      await loadFreshRouteSample();
    }
    if (state.retrySourceType === SOURCE_DESCRIPTORS.kaggle.type) {
      await loadKaggleSnapshot();
    }
  };

  const reset = () => {
    state = emptyState();
    publish();
  };

  publish();
  return {
    getState: () => state,
    importFile,
    loadFreshRouteSample,
    loadKaggleSnapshot,
    retry,
    reset,
  };
}
