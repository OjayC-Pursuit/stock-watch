# StockWatch Handoff

## Current Project State

StockWatch is in the starter stage on the `main` branch. The repository contains planning documents, eight sample dairy products, and a basic HTML/CSS/JavaScript dashboard shell. No MVP feature logic has been implemented yet.

## What Already Works

- The static page loads with a StockWatch header, three placeholder summary cards, and an empty product area.
- `index.html` connects to `styles.css` and `script.js`.
- The starter JavaScript finds the app container and marks it with a `starter` status.
- `data/sample-inventory.json` contains valid sample data for eight products.
- The layout includes a basic mobile breakpoint.

## Most Recent Completed Work

Commit `7013bb2` (`Initialize StockWatch project structure and planning docs`) created the planning documents, sample inventory data, starter page, styles, JavaScript entry point, and `.gitignore`.

## Next Exact Task

Use Superpowers brainstorming to design the first StockWatch feature: sample inventory data → prioritization rules → visible dashboard results. Present the proposed design for approval before implementation.

Do not begin feature implementation until both the design and the implementation plan have been approved.

## Settled Decisions

- The MVP answers: “What products need my attention today?”
- The core product is inventory prioritization using quantity, reorder threshold, sales rate, and expiration date.
- Product recommendations are display-only.
- The flow ends when the user marks a product as reviewed; operational actions happen outside StockWatch.
- The MVP uses sample inventory data and plain HTML, CSS, and JavaScript.
- Automatic orders, supplier contact, report generation, accounts, multiple warehouses, live integrations, and advanced forecasting are out of scope.

## Unresolved Decisions or Blockers

- The exact rules and precedence for `Urgent`, `Low Stock`, `Expiring Soon`, `Monitor`, and `Safe` have not been documented.
- The expiration window for “expiring soon” has not been settled.
- How reviewed status will persist between page loads has not been decided.
- There is no blocker for the next task because it only displays the existing sample data.

## Verification Commands

Run these from the repository root:

```powershell
git status --short --branch
Get-Content -Raw data/sample-inventory.json | ConvertFrom-Json | Measure-Object
python -m http.server 8000
```

Then open `http://localhost:8000` and confirm the page loads. After the next task, confirm that all eight sample products appear and the browser console has no errors.
