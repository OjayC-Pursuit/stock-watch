# StockWatch Multi-Source Inventory Loading — Visual Design

Status: Proposed for approval. This document defines visual treatment only and does not authorize implementation.

## Sources of Truth

- Functional behavior: [Multi-Source Inventory Loading — Functional Design](2026-08-10-multi-source-inventory-loading-design.md)
- Existing loader visual language: [V2.1 Receiving Manifest Dock Visual Design](2026-07-26-csv-inventory-loader-visual-design.md)
- Existing dashboard direction: [StockWatch Visual Design Specification](../../visual-design-specification.md)

If this document appears to conflict with the functional design, the functional design controls all source behavior, parsing, validation, normalization, evaluation, replacement, Retry, and Reset rules.

## Design Direction

The multi-source extension is a **Source Manifest Switchboard** inside the existing FreshRoute Receiving Manifest Dock. It should feel like Alicia is choosing which receiving manifest to place on the same cold-chain review board—not opening a generic upload center or switching between separate applications.

The audience remains an Inventory Coordinator, and the page keeps one job: load one inventory source and show the existing prioritized signal board. The visual design does not introduce a data browser, analytics layer, or secondary workflow.

The memorable element is a restrained **archival index stripe** used only for the Kaggle historical-training source. It borrows from indexed paper archives and makes historical data visibly different from current or demonstration inventory without using urgency colors or turning the interface into a themed exhibit.

## Preserved Visual System

The current V2/V2.1 system remains authoritative:

- `#123d49` chiller blue for structure and secondary controls;
- `#082c36` deep blue for primary text, hero surfaces, and focus outlines;
- `#0b4d3a` FreshRoute green for brand and the primary Upload CSV action;
- `#fbfcf8` milk white for dock and card surfaces;
- `#e8f0ef` ice paper for the lined workspace;
- `#4c676d` steel for supporting text;
- existing signal red, amber, ochre, and safe green remain reserved for inventory status and error meaning;
- Bahnschrift SemiCondensed continues as the display face;
- Segoe UI/Aptos/system UI continues as body copy; and
- Cascadia Mono/Consolas continues for source labels, filenames, counts, dates, and operational metadata.

Square corners, one-pixel rules, the five-pixel FreshRoute-green dock top rule, existing page width, existing page gutters, and the ruled cold-chain workspace remain unchanged. No gradients, rounded SaaS cards, floating controls, modal source pickers, or decorative charts are introduced.

## Page Placement and Overall Hierarchy

The Receiving Manifest Dock remains directly below the main StockWatch header and above the summary rail.

The page order is:

1. StockWatch/FreshRoute header.
2. Receiving Manifest Dock with source identity, source choices, state, status note, and recovery controls.
3. Four-part summary rail.
4. Results hero, only when inventory is active.
5. Existing Urgent, Low Stock, Expiring Soon, and Safe sections.

The summary rail remains visible with `0 / 0 / 0 / 0` in true no-data and failed-first-load states. The results hero and product cards remain hidden until a complete source succeeds.

## Source Picker Construction

The picker is an operational manifest register, not a collection of promotional cards. It uses three equal source lanes separated by one-pixel chiller-blue rules on desktop and stacked full-width lanes on narrow screens.

Each lane contains, in this order:

1. A short utility source code: `FR SAMPLE`, `CSV`, or `HISTORICAL`.
2. A plain-language source title.
3. One concise capacity/context line.
4. Its action control.

The exact action labels are:

- `Load FreshRoute sample`
- `Upload CSV`
- `Load Kaggle historical training snapshot`

The supporting lines are:

- FreshRoute: `Bundled demonstration · 8 inventory records`
- CSV: `Your inventory export · CSV only · Up to 250 products`
- Kaggle: `Curated training set · 80 of 4,325 historical rows`

`Upload CSV` remains the filled FreshRoute-green primary action because loading the coordinator's own inventory is StockWatch's main real-world path. The two bundled-source actions are milk-white secondary controls with chiller-blue borders. This hierarchy does not hide or disable either bundled source.

The Kaggle lane adds the archival index stripe: a four-pixel vertical edge made from a quiet repeating chiller-blue/ice-paper pattern. The stripe is decorative reinforcement only. The source remains identifiable by text without it.

All three choices remain visible whether the dashboard is empty or active. The picker does not become a dropdown, menu, tabs, or sidebar.

## State Model

The established dock seals remain:

- `EMPTY`
- `CHECKING`
- `ACTIVE`
- `HOLD`

The word `CHECKING` is retained as the visual state label for every transactional source load. The nearby status line uses source-specific loading language so it never implies that a bundled source is a user-uploaded file.

### True No-Data State

The dock is expanded and presents this hierarchy:

1. `RECEIVING MANIFEST · INVENTORY SOURCES`
2. `EMPTY` seal with its existing icon-and-text treatment.
3. Primary heading: `Choose an inventory source to begin.`
4. Supporting copy: `Load a FreshRoute sample, upload your inventory CSV, or review the historical training snapshot.`
5. The three source lanes.
6. The zero-count summary rail.

No active-source badge, source filename, success note, exclusion note, Retry control, hero, or product card appears. This is a true no-data state; no source is preselected or automatically loaded.

### Loading and Replacement State

The dock uses the existing `CHECKING` seal and two-pixel scan line. The line is the only motion.

Source-specific status copy is:

- `Loading FreshRoute sample…`
- `Checking filename.csv…`
- `Building Kaggle historical training snapshot…`

For a first load, the expanded source picker and zero-count rail remain visible. For a replacement load, the current active-source identity, current dashboard, and current counts remain fully visible. The attempted source appears in a secondary line labeled `LOADING SOURCE`; it does not replace the `ACTIVE SOURCE` identity until success.

The active dashboard is not dimmed, covered, skeletonized, or replaced by a spinner. The source controls use their established unavailable treatment during the in-progress transaction so the interface communicates one source operation at a time. There is no artificial delay.

With `prefers-reduced-motion: reduce`, the scan line becomes the existing stationary three-segment marker. State text and the status message carry the complete meaning without motion.

### Active Source Identification

After success, the dock becomes a compact operational strip. Its first row contains:

1. `RECEIVING MANIFEST · INVENTORY SOURCES`
2. The green icon-and-text `ACTIVE` seal.
3. `ACTIVE SOURCE`.
4. The active source title or uploaded filename.
5. A count badge.
6. A source-specific success note in the compact status line.
7. The three source actions, still available for replacement.
8. The tertiary `Clear inventory` control.

Active identity titles are:

- `FreshRoute sample`
- the safely wrapped uploaded filename;
- `Kaggle historical training snapshot`

FreshRoute and Kaggle count badges use `inventory record` or `inventory records`. Uploaded CSV count badges retain the existing `product` or `products` terminology. Count badges never rely on color alone and filenames never truncate.

The source actions form a quiet, full-width action rail beneath the active identity rather than competing with the result headline. At desktop width the three source actions share one row and `Clear inventory` sits at the end after a vertical rule. On narrow screens they stack.

### FreshRoute Success

The active source title is `FreshRoute sample`, paired with an `8 inventory records` badge. The compact status line displays exactly:

`FreshRoute sample loaded — 8 inventory records.`

The state uses the standard green ACTIVE treatment. It adds no extra claim that the sample is live inventory.

### Uploaded CSV Success and Invalid Upload

The uploaded filename is the active source title and wraps anywhere necessary. Existing CSV success, file-limit, row-limit, type, validation, and failed-replacement messages remain visually and behaviorally unchanged from the approved V2.1 functional and visual specifications.

A failed CSV uses the existing HOLD tray and capped row-and-column error list. It does not show Retry. The recovery action remains `Upload CSV`, accompanied by the helper line `Choose a corrected file and upload it again.` The same control label is used before and after failure so the interaction vocabulary stays consistent.

### Kaggle Historical-Training Treatment

Kaggle is an archival training source, not a live inventory source. Its visual treatment must prevent that distinction from being mistaken or lost.

The active dock includes the exact persistent label:

`Historical training snapshot — not current inventory`

This line sits immediately beneath the Kaggle active-source title in strong utility text. It is not a dismissible banner, warning toast, or red alert. The four-pixel archival index stripe appears along the Kaggle active-identity block and on the left edge of the Kaggle results hero, tying the source to its results.

The Kaggle hero retains the existing deep-blue structure and FreshRoute proportions but changes its source-aware copy to:

- eyebrow: `Historical inventory signal`
- headline: `N products need attention in this snapshot.`

The headline uses the evaluator-driven attention total defined by the functional design. It never substitutes `today`, `current`, or live-inventory language.

Each Kaggle card adds exactly one quiet metadata line between the product/category identity and inventory facts:

`Historical snapshot · [Location] · Source date [YYYY-MM-DD]`

The line uses utility typography, steel text, and safe wrapping. It is not placed in a badge and is not repeated elsewhere inside the card. Kaggle stock quantities append `liters/kg` in the existing fact layout. No per-record unit is inferred.

### Kaggle Success and Exclusion Note

The compact status area displays exactly:

`Kaggle historical training snapshot loaded — 80 inventory records.`

When exclusions occur, the following exact sentence is appended as a second visible line in the same status block:

`80 historical records loaded; N ineligible source rows excluded.`

The exclusion note uses a neutral information mark, steel text, and a one-pixel steel rule. It is not styled as HOLD or signal red because successful loading is not an error. It includes no row-level technical details. When there are zero exclusions, the exclusion line is omitted.

### Source-Load Error and Retry

All load failures use the existing HOLD language: signal-red left edge, signal-red bordered seal with icon and text, milk-white/red-soft surface, and calm recovery copy.

For a failed first load, the expanded source picker and zero-count rail remain. For a failed replacement, the dock clearly separates:

- `ACTIVE SOURCE` — the inventory still shown on the dashboard; and
- `ATTEMPTED SOURCE` — the source that failed.

The attempted source never replaces or visually outranks the active source.

Bundled-source messages remain exactly:

- `Could not load the FreshRoute sample. Try again.`
- `Could not load the Kaggle historical training snapshot. Try again.`

Bundled-source failures show a `Retry` button inside the HOLD tray. Retry is the primary recovery action in the tray, using a filled chiller-blue treatment rather than signal red. The three normal source choices remain visible as alternatives.

CSV failures never show Retry and continue to use the `Upload CSV` recovery described above. Technical Kaggle parsing, header, exclusion, or target-mix diagnostics are never shown in the interface.

### Reset Control

The visible control remains `Clear inventory`, which is more explicit than the abstract word “Reset.” It is the visual control for the functional Reset behavior.

It remains a borderless deep-blue tertiary action and never uses signal red. Activating it returns immediately to true no-data: expanded picker, no source identity, no loading or HOLD state, no Retry, no success/exclusion note, zero summary counts, and no results. The functional design requires only the three source choices after Reset, so no toast, confirmation dialog, or retained reset message is added.

## Managing 80 Historical Records Without a Data-Browser Redesign

The current dashboard already supports 80 product cards. The Kaggle source preserves that structure:

- one compact source dock;
- one four-status summary rail;
- one source-aware hero;
- existing Urgent, Low Stock, Expiring Soon, and Safe sections;
- existing card grid at desktop and single-column cards on mobile; and
- one historical context line per card.

No dataset table, pagination, filters, search, collapsed details, aggregation, sticky index, virtualized browser, or new details view is added. Section counts and existing status ordering provide orientation. The archival stripe is used only at the source identity and hero—not on all 80 cards—so the long page does not become visually repetitive.

Card padding, reason hierarchy, recommended actions, and status colors remain unchanged. The historical context line and `liters/kg` unit are the only source-specific card additions.

## Measurements and Spacing

- Expanded desktop dock padding remains `24px` vertical and `28px` horizontal.
- Compact ACTIVE desktop dock padding remains `14px` vertical and `18px` horizontal.
- The source picker uses three equal `minmax(0, 1fr)` columns with `16px` gaps and one-pixel internal rules.
- Each source lane uses `16px` internal padding and a minimum `16px` gap between description and action; it has no fixed height.
- The active identity row uses the existing `30px` desktop column gap and `18px` row gap.
- The active source action rail begins after a `12px` top gap and one-pixel soft divider.
- Source action controls remain at least `44px` high. Long labels may wrap to two lines and increase control height.
- State seals retain their existing one-pixel border and minimum `32px` height, reducing to `30px` at 320px.
- HOLD retains its one-pixel signal-red border and five-pixel signal-red left edge.
- Historical context lines use the existing compact utility size, never smaller than `0.68rem`, with at least `1.4` line height.
- No source lane, active strip, status block, filename, or button receives a fixed height.

## Responsive Behavior

### Desktop

- The true no-data picker uses three equal source lanes in one row.
- The active identity remains on the first row; source actions use the full-width rail below it.
- The three load actions share available width without truncating text.
- `Clear inventory` is visually separated at the end of the action rail.
- HOLD spans the dock's full width below identity and actions.
- Existing two-column urgent cards and secondary lanes remain unchanged.

### 390px

- Preserve the current mobile page gutters and `18px` dock padding.
- Stack the heading, supporting copy, and all three source lanes.
- Replace vertical lane rules with horizontal rules.
- Make every source action, Retry, Upload CSV recovery action, and Clear inventory control full width.
- Stack active identity, status/exclusion notes, source actions, and HOLD content in reading order.
- Allow the Kaggle title, persistent label, filename, exclusion note, and historical card context to wrap without truncation.
- Preserve the existing single-column product-card layout and full card content.

### 320px

- Use the current `14px` dock padding.
- Keep all source helper lines; do not shorten or hide the historical warning.
- Stack every action vertically with at least `10px` between controls.
- Allow the long Kaggle load control to become two lines while remaining at least `44px` high.
- Stack the state seal and source identity when they cannot share a line.
- Let utility labels, filenames, dates, locations, and `liters/kg` values wrap naturally.
- Prevent horizontal overflow at normal size and 200% zoom.

