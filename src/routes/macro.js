const express = require('express');
const util = require('util'); // Keep util for potential future debugging if needed
const jwt = require('jsonwebtoken'); // Keep JWT library if needed elsewhere

// Define helper functions directly in this file or ensure they are imported correctly
// Assuming these were defined later in the original file based on previous reads

// Helper function to escape HTML attribute values
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to escape HTML content
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;")
     .replace(/'/g, "&#039;");
}

// URL validation and transformation utility
function validateAndTransformGitHubUrl(url) {
  // Basic validation
  if (!url) {
    throw new Error('GitHub URL is required');
  }
  console.log(`[validateAndTransformGitHubUrl] Original URL: ${url}`);

  // Handle potential theme/lines appended with :: or : (remove them)
  let cleanUrl = url.split('::')[0]; // Remove theme if present
  const lastColonIndex = cleanUrl.lastIndexOf(':');
  if (lastColonIndex > cleanUrl.indexOf('://') + 3) {
      const afterLastColon = cleanUrl.substring(lastColonIndex + 1).trim();
      if (/^[0-9,-]+$/.test(afterLastColon)) { // Check if it looks like line numbers
          cleanUrl = cleanUrl.substring(0, lastColonIndex);
          console.log(`[validateAndTransformGitHubUrl] Removed line numbers: ${cleanUrl}`);
      }
  }

  // Handle raw GitHub URLs directly
  if (cleanUrl.includes('raw.githubusercontent.com')) {
    console.log(`[validateAndTransformGitHubUrl] Using raw URL: ${cleanUrl}`);
    return { url: cleanUrl }; // Return object structure
  }

  // Handle normal GitHub URLs
  if (cleanUrl.includes('github.com')) {
    // Convert regular GitHub URLs to raw URLs
    const rawUrl = cleanUrl.replace(/https?:\/\/github\.com/i, 'https://raw.githubusercontent.com')
                           .replace('/blob/', '/');
    console.log(`[validateAndTransformGitHubUrl] Converted to raw URL: ${rawUrl}`);
    return { url: rawUrl }; // Return object structure
  }

  // Handle URLs starting with github.com
   if (cleanUrl.startsWith('github.com')) {
     const rawUrl = `https://raw.githubusercontent.com${cleanUrl.substring(10).replace('/blob/', '/')}`;
     console.log(`[validateAndTransformGitHubUrl] Converted from prefix: ${rawUrl}`);
     return { url: rawUrl };
   }

  throw new Error('Invalid GitHub URL format: ' + url);
}

// Function to extract specific lines from code
function extractLines(code, lineRange) {
  if (!lineRange) return code; // No range specified

  const lines = code.split('\n');
  let selectedLines = [];
  try {
    const ranges = lineRange.split(',');
    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= lines.length) {
           // Adjust to 0-based index, ensure end doesn't exceed array bounds
           selectedLines = selectedLines.concat(lines.slice(start - 1, Math.min(end, lines.length)));
        } else {
            console.warn(`[extractLines] Invalid range format: ${range}`);
        }
      } else {
        const lineNum = Number(range);
         if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
           // Adjust to 0-based index
           selectedLines.push(lines[lineNum - 1]);
         } else {
             console.warn(`[extractLines] Invalid line number: ${range}`);
         }
      }
    }
    // Remove duplicates and join
    return [...new Set(selectedLines)].join('\n');
  } catch (error) {
    console.error(`[extractLines] Error parsing line range "${lineRange}":`, error.message);
    return code; // Return original code on error
  }
}

