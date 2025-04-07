/**
 * GitHub Code Renderer
 * A simple service to render GitHub code snippets with syntax highlighting
 * for embedding in Confluence with Scroll Viewport
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const highlight = require('highlight.js'); // Make sure highlight.js is available
const cache = require('memory-cache');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const ace = require('atlassian-connect-express');
const bodyParser = require('body-parser');
const http = require('http');

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000; // Default port 3000
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 1800000; // Default: 30 minutes
const DEBUG = process.env.DEBUG === 'true';
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'github-light'; // Ensure default theme matches options

// Initialize express
const app = express();

// --- Explicitly serve descriptor EARLY ---
app.get('/atlassian-connect.json', (req, res) => {
  const descriptorPath = path.join(__dirname, 'atlassian-connect.json');
  fs.readFile(descriptorPath, (err, data) => {
    if (err) {
      console.error("Error reading atlassian-connect.json:", err);
      res.status(500).send('Could not read descriptor file');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(data);
    }
  });
});
// ------------------------------------

// --- Add Body Parsers EARLY ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// ---------------------------

// Ensure database directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Set database path
const dbPath = path.resolve(dbDir, 'database.sqlite'); // Ensure absolute path
console.log("Database will be created at (absolute):", dbPath);

// Ensure the 'db' directory exists, but let ACE handle the file content.
const config = {
  config: {
    development: {
      port: 3000,
      localBaseUrl: process.env.AC_LOCAL_BASE_URL || 'https://dev.tandav.com',
      store: {
        dialect: 'sqlite',    // Explicitly set dialect for SQLite file storage
        storage: dbPath,      // Path to the SQLite file (now absolute)
        logging: false        // Disable Sequelize logging
      },
      watch: false
    },
    production: {
      port: process.env.PORT || 3000,
      store: {
        adapter: 'sequelize',
        dialect: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: true,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }
    }
  }
};

console.log("ACE configuration:", JSON.stringify(config, null, 2));
console.log("Attempting ACE initialization...");
let addon; // Declare addon variable outside try block
try {
  addon = ace(app, config);
  console.log("ACE initialization completed successfully.");

  // *** Add ACE Event Listeners for Debugging ***
  addon.on('host_settings_saved', (clientKey, data) => {
    console.log(`[ACE EVENT] host_settings_saved triggered for clientKey: ${clientKey}`);
    console.log(`[ACE EVENT] Saved data (partial):`, { baseUrl: data.baseUrl, sharedSecretExists: !!data.sharedSecret });
  });

  addon.on('host_settings_removed', (clientKey) => {
    console.log(`[ACE EVENT] host_settings_removed triggered for clientKey: ${clientKey}`);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[PROCESS EVENT] Unhandled Rejection at:', promise, 'reason:', reason);
  });
  // *** End ACE Event Listeners ***

} catch (err) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("FATAL ERROR DURING ACE INITIALIZATION:");
  console.error(err);
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  process.exit(1); // Exit if ACE fails
}

// Check if addon was initialized before proceeding
if (!addon) {
  console.error("ACE addon object failed to initialize. Cannot continue.");
  process.exit(1); // Exit if addon is not valid
}

// --- Serve Static Files EARLY ---
app.use(express.static(path.join(__dirname, 'public')));
// -----------------------------

// Log the specific store config being used
console.log(`ACE Initialized. Active environment: [${addon.config.environment()}]`);
console.log(`Store configuration being used:`, JSON.stringify(addon.config.store(), null, 2));

// Add authentication middleware for install/uninstall callbacks AFTER static files
// Using implicit handling by ACE.
app.use(addon.authenticateInstall());

// NOTE: Removed explicit lifecycle routes. Using implicit handling via middleware above.

// --- Mount Application Routes (ACE Authenticated) ---
// This route is likely NOT USED with the static macro approach but kept for reference
const macroRoutes = require('./src/routes/macro')(addon);
app.use('/app', macroRoutes);
// --------------------------------------------------

// --- Helper Functions ---
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
     .replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;") // Corrected replacement for double quote
     .replace(/'/g, "&#039;"); // HTML entity for single quote
}
function validateAndTransformGitHubUrl(url) {
  if (!url) throw new Error('GitHub URL is required');
  let cleanUrl = url.split('::')[0];
  const lastColonIndex = cleanUrl.lastIndexOf(':');
  if (lastColonIndex > cleanUrl.indexOf('://') + 3) {
      const afterLastColon = cleanUrl.substring(lastColonIndex + 1).trim();
      if (/^[0-9,-]+$/.test(afterLastColon)) { cleanUrl = cleanUrl.substring(0, lastColonIndex); }
  }
  if (cleanUrl.includes('raw.githubusercontent.com')) return { url: cleanUrl };
  if (cleanUrl.includes('github.com')) {
    const rawUrl = cleanUrl.replace(/https?:\/\/github\.com/i, 'https://raw.githubusercontent.com').replace('/blob/', '/');
    return { url: rawUrl };
  }
   if (cleanUrl.startsWith('github.com')) {
     const rawUrl = `https://raw.githubusercontent.com${cleanUrl.substring(10).replace('/blob/', '/')}`;
     return { url: rawUrl };
   }
  throw new Error('Invalid GitHub URL format: ' + url);
}
function extractLines(code, lineRange) {
  if (!lineRange) return code;
  const lines = code.split('\n');
  let selectedLines = [];
  try {
    const ranges = lineRange.split(',');
    for (const range of ranges) {
      if (range.includes('-')) {
        const [start, end] = range.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= lines.length) {
           selectedLines = selectedLines.concat(lines.slice(start - 1, Math.min(end, lines.length)));
        }
      } else {
        const lineNum = Number(range);
         if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
           selectedLines.push(lines[lineNum - 1]);
         }
      }
    }
    return [...new Set(selectedLines)].join('\n');
  } catch (error) { console.error(`[extractLines] Error:`, error.message); return code; }
}
async function fetchGitHubContent(url, lines) {
    const fetch = (await import('node-fetch')).default;
    const fetchOptions = typeof githubConfig !== 'undefined' ? githubConfig : {};
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub fetch failed (${response.status}) for ${url}: ${errorText}`);
    }
    let code = await response.text();
    if (lines) { code = extractLines(code, lines); }
    return code;
}
function detectLanguageFromUrl(url) {
    const extensionMatch = url.match(/\.([^.?]+)(\?|$)/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    const extensions = { js: 'javascript', ts: 'typescript', py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp', go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', html: 'html', css: 'css', md: 'markdown', json: 'json', yml: 'yaml', yaml: 'yaml', xml: 'xml', sh: 'bash', bash: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift', jsx: 'javascript', tsx: 'typescript' };
    return extensions[extension] || 'plaintext';
}
function getThemeStyles(theme) {
    const backgrounds = { 'github-dark': '#0d1117', 'monokai': '#272822', 'dracula': '#282a36', 'vs2015': '#1e1e1e', 'atom-one-dark': '#282c34' };
    const colors = { 'github-dark': '#c9d1d9', 'monokai': '#f8f8f2', 'dracula': '#f8f8f2', 'vs2015': '#d4d4d4', 'atom-one-dark': '#abb2bf' };
    const bgColor = backgrounds[theme] || '#ffffff';
    const color = colors[theme] || '#24292e';
    return `.hljs { display: block; overflow-x: auto; padding: 0.5em; background: ${bgColor}; color: ${color}; }`; // Basic styles
}
function highlightCode(code, language) {
    try {
        if (language && language !== 'plaintext' && highlight.getLanguage(language)) {
            return highlight.highlight(code, { language: language, ignoreIllegals: true }).value;
        }
        return highlight.highlight(code, { language: 'plaintext' }).value;
    } catch (e) { console.error("[highlightCode] Error:", e); return escapeHtml(code); }
}
// -----------------------------------------

// --- Endpoint for Client-Side Rendering ---
// Called by theme-script.js to get the final HTML (No ACE Auth needed)
app.get('/html', async (req, res) => {
  const { url, lines, theme = DEFAULT_THEME } = req.query;
  console.log(`[GET /html] Received request - URL: ${url}, Lines: ${lines}, Theme: ${theme}`);
  if (!url) return res.status(400).send('Error: Missing URL parameter.');

  try {
    let transformed;
    try { transformed = validateAndTransformGitHubUrl(url); }
    catch (validationError) { return res.status(400).send(`<pre style="color: red;">Error: Invalid GitHub URL - ${escapeHtml(validationError.message)}</pre>`); }

    const rawUrl = transformed.url;
    const code = await fetchGitHubContent(rawUrl, lines);
    const language = detectLanguageFromUrl(rawUrl);
    const highlightedCode = highlightCode(code, language);
    const themeStyles = getThemeStyles(theme);

    const finalHtml = `<style>${themeStyles}</style><pre><code>${highlightedCode}</code></pre>`;

    res.setHeader('Content-Type', 'text/html');
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.send(finalHtml);
  } catch (error) {
    console.error(`[GET /html] Error processing request for ${url}:`, error);
    res.status(500).send(`<pre style="color: red; border: 1px solid red; padding: 10px;">Error fetching or rendering code:\n${escapeHtml(error.message)}</pre>`);
  }
});
// -----------------------------------------

// --- Mount Other Non-ACE Routes ---
app.get('/dummy-trigger.png', (req, res) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  res.set({ 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-cache, no-store', 'ngrok-skip-browser-warning': 'true' });
  res.send(png);
});

// GitHub API configuration
const githubConfig = {};
if (process.env.GITHUB_TOKEN) {
  githubConfig.headers = { 'Authorization': `token ${process.env.GITHUB_TOKEN}` };
  console.log('GitHub token configured for server-side fetches.');
}

// Main route for documentation
app.get('/', (req, res) => { res.redirect('/documentation.html'); });

// --- Start Server ---
http.createServer(app).listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (addon.config.localBaseUrl()) {
      console.log(`Atlassian Connect Base URL should be set to: ${addon.config.localBaseUrl()}`);
  }
});