## Accessibility

- The source choices form one semantic group with a visible `Choose inventory source` legend or group heading.
- Upload CSV uses a real file input with a clearly associated visible control; it is not drag-and-drop only.
- Every source, operational state, historical state, error, and active identity uses text in addition to color and decoration.
- The active source is stated by the `ACTIVE SOURCE` label; it is not communicated by the active button color.
- The archival stripe is decorative and hidden from assistive technology.
- All controls keep the approved two-layer focus treatment: a `3px` deep-blue outer outline with a `3px` offset and a milk-white separation layer visible on light, green, and red surfaces.
- All controls have at least a `44px` target size.
- Only the compact source-status block uses `aria-live="polite"` and `aria-atomic="true"`. The dock, dashboard, counts, exclusion detail, and 80-card list are not live regions.
- During loading, the source-control region communicates busy state without marking the retained active dashboard as busy or unavailable.
- On failure, focus moves to the HOLD summary heading. Detailed CSV errors remain a semantic list outside the live region.
- `Retry` has an accessible name that includes the remembered bundled source when context is not otherwise programmatically associated.
- Source headings, success notes, historical labels, errors, and buttons meet WCAG AA contrast against their surfaces.
- Reduced-motion treatment preserves the CHECKING state without animation.
- Keyboard reading order follows the visual order: source identity, status, source choices, recovery/clear action, then summary and results.

## Copy Matrix

| Context | Required visible copy |
| --- | --- |
| True no-data heading | `Choose an inventory source to begin.` |
| FreshRoute success | `FreshRoute sample loaded — 8 inventory records.` |
| FreshRoute failure | `Could not load the FreshRoute sample. Try again.` |
| Kaggle persistent label | `Historical training snapshot — not current inventory` |
| Kaggle hero eyebrow | `Historical inventory signal` |
| Kaggle attention headline | `N products need attention in this snapshot.` |
| Kaggle card context | `Historical snapshot · [Location] · Source date [YYYY-MM-DD]` |
| Kaggle success | `Kaggle historical training snapshot loaded — 80 inventory records.` |
| Kaggle exclusions | `80 historical records loaded; N ineligible source rows excluded.` |
| Kaggle failure | `Could not load the Kaggle historical training snapshot. Try again.` |
| Bundled-source recovery | `Retry` |
| CSV recovery | `Upload CSV` |
| Reset behavior control | `Clear inventory` |

Existing approved CSV messages remain unchanged and are not rewritten by this specification.

## Visual Review Requirements Before Implementation Approval

A temporary browser preview should demonstrate:

- true no-data with all three choices;
- FreshRoute ACTIVE success;
- uploaded CSV ACTIVE success;
- Kaggle ACTIVE success with historical hero, context lines, and exclusion note;
- a first-source CHECKING state;
- replacement CHECKING with the old dashboard retained;
- failed FreshRoute or Kaggle load with Retry;
- invalid CSV with Upload CSV recovery and no Retry;
- failed replacement with ACTIVE SOURCE and ATTEMPTED SOURCE separated;
- Reset returning to true no-data; and
- desktop, 390px, and 320px layouts, including an 80-record historical result.

The review must confirm no horizontal overflow, safe wrapping, focus visibility, reduced-motion treatment, readable HOLD content, source-aware wording, and no console errors in the eventual implementation. The preview must not implement the functional feature unless a separate implementation plan is approved.

## Prohibited Reinterpretations

The implementation planner must not:

- move source selection into the site header, hero, modal, toast, overlay, sidebar, or floating control;
- turn the source picker into a generic dashed upload zone, dropdown, tab interface, or data-source marketplace;
- hide any of the three source choices when inventory is active;
- replace or hide active inventory during a pending or failed replacement;
- use Retry for invalid uploaded CSV files;
- show technical bundled-source diagnostics;
- present Kaggle data as current or live inventory;
- change the three required Kaggle phrases;
- use `products` for Kaggle source counts or badges;
- repeat the archival stripe on every product card;
- add pagination, filtering, search, aggregation, details, persistence, authentication, backend services, or live Kaggle access;
- alter evaluator rules, statuses, sorting, reasons, actions, counts, or fixed date;
- change existing inventory status colors to represent source types;
- use signal red for Clear inventory or normal historical-source treatment;
- animate anything beyond the approved CHECKING scan line; or
- create additional product behavior under the label of visual design.

## Implementation Boundary

This specification extends the Receiving Manifest Dock's visual language only. It does not authorize application code or an implementation plan. The approved multi-source functional design remains the sole authority for data flow, source rules, transactional replacement, error preservation, Retry, Reset, and evaluation behavior.
