# StockWatch Working Guide

## Start Here

- Read `docs/HANDOFF.md` before beginning project work.
- Treat `README.md`, `docs/product-card.md`, `docs/user-flow.md`, and `docs/build-plan.md` as the source of truth for settled product decisions.
- Check the working tree and recent Git history before editing so work from another computer is not overwritten.

## Permanent Scope

StockWatch is a small class MVP that helps an Inventory Coordinator see which products need attention. Its core purpose is to turn sample inventory data into clear priorities such as low stock, expiring soon, and urgent.

The MVP may display recommended actions and let a user mark a product as reviewed. It does not place orders, contact suppliers, generate reports, manage accounts or warehouses, connect to a live inventory system, or perform advanced forecasting.

## Working Rules

- Follow the build order in `docs/build-plan.md`.
- Keep the implementation lightweight with plain HTML, CSS, and JavaScript unless the project documents are intentionally updated.
- Prefer the smallest change that completes the current task; avoid speculative features and unnecessary dependencies.
- Do not change settled product scope without the user's approval.
- Use `data/sample-inventory.json` as the MVP data source.
- Verify relevant behavior before describing work as complete.
- Do not commit or push unless the user asks.

## Session Continuity

After a meaningful work session, update `docs/HANDOFF.md` with the new state, completed work, next exact task, decisions, blockers, and current verification commands. Keep the handoff concise and do not copy the README, Product Card, or chat transcript into it.
