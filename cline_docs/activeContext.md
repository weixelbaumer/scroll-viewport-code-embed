# Active Context

## Current Task

**Paused.** Pending external investigation by the user into the Forge Custom UI environmental conflict (`TypeError: Cannot read properties of null (reading 'useState')`).

## Recent Changes

*   Attempted "Ultra-Minimal ACE" approach; failed due to persistent Confluence editor errors.
*   Pivoted to Atlassian Forge migration (`poc/forge-migration` branch).
*   Created initial Forge Custom UI app (`scroll-github-fetcher`).
*   Diagnosed React `useState` errors occurring immediately upon inserting the Custom UI macro in the Confluence editor.
*   Created diagnostic Forge UI Kit app (`scroll-github-fetcher-uikit`) which inserted successfully, isolating the issue to the Custom UI environment.
*   Attempted diagnostic steps within Custom UI app (`scroll-github-fetcher`):
    *   Bypassed React rendering using plain JavaScript (`plain-app.js`).
    *   Attempted rendering static HTML directly.
    *   The `useState` error persisted even with static HTML, confirming the issue is external to the app's code and likely related to the Forge/Confluence editor environment interaction.
*   Reverted diagnostic changes, leaving the Custom UI app in the non-functional "Plain JavaScript" state.
*   Committed latest changes to `poc/forge-migration` branch.

## Error Details

*   **Primary Blocker:** `TypeError: Cannot read properties of null (reading 'useState')` occurs in the browser console when inserting the Forge **Custom UI** macro (`scroll-github-fetcher`) into the Confluence editor. This happens regardless of the code within the Custom UI iframe (React, plain JS, static HTML), indicating an environmental conflict preventing the iframe's context from initializing correctly.
*   **Secondary (ACE):** The original ACE app consistently failed with `POST https://apryse.atlassian.net/wiki/rest/internal/1.0/macro/placeholder 400 (Bad Request)` during macro saving/preview.

## Next Steps

1.  **User Action:** Investigate the Forge Custom UI environmental conflict externally (e.g., check Confluence version, other app conflicts, Atlassian Developer Community/Support). Provide details about the persistent `useState` error.
2.  **Resume:** Based on the investigation findings, decide whether to:
    *   Fix the Custom UI conflict and continue developing `scroll-github-fetcher` (preferred for syntax highlighting).
    *   Switch to the UI Kit app (`scroll-github-fetcher-uikit`) and accept limitations (no easy syntax highlighting).
    *   Re-evaluate other approaches if necessary.