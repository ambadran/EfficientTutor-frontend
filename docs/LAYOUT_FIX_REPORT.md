# Tuition Log Layout Fix Report

**Date:** December 16, 2025
**Module:** `js/ui/templates.js`
**Issue:** Parent Tuition Logs layout instability (misaligned columns, hidden content, stacking).

## The Problem
The Tuition Log UI was originally designed using a **Responsive CSS Grid** (`grid-cols-2` on mobile, `grid-cols-6` on desktop). This approach failed repeatedly in the user's environment for several reasons:

1.  **"Ghost Classes":** Tailwind CSS generates styles on demand. The specific utility classes needed for the advanced grid layout (e.g., `md:grid-cols-12`, `md:w-1/6`, `md:block`) were likely missing from the pre-generated CSS bundle. As a result, the browser ignored them, defaulting to the mobile "stacked" layout even on desktop.
2.  **Breakpoint Failures:** The visibility toggles (`md:hidden` vs `hidden md:block`) relied on the `md` (768px) breakpoint. Due to the missing classes or environmental factors, *both* sets of classes often failed to trigger correctly, leaving content either stacked in a single column or completely invisible.
3.  **Flex/Grid Conflicts:** Attempts to mix Flexbox and Grid on the same container caused "squishing" and misalignment because `justify-between` cannot align columns *across* different rows (records).

## The Solution: "The Nuclear Option"

To guarantee a stable, aligned layout regardless of CSS build state or screen size, we abandoned the responsive "Card vs. Table" switching strategy in favor of a **Unified Native Table** approach.

### Key Changes

1.  **Native HTML Table:**
    *   Switched from `<div>` grids to standard `<table>`, `<thead>`, and `<tbody>` elements.
    *   **Why:** HTML tables enforce column alignment natively. Column 1 in Row A will *always* align with Column 1 in Row B, without needing specific width classes or grid definitions.

2.  **Scrollable Container (`overflow-x-auto`):**
    *   Wrapped the table in a container with `overflow-x-auto`.
    *   Applied `min-w-[800px]` to the table itself.
    *   **Why:** This ensures the table *always* renders its full 6-column structure. On desktop, it fits perfectly. On mobile, instead of breaking into a stacked card (which requires complex CSS), it simply allows the user to scroll horizontally. This is a standard, robust pattern for data-heavy views.

3.  **Removed Visibility Toggles:**
    *   Removed all `hidden`, `md:block`, and `md:hidden` classes from the log row renderer.
    *   **Why:** This eliminates the risk of content disappearing. The data is always in the DOM, always visible.

### Code Refactor
*   **`renderDesktopLogRow`**: Created this helper to render a clean `<tr>` with 6 `<td>` cells.
*   **`renderLogsPage` & `updateParentLogsContent`**: Updated to generate *only* this table structure, removing the logic that tried to generate a separate "Mobile Card" view.

### Result
*   **Stability:** The layout is now unbreakable. It does not depend on specific Tailwind breakpoint classes being present.
*   **Alignment:** Columns (Subject, Teacher, Date, Duration, Cost, Status) are perfectly aligned.
*   **Visibility:** All data fields are always visible on all devices.
