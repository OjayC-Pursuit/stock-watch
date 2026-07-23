# StockWatch Visual Design Specification

## Visual Concept

StockWatch is a **Modern Food Operations Workspace**: a warm, professional inventory environment for an Inventory Coordinator reviewing daily priorities. It should feel like an organized morning work surface for making informed product decisions, not a replacement spreadsheet or a warehouse command center.

The page’s visual thesis is the daily briefing: a calm, human welcome that leads directly into the work that needs attention.

## Product Personality

The experience should feel:

- Warm
- Professional
- Reliable
- Organized
- Human

Avoid a generic SaaS dashboard appearance, AI-generated dashboard patterns, warehouse command-center styling, and spreadsheet-replacement aesthetics. The interface should use restrained operational details and food-aware warmth rather than decorative charts, dense data grids, or technical control-room language.

## User Experience Direction

The dashboard is a daily inventory briefing. Its opening message is:

> Good morning, Alicia. Here is what needs your attention today.

It combines an at-a-glance view of inventory health with a prioritized action queue. The experience should make the coordinator feel oriented first, then guide them through the work cards that need a decision.

## Dashboard Hierarchy

The page follows this order:

1. **Header / daily briefing** — product identity, greeting, and demo inventory date.
2. **Inventory health summary** — a concise view of the four status totals.
3. **Needs Attention Today** — the primary action queue.
4. **Status-grouped sections** — Urgent, Low Stock, and Expiring Soon, in that order.
5. **Safe inventory** — a quieter but still visible section proving every product was evaluated.

The action queue is the dominant area. The summary supports it; it should not compete with it through oversized metrics or generic dashboard decoration.

## Product Card Design

Cards are work-task cards, not product catalog cards. They remain expanded by default so Alicia does not have to open extra views to understand why an item needs attention.

Each card presents, in scan order:

1. Product identity: product name, category, and brand.
2. Primary status: a text label with a supporting icon.
3. Reason for attention: concise, plain-language triggers such as low stock, projected stockout, or days until expiration.
4. Supporting inventory facts: quantity on hand, reorder threshold, sales rate, expiration date, days remaining, and projected stockout timing when available.
5. Display-only recommended action.

The card should make its reason and action easy to identify before the supporting facts, while retaining enough detail to support a real inventory decision.

## Status Visual Treatment

Status treatment uses color as reinforcement, never as the only signal. Every status has a text label, a distinctive icon, and a color role.

| Status | Color role | Label and icon | Meaning |
| --- | --- | --- | --- |
| Urgent | Deep alert red | `Urgent` with a warning/attention icon | Immediate action is needed. |
| Low Stock | Warm amber | `Low Stock` with a low-inventory icon | Inventory needs replenishment soon. |
| Expiring Soon | Golden ochre | `Expiring Soon` with a date or shelf-life icon | Shelf life needs attention. |
| Safe | Muted leafy green | `Safe` with a check icon | No immediate issue. |

Color choices must meet contrast requirements in their final text and icon uses. Statuses must remain understandable in grayscale, for color-vision differences, and when icons fail to load.

## Typography

Typography prioritizes modern workplace readability and fast scanning.

- A clear display treatment gives the daily briefing a human, confident voice without becoming decorative.
- Body text is calm and highly legible for reasons and operational guidance.
- A compact utility style distinguishes dates, quantities, thresholds, and rates without giving the page a spreadsheet feel.
- Hierarchy comes from scale, weight, spacing, and plain language rather than all-caps labels or excessive visual noise.

## Spacing and Density

Use comfortable operational spacing: enough room to scan cards and understand reasons at a glance, without making the dashboard feel sparse. Prioritize readability over maximum data density.

The relationship between a card’s status, reason, facts, and action should be obvious through grouping and whitespace. Dividers and metadata rows may organize content, but decoration should stay restrained.

## Responsive Behavior

### Desktop

Desktop is optimized for a wide workstation. It uses full decision cards, generous spacing, and a hierarchy that lets the coordinator scan the briefing, health summary, and prioritized queue without feeling compressed.

### Mobile

Mobile is a priority-first review experience. Information stacks into a single-column reading order, while keeping the status, reasoning, and recommended action visible. Important reasoning must not be hidden behind truncation, hover-only controls, or collapsed detail by default.

## Accessibility

Accessibility is a default requirement:

- Sufficient text, icon, and status contrast.
- Text labels and icons in addition to color.
- Logical heading hierarchy and reading order.
- Keyboard-friendly focus and interactions for future interactive elements.
- Responsive reflow without losing key reasoning or action guidance.

## Loading State

Use a professional workspace skeleton state rather than a generic spinner-only screen. Placeholder shapes should preserve the daily briefing, summary, and card structure so the page still feels like an organized inventory review while data is loading.

## Error State

Use a clear operational message when inventory review cannot load. Explain that the inventory review is unavailable, state the practical next step (for example, refresh and try again), and avoid technical error dumps. The message should preserve the product’s calm, reliable tone.

## Implementation Boundary

This specification defines visual direction only. It does not change the approved functional rules, fixed demo date, expected results, data flow, MVP scope, or feature exclusions in the inventory-prioritization design specification.
