# StockWatch Handoff

## Current Project State

Multi-source inventory loading is implemented on `feature/multi-source-inventory-data` at `d223901`. The branch has a successful Vercel Preview deployment for that commit, but the Preview is protected by a Vercel login and is not ready as a public final-submission link. This documentation milestone is uncommitted and awaiting user review; `main` is unchanged.

## What Already Works

- StockWatch starts in true no-data with three choices: FreshRoute sample, CSV upload, and Kaggle historical training snapshot.
- Every source follows one transaction: parse and validate, normalize, evaluate with the unchanged engine, then replace the dashboard only on complete success.
- FreshRoute activates exactly 8 validated records; uploaded CSV supports up to 250 rows; the bundled Kaggle source activates a deterministic 80-record historical snapshot.
- Kaggle records are labeled historical, preserve source metadata, use a fixed July 22, 2026 demo date for derived expiration timing, and evaluate to 12 Urgent, 12 Low Stock, 16 Expiring Soon, and 40 Safe.
- Failed source replacements preserve the active dashboard. FreshRoute and Kaggle failures provide Retry; invalid uploads require choosing a corrected file. Reset clears records, source identity, messages, retry state, and notes.
- The Receiving Manifest Switchboard remains responsive without horizontal overflow at desktop, 390px, and 320px in browser coverage. It has one compact live region, visible two-layer keyboard focus, and a reduced-motion checking state.

## Most Recent Completed Work

- Implemented the switchboard and source-aware rendering in commits `5d03e2f`, `7096f38`, `26a2b00`, and `d223901`.
- Reran the full suite on August 11, 2026: 58 tests passed, 0 failed, including three browser tests.
- Verified the Vercel Preview for `d223901` completed successfully, but its browser response is the Vercel login page rather than StockWatch; public deployment access remains unresolved.
- Updated README to document verified multi-source behavior, source boundaries, historical-data attribution, and the current Preview versus production distinction.

## Next Exact Task

Review and approve the completed multi-source feature documentation for commit. Do not merge this feature branch into `main`, commit, or push until the user explicitly approves.

## Settled Decisions

- Keep the project as a plain HTML, CSS, and JavaScript class MVP with no backend, database, persistence, framework, package, or direct Kaggle API.
- Kaggle is a bundled historical training snapshot, never live or current inventory. It uses the verified Dairy Goods Sales Dataset source (2019–2022, CC0/Public Domain) and activates 80 of 4,325 source rows.
- CSV uploads remain temporary and all-or-nothing; the 250-row limit applies only to uploaded files, not bundled sources.
- `.superpowers/` remains ignored and outside intended commits.

## Unresolved Decisions or Blockers

The multi-source browser implementation has no known code blocker. Public deployment access is unresolved: the successful Vercel Preview is login-protected, and GitHub Pages still serves `main` without this branch. The remaining gates are user review of the uncommitted README and handoff updates, a user-authorized commit, and a public deployment decision.

## Verification Commands

Run from the repository root:

```powershell
node --test tests/inventory-evaluator.test.js tests/dashboard-renderer.test.js tests/csv-parser.test.js tests/inventory-validator.test.js tests/inventory-normalizer.test.js tests/inventory-source-loaders.test.js tests/inventory-import-controller.test.js tests/csv-demo-scenarios.test.js tests/csv-loader.browser.test.js
git diff --check
git status --short --branch
```

Browser coverage verifies FreshRoute, uploads, Kaggle, source switching, failed-replacement preservation, bundled Retry, CSV re-upload recovery, Reset, console errors, reduced motion, keyboard focus, and overflow at desktop, 390px, and 320px.
