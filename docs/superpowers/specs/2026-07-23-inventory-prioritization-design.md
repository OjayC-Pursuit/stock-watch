# Inventory Prioritization Dashboard Design

## Purpose

This first StockWatch feature turns the existing eight-product sample inventory into a clear answer to: “Which products need my attention today?” It is a read-only, class-MVP dashboard with no integrations, accounts, ordering, reports, filters, or review interactions.

## Architecture and Data Flow

Use plain JavaScript with two lightweight responsibilities:

1. An evaluator accepts one inventory product and returns its primary status, all triggered reasons, days until expiration, projected days until stockout, and a display-only recommended action.
2. A renderer uses the evaluated products to create the four summary counts and the sorted product cards.

The data flow is:

```text
data/sample-inventory.json
→ evaluate each product
→ count statuses and sort results
→ render dashboard summary and product cards
```

Define the fixed demo date once in JavaScript as July 22, 2026. All date and stockout calculations use that date; there is no live-date mode or date selector.

## Evaluation Rules

Use date-only calendar-day comparisons so time zones cannot create off-by-one results. Calculate projected stockout as quantity on hand divided by sales rate per day. If sales rate is zero or missing, projected stockout is `null` and cannot trigger an Urgent stockout rule.

Assign exactly one primary status in this order:

1. **Urgent** when the product is expired, when projected stockout is within 2 days, or when it is low stock and expires within 3 days.
2. **Low Stock** when quantity on hand is at or below the reorder threshold.
3. **Expiring Soon** when expiration is within 7 days.
4. **Safe** when no condition above applies.

The evaluator must retain every applicable reason even when a higher-priority status wins. Examples include low-stock quantities, an upcoming expiry date, and a projected stockout. An expired item should state `expired X days ago`, receive the action `Remove from inventory today`, and use Urgent as its primary status.

Recommended actions are display-only:

- Urgent: `Take action today`
- Low Stock: `Reorder soon`
- Expiring Soon: `Use or sell soon`
- Safe: `No immediate action needed`

## Dashboard Results

The dashboard will show:

- The StockWatch heading and `Demo inventory date: July 22, 2026`.
- Four summary cards: Urgent, Low Stock, Expiring Soon, and Safe.
- All eight product cards; Safe products remain visible.

Cards sort by primary status in this order: Urgent, Low Stock, Expiring Soon, Safe. Within Urgent and Low Stock, sort by lowest projected days until stockout first. Within Expiring Soon, sort by fewest days until expiration first. Within Safe, sort by nearest expiration, then product name.

Each card displays the product name, category, brand, quantity on hand, reorder threshold, sales rate, expiration date, exact days remaining, projected stockout timing when available, primary status, all reasons, and recommended action.

This feature does not yet add filtering, a separate product-details screen, a reviewed-state interaction, supplier actions, or editing.

## Safeguards and Verification

If the data cannot load or is not a product list, show a clear dashboard error instead of an empty list. Missing or zero sales rates remain non-projectable rather than producing a false Urgent alert.

Using the existing `sample-inventory.json` and the fixed demo date, expected status totals are:

- Urgent: 4
- Low Stock: 1
- Expiring Soon: 2
- Safe: 1

Verification must confirm all eight cards render, totals add to eight, sort order follows the rules, and the browser console has no errors. If the results differ from those expected counts, report the products and reasons for the difference; do not silently change the rules or sample data.

## Next Gate

Before implementation planning, use the Frontend Design skill to define the dashboard’s visual direction, hierarchy, responsive layout, status treatments, typography, spacing, and card styling. Incorporate the approved visual direction into this specification before creating an implementation plan.
