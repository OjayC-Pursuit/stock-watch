# StockWatch V2.1 Receiving Manifest Dock Visual Design

## Purpose and Relationship to V2

The Receiving Manifest Dock is FreshRoute's receiving-manifest intake point for the existing V2 Cold-Chain Signal Board. It is an operational, company-specific intake surface rather than a generic SaaS upload card.

It preserves the V2 palette, typography, spacing, lined workspace, page width, square-cornered panels, summary rail, hero, and product cards. The dock sits directly below the main StockWatch header. It adds no inventory behavior and does not redefine the CSV schema, parsing, validation, evaluated results, messages, or reset behavior defined in the [functional specification](2026-07-24-csv-inventory-loader-design.md).

## States and Overall Behavior

- **EMPTY** is expanded. The summary rail remains visible with all counts at zero; the results hero and product cards remain hidden until a valid import.
- **ACTIVE** is a slim operational strip. The existing V2 evaluated dashboard remains beneath it.
- **CHECKING** communicates a real in-progress browser file check without an artificial delay.
- **HOLD** presents a failed import and its validation issues. A failed replacement preserves the active dashboard.
- **Reset** returns immediately to expanded EMPTY, with its confirmation in the dock's compact import-status line.

## Dock Construction

The dock is a milk-white panel with a chiller-blue border, a five-pixel FreshRoute-green top rule, and square corners. On desktop it uses a two-column composition; on mobile it stacks. It remains directly below the main header in every state.

## Dock Measurements

- The expanded desktop dock uses `24px` vertical padding and `28px` horizontal padding.
- The compact ACTIVE desktop dock uses `14px` vertical padding and `18px` horizontal padding.
- At widths up to `640px`, including the approved 390px layout, the dock uses `18px` padding on every side.
- At widths up to `350px`, including the approved 320px layout, the dock uses `14px` padding on every side.
- The expanded desktop content-and-action layout uses an approximately `70% / 30%` split with a `28px` gap.
- The compact desktop layout uses a flexible active-file area and an auto-sized action area, with a `30px` column gap and an `18px` row gap.
- The dock has no fixed height; it grows when filenames, messages, or errors wrap.
- State seals use a one-pixel border and a minimum height of `32px`, reducing to `30px` in the 320px layout.
- The HOLD tray uses a one-pixel signal-red border with a five-pixel signal-red left edge.

### EMPTY hierarchy

The expanded EMPTY dock presents this order:

1. `RECEIVING MANIFEST · CSV`
2. An `EMPTY` state seal with icon and text.
3. `Import a CSV inventory file to begin.`
4. `Choose the inventory export you want StockWatch to evaluate.`
5. A primary `Choose CSV file` button.
6. `CSV only · Up to 1 MB · Maximum 250 products`
7. One compact import-status line when a status message exists.
8. The zero-count summary rail.

The explanation sits on the left and the primary action sits on the right at desktop widths. The import-status line stays inside the dock rather than becoming a toast or overlay.

### ACTIVE hierarchy

The compact ACTIVE strip presents this order:

1. `RECEIVING MANIFEST · CSV`
2. An `ACTIVE` seal with check icon, text, and FreshRoute-green treatment.
3. `ACTIVE FILE`
4. The filename in utility typography with safe wrapping.
5. A product-count badge.
6. The exact successful-import message in the compact status line: `Imported filename.csv — 1 product loaded.` or `Imported filename.csv — N products loaded.`
7. An outlined `Replace CSV` action.
8. A tertiary `Clear inventory` action.
9. The existing evaluated V2 dashboard beneath the strip.

ACTIVE information stays left and actions stay right on desktop. A filename must wrap rather than truncate.

## CHECKING Treatment

CHECKING uses both an icon and the text `CHECKING`, plus `Checking filename.csv…` in the import-status line.

- A first import retains the expanded dock and zero-count rail.
- A replacement check retains the compact current-inventory identity and active dashboard.
- Import and reset controls appear unavailable while checking.
- The only animation is a restrained two-pixel scan line; content does not pulse or flash.
- There is no artificial loading delay.
- With reduced motion, the moving line becomes a stationary three-segment marker.

## HOLD and Validation Errors

A failed first import retains the expanded dock and displays no results. A failed replacement retains the compact active-file strip and active dashboard, then displays a HOLD tray below the strip.

The HOLD treatment uses an icon, text, a signal-red seal, a red left edge, and this exact approved failed-import message: `Could not import filename.csv. Fix the listed issues and try again.` It labels both `ACTIVE FILE` and `ATTEMPTED FILE` where there is an active import; the attempted filename never replaces the active filename.

The HOLD tray:

- displays at most five errors;
- presents each error as row, column, then explanation;
- shows `+ N additional issues` where applicable;
- uses a stacked list, not a wide table;
- lets filenames and explanations wrap; and
- does not use a modal, toast, overlay, or technical error dump.

## Reset Treatment

Reset immediately restores expanded EMPTY and the zero-count rail, hides evaluated results, and shows this exact message in the single compact status line:

`Inventory cleared. Import a CSV inventory file to begin.`

The confirmation remains until another import attempt. Reset uses no confirmation dialog or timed toast, and it does not restore the built-in sample inventory.

## Buttons and Controls

- `Choose CSV file` is a filled FreshRoute-green primary button with milk-white text.
- `Replace CSV` is a milk-white secondary button with chiller-blue border and text.
- `Clear inventory` is a borderless deep-blue tertiary action.
- Clear inventory never uses solid red because red communicates inventory urgency.
- Every control is at least 44px tall.
- On mobile, controls use the full available width.
- At 320px, `Replace CSV` and `Clear inventory` stack vertically in that order.

## Responsive Behavior

### Desktop

- EMPTY uses explanatory content on the left and the primary action on the right.
- ACTIVE information stays left and actions stay right.
- HOLD errors use the dock's full width.

### 390px

- Preserve the existing mobile page gutters.
- Stack the heading, copy, helper text, and controls.
- Keep the state seal visible.
- Let the filename and product-count badge wrap safely.
- Make controls full width.
- Render errors as stacked rows.

### 320px

- Use `14px` dock padding on every side.
- Do not hide required copy or helper text.
- Stack actions vertically.
- Let filenames and error text wrap.
- Prevent horizontal overflow at normal size and at 200% zoom.

## Accessibility

- Future implementation uses a real file input with a clearly associated visible control.
- Every operational state uses icon, text, and color together.
- Controls use a `3px` deep-blue outer outline with a `3px` offset. A milk-white separation layer remains visible between the control and deep-blue outline; the complete two-layer treatment remains visible on light, green, and red surfaces.
- Only one compact import-status element uses `aria-live="polite"` and `aria-atomic="true"`.
- The dock and dashboard are never live regions, and detailed errors remain outside the live region.
- After a failed import, focus moves to the error-summary heading.
- Validation errors use semantic list structure.
- Before inventory exists, EMPTY owns the primary page heading. After a successful import, the evaluated results headline resumes that role.
- Motion-only decoration is hidden from assistive technology.
- Every state retains its meaning without animation or color.

## Prohibited Reinterpretations

The implementation planner must not:

- move the loader into the main header or results hero;
- make drag-and-drop the only input;
- create a dashed upload zone;
- add a modal, toast, overlay, sidebar, or floating uploader;
- redesign the V2 dashboard;
- hide the zero-count summary rail;
- show results before successful validation;
- hide the active dashboard after a failed replacement;
- truncate filenames or errors;
- add operational states beyond EMPTY, ACTIVE, CHECKING, HOLD, and reset confirmation;
- use the full dock or dashboard as a live region;
- add animation beyond the approved CHECKING indicator;
- restore sample inventory after reset; or
- change approved CSV behavior or exact functional messages.

## Implementation Boundary

This document supplies visual decisions only. The implementation plan must use the functional specification for every CSV schema, parser, validator, result, headline, and reset rule. It must preserve the approved V2 dashboard beneath the dock once inventory is active.
