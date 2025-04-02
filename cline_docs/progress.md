# Progress

## What Works (Assumed based on README)

-   Basic Confluence macro functionality (installation, adding to page).
-   Fetching code from public GitHub repositories.
-   Rendering code with syntax highlighting in standard Confluence view.
-   The mechanism for detecting Scroll Viewport context (likely via HTTP header).
-   The server-side logic for rendering the hidden anchor element for Scroll Viewport.
-   The client-side script (`theme-script.js`) exists to handle the anchor detection and client-side rendering (though its correct functioning is uncertain given the current error).

## What's Left / Not Working

-   **Macro Saving/Rendering Error:** The core issue identified in `activeContext.md`. The macro fails during the save/render process, specifically when interacting with the Confluence `/rest/internal/1.0/macro/placeholder` endpoint. This results in a `400 Bad Request` and a subsequent `TypeError` when trying to access `parameters` on an undefined object.
-   **Scroll Viewport Rendering:** While the mechanism is described, the current error prevents successful rendering, potentially specifically within the Scroll Viewport context or during the process that supports it.
-   **Error Handling:** The code lacks robust error handling around the placeholder ADF fetching and processing, leading to the uncaught TypeError.

## Status

**Blocked.** Cannot proceed with normal macro functionality or further development until the `400 Bad Request` and subsequent `TypeError` are resolved. The immediate focus must be on debugging this error flow.