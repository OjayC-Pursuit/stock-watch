# StockWatch Handoff

## Current Project State

StockWatch has approved functional and visual specifications for its first feature. The repository still contains only planning documents, eight sample dairy products, and a basic HTML/CSS/JavaScript dashboard shell; no MVP feature logic has been implemented yet.

## What Already Works

- The static page loads with a StockWatch header, three placeholder summary cards, and an empty product area.
- `index.html` connects to `styles.css` and `script.js`.
- The starter JavaScript finds the app container and marks it with a `starter` status.
- `data/sample-inventory.json` contains valid sample data for eight products.
- The layout includes a basic mobile breakpoint.

## Most Recent Completed Work

The approved visual direction was recorded in `docs/visual-design-specification.md`. No implementation changes were made.

## Next Exact Task

Create the implementation plan for the first dashboard feature.

Implementation planning must use both approved inputs: `docs/superpowers/specs/2026-07-23-inventory-prioritization-design.md` and `docs/visual-design-specification.md`. Do not begin feature work until the implementation plan is approved.

## Settled Decisions

- The MVP answers: “What products need my attention today?”
- The core product is inventory prioritization using quantity, reorder threshold, sales rate, and expiration date.
- Product recommendations are display-only.
- The flow ends when the user marks a product as reviewed; operational actions happen outside StockWatch.
- The MVP uses sample inventory data and plain HTML, CSS, and JavaScript.
- The dashboard uses the fixed demo inventory date July 22, 2026.
- Products have one primary status in this order: Urgent, Low Stock, Expiring Soon, Safe; cards retain all applicable reasons.
- Urgent covers expired products, stockout within 2 days, and low stock expiring within 3 days. Low Stock is quantity at or below the reorder threshold. Expiring Soon is within 7 days.
- Expected totals for the current sample data are Urgent 4, Low Stock 1, Expiring Soon 2, and Safe 1.
- The visual direction is a Modern Food Operations Workspace: a warm, professional daily briefing with an inventory-health summary, prioritized work-task cards, accessible status treatments, and priority-first responsive behavior.
- Automatic orders, supplier contact, report generation, accounts, multiple warehouses, live integrations, and advanced forecasting are out of scope.

## Unresolved Decisions or Blockers

- How reviewed status will persist between page loads has not been decided.
- There is no blocker for implementation planning.

## Verification Commands

Run these from the repository root:

```powershell
git status --short --branch
Get-Content -Raw data/sample-inventory.json | ConvertFrom-Json | Measure-Object
python -m http.server 8000
```

Then open `http://localhost:8000` and confirm the page loads. After implementation, confirm all eight sample products appear, status counts are 4/1/2/1, and the browser console has no errors.
