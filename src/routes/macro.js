const express = require('express');

// Helper function to escape HTML attribute values - needed for data attributes
function escapeAttr(str) {
  if (!str) return '';
  // Corrected escaping
  return String(str)
    .replace(/&amp;/g, '&amp;amp;') // Escape ampersands first
    .replace(/</g, '&amp;lt;')
    .replace(/>/g, '&amp;gt;')
    .replace(/"/g, '&amp;quot;')
    .replace(/'/g, '&#39;');
}

module.exports = function(addon) { // Export a function that accepts addon
  const router = express.Router();

  // Define default theme (can be used if parameter is missing)
  const DEFAULT_THEME = 'github-light';

  // Use addon.authenticate() for standard JWT verification for installed apps
  router.get('/render-github-macro', addon.authenticate(), (req, res) => {
    // Log entry point and context for debugging potential auth/context issues
    console.log(`[Minimal ACE /render-github-macro] Request received. Authenticated.`);

    // Check for essential context properties needed to retrieve parameters
    // These properties are typically populated by ACE middleware based on the JWT token
    if (!req.context || !req.context.extension || !req.context.extension.macro || !req.context.extension.macro.params) {
        console.error('[Minimal ACE /render-github-macro] Error: Macro context or parameters not found in request. Check JWT and context population.');
        // Return an empty response or an error indicator if context is missing
        // Avoid complex HTML here to minimize potential filtering by Scroll Viewport
        return res.status(500).send('<!-- Macro context error -->');
    }

    // Get parameters from the saved macro context
    // IMPORTANT: The parameter names here MUST match what the macro editor saves.
    // Check public/macro-editor.html or atlassian-connect.json if unsure.
    // Assuming 'githubUrl', 'lineRange', 'codeTheme' based on previous context/attempts.
    const params = req.context.extension.macro.params;
    const githubUrl = params.githubUrl || ''; // Use saved param name, default to empty
    const lineRange = params.lineRange || ''; // Use saved param name, default to empty
    const codeTheme = params.codeTheme || DEFAULT_THEME; // Use saved param name, default

    console.log(`[Minimal ACE /render-github-macro] Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${codeTheme}'`);

    // Construct the static anchor tag HTML
    // Ensure class name matches what theme-script.js expects (e.g., "github-code-anchor")
    // Use the escapeAttr function defined above for data attributes
    // Ensure the HTML is properly escaped for direct sending
    const anchorHtml = `<a href="#" class="github-code-anchor" style="display:none;" data-url="${escapeAttr(githubUrl)}" data-lines="${escapeAttr(lineRange)}" data-theme="${escapeAttr(codeTheme)}"></a>`;

    console.log('[Minimal ACE /render-github-macro] Sending anchor HTML:', anchorHtml);

    // Send the raw HTML string as the response using res.send()
    // Set content type explicitly to text/html
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(anchorHtml);
  });

  return router; // Return the configured router
};