// Function to fetch content from GitHub
async function fetchGitHubContent(url, lines) {
    const fetch = (await import('node-fetch')).default;
    console.log(`[fetchGitHubContent] Fetching: ${url}`);
    // Assuming githubConfig is defined globally in server.js or passed differently
    // For simplicity here, let's assume no auth token needed for public repos
    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[fetchGitHubContent] GitHub API error ${response.status}: ${errorText}`);
        throw new Error(`GitHub fetch failed (${response.status}) for ${url}`);
    }

    let code = await response.text();
    console.log(`[fetchGitHubContent] Fetched ${code.length} characters. Applying lines: ${lines}`);
    if (lines) {
        code = extractLines(code, lines);
    }
    return code;
}

// Function to detect language from URL
function detectLanguageFromUrl(url) {
    const extensionMatch = url.match(/\.([^.]+)$/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase().split('?')[0] : ''; // Remove query params if any
    const extensions = {
        js: 'javascript', ts: 'typescript', py: 'python', java: 'java', rb: 'ruby',
        php: 'php', cs: 'csharp', go: 'go', rs: 'rust', cpp: 'cpp', c: 'c',
        html: 'html', css: 'css', md: 'markdown', json: 'json', yml: 'yaml',
        yaml: 'yaml', xml: 'xml', sh: 'bash', bash: 'bash', sql: 'sql', kt: 'kotlin',
        swift: 'swift', jsx: 'javascript', tsx: 'typescript'
     };
    console.log(`[detectLanguageFromUrl] Detected extension '${extension}', language '${extensions[extension] || 'plaintext'}' for URL: ${url}`);
    return extensions[extension] || 'plaintext';
}

// Function to get theme CSS (replace with actual implementation or import)
function getThemeStyles(theme) {
    // Placeholder - replace with actual style fetching/generation
    console.log(`[getThemeStyles] Generating styles for theme: ${theme}`);
    // Example: return require('highlight.js/styles/' + theme + '.css');
    // For now, return empty string or basic styles
    return `/* Styles for theme ${theme} */`;
}

// Function to highlight code
function highlightCode(code, language) {
    try {
        // Assuming 'highlight' is the highlight.js instance, potentially passed or required
        if (typeof highlight === 'undefined') {
             console.error("highlight.js instance not available in highlightCode function!");
             return escapeHtml(code); // Fallback
        }
        console.log(`[highlightCode] Highlighting with language: ${language}`);
        if (language && language !== 'plaintext' && highlight.getLanguage(language)) {
            return highlight.highlight(code, { language: language, ignoreIllegals: true }).value;
        } else {
            console.log(`[highlightCode] Language '${language}' not found or plaintext, using plaintext highlighting.`);
            return highlight.highlight(code, { language: 'plaintext' }).value;
        }
    } catch (e) {
        console.error("[highlightCode] Highlighting error:", e);
        return escapeHtml(code); // Return escaped code on error
    }
}


module.exports = function(addon) { // Export a function that accepts addon
  const router = express.Router();

  // Supported themes (keep for reference or default)
  const THEMES = {
      GITHUB_LIGHT: 'github-light', GITHUB_DARK: 'github-dark', MONOKAI: 'monokai',
      DRACULA: 'dracula', VS2015: 'vs2015', XCODE: 'xcode', ATOM_DARK: 'atom-one-dark'
  };
  const DEFAULT_THEME = 'github-light'; // Define default theme

  // Use addon.authenticate() for standard JWT verification for installed apps
  router.get('/render-github-macro', addon.authenticate(), async (req, res) => {
    console.log(`[DEBUG /render-github-macro] Authentication successful. Context clientKey: ${req.context ? req.context.clientKey : 'undefined'}`);
    console.log(`[DEBUG /render-github-macro] Request URL: ${req.originalUrl || req.url}`);
    console.log('[DEBUG /render-github-macro] Received req.query:', JSON.stringify(req.query, null, 2));

    // --- Get parameters ONLY from req.query ---
    const { url, lines, theme = DEFAULT_THEME } = req.query;
    console.log(`[DEBUG] Using Params from req.query - URL: ${url}, Lines: ${lines}, Theme: ${theme}`);
    // -----------------------------------------

    if (!url) {
        return res.status(400).json({
            error: 'Missing GitHub URL parameter',
            details: 'The GitHub URL parameter was not found in the request query string.',
            receivedQuery: req.query,
            html: `<div style="color: red; border: 1px solid red; padding: 10px;">Error: Missing GitHub URL parameter.</div>`
        });
    }

    // --- Fetch and Render Code Server-Side ---
    try {
        let transformed;
        try {
            transformed = validateAndTransformGitHubUrl(url);
        } catch (validationError) {
             console.error(`[GET /app/render-github-macro] URL validation error: ${validationError.message}`);
             return res.status(400).json({
                 error: 'Invalid GitHub URL',
                 details: validationError.message,
                 html: `<div style="color: red; border: 1px solid red; padding: 10px;">Error: Invalid GitHub URL - ${escapeHtml(validationError.message)}</div>`
             });
        }

        const rawUrl = transformed.url;
        const effectiveLines = lines; // Use lines directly from query
        const effectiveTheme = theme; // Use theme directly from query

        console.log(`[DEBUG] Fetching content from: ${rawUrl}`);
        const code = await fetchGitHubContent(rawUrl, effectiveLines);

        console.log(`[DEBUG] Highlighting code with theme: ${effectiveTheme}`);
        const language = detectLanguageFromUrl(rawUrl);
        const highlightedCode = highlightCode(code, language);
        const themeStyles = getThemeStyles(effectiveTheme);

        const finalHtml = `
          <style>${themeStyles}</style>
          <div class="code-block hljs ${effectiveTheme}">
            <pre><code>${highlightedCode}</code></pre>
          </div>
        `;

        res.json({
            html: finalHtml,
            width: '100%'
        });

    } catch (error) {
        console.error(`[GET /app/render-github-macro] Error processing request for ${url}:`, error);
         res.status(500).json({
            error: 'Failed to fetch or render code',
            details: error.message,
            html: `<div style="color: red; border: 1px solid red; padding: 10px;">Error: ${escapeHtml(error.message)}</div>`
        });
    }
    // ------------------------------------------
  });

  return router; // Return the configured router
};