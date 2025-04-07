# Plan: Ultra-Minimal ACE + Client-Side Rendering (Final Attempt)

This plan focuses *only* on the Scroll Viewport rendering path described in the original documentation, making the ACE server do almost nothing except authenticate and output the trigger element for the client-side script.

**Assumptions:**

*   The client-side script (`public/theme-script.js` or similar) *can* still be loaded and executed within the Scroll Viewport environment (e.g., via theme configuration or global custom HTML).
*   Scroll Viewport does *not* filter out the specific hidden anchor tag (`<a class="github-code-anchor" ...>`) *before* the client-side script has a chance to find it.
*   The client-side fetching limitations (public repos only unless complex auth is added client-side, user rate limits, potential CORS) are acceptable for this attempt.

**The Plan:**

1.  **Refactor ACE Server Endpoint (`src/routes/macro.js` or equivalent):**
    *   Gut the Endpoint: Remove *all* existing logic related to fetching from GitHub, applying syntax highlighting, handling standard Confluence views, or interacting with `/macro/placeholder`.
    *   Authenticate Only: Keep only the essential ACE authentication middleware (`addon.checkValidToken()` or similar).
    *   Always Return Anchor: The endpoint's *only* job after authentication is to retrieve the saved macro parameters (GitHub URL, lines, theme) and return *only* the static hidden anchor tag structure.
        *   Example Output: `<a href="#" class="github-code-anchor" style="display:none;" data-url="{SAVED_GITHUB_URL}" data-lines="{SAVED_LINES}" data-theme="{SAVED_THEME}"></a>`
        *   Crucially: No server-side API calls, no dynamic content generation beyond inserting the saved parameters into the static string.

2.  **Verify Client-Side Script (`public/theme-script.js`):**
    *   Ensure this script exists and contains the necessary logic:
        *   Finds `.github-code-anchor` elements.
        *   Reads `data-url`, `data-lines`, `data-theme`.
        *   Fetches code from GitHub (client-side `fetch`).
        *   Applies line filtering.
        *   Uses `highlight.js` (must be bundled or loaded separately).
        *   Replaces the anchor tag with the rendered `<pre><code>...</code></pre>` block.
        *   Includes basic error handling.

3.  **Confirm Script Loading (Manual Task/Verification):**
    *   Verify *how* `theme-script.js` is loaded within Scroll Viewport.

4.  **Clean Up:**
    *   Remove unused server-side utility files.
    *   Remove unused dependencies from `package.json`.

5.  **Testing:**
    *   Deploy the ultra-minimal ACE app.
    *   Add/edit the macro.
    *   View the page *only* within the Scroll Viewport theme.
    *   Check 1: Verify hidden `<a>` tag exists initially in HTML source.
    *   Check 2: Check browser console for script errors.
    *   Check 3: Verify if code block renders.
    *   Expected Failure: If *any* step fails (ACE auth error, anchor filtered, script not loaded, script error, client fetch error), this approach fails.

**Success Condition:** The code renders correctly within Scroll Viewport via the client-side script.
**Failure Condition:** The code does not render, OR any ACE-related errors occur during the process. If this fails, proceed to Forge migration.