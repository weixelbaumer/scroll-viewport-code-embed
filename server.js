/**
 * GitHub Code Renderer
 * A simple service to render GitHub code snippets with syntax highlighting
 * for embedding in Confluence with Scroll Viewport
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const highlight = require('highlight.js');
const cache = require('memory-cache');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000;
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 1800000; // Default: 30 minutes
const DEBUG = process.env.DEBUG === 'true';
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'github';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const NGROK_URL = process.env.NGROK_URL || '';

// Complete ngrok bypass script - more comprehensive version
const NGROK_BYPASS_SCRIPT = `
// Try to break out of iframe if we're in one - this helps bypass ngrok warnings
(function() {
  // This attempts to break out of ANY iframe - useful for bypassing ngrok warning
  if (window !== window.top) {
    try {
      // Try to break out of the iframe
      window.top.location.href = window.location.href;
    } catch(e) {
      console.error("Failed to break out of iframe:", e);
    }
  }
})();

// Override ngrok warning functions
window.ngrokCheckParentFrameIsNotNgrok = function() { return true; };
window.ngrokWarnUserIfParentFrameIsNgrok = function() { return false; };

// Also override any other potential ngrok warning mechanisms
if (window.self) {
  window.self.ngrokCheckParentFrameIsNotNgrok = function() { return true; };
  window.self.ngrokWarnUserIfParentFrameIsNgrok = function() { return false; };
}

// Prevent any future redefinitions
Object.defineProperty(window, 'ngrokCheckParentFrameIsNotNgrok', {
  value: function() { return true; },
  writable: false,
  configurable: false
});

Object.defineProperty(window, 'ngrokWarnUserIfParentFrameIsNgrok', {
  value: function() { return false; },
  writable: false,
  configurable: false
});

// SPECIFIC HANDLER FOR THE CURRENT NGROK WARNING PAGE
// Based on the screenshot, the warning page has a button with text "Visit Site"
function bypassNgrokWarningPage() {
  console.log("⚠️ Attempting to bypass ngrok warning");
  
  // First - check if we're on the ngrok warning page
  const isNgrokWarningPage = 
    document.body && 
    document.body.textContent && 
    document.body.textContent.includes("ngrok.com") &&
    document.body.textContent.includes("Visit Site");
  
  if (!isNgrokWarningPage) {
    console.log("Not on ngrok warning page");
    return false;
  }
  
  console.log("✅ Detected ngrok warning page, attempting bypass");
  
  // Try to find the specific Visit Site button from the screenshot
  // The closest element seen in the screenshot is a blue button at the bottom
  try {
    // Find all links that look like buttons
    const visitSiteLinks = Array.from(document.querySelectorAll('a.button, a.btn, button, a[role="button"]'));
    for (const link of visitSiteLinks) {
      if (link.textContent && link.textContent.trim() === 'Visit Site') {
        console.log('🎯 Found Visit Site button, clicking it!');
        link.click();
        return true;
      }
    }
    
    // Look more broadly for links
    const allLinks = Array.from(document.getElementsByTagName('a'));
    for (const link of allLinks) {
      if (link.textContent && link.textContent.trim() === 'Visit Site') {
        console.log('🔍 Found Visit Site link, clicking it!');
        link.click();
        return true;
      }
    }
    
    // Look for any element with that text and click it
    const allElements = Array.from(document.querySelectorAll('*'));
    for (const element of allElements) {
      if (element.textContent && element.textContent.trim() === 'Visit Site') {
        console.log('⚡ Found element with Visit Site text, clicking!');
        element.click();
        return true;
      }
    }
    
    // Direct DOM modification - find the element with class="button"
    // From the screenshot we can see it's a blue button with this styling
    const blueButtons = Array.from(document.querySelectorAll('.button, .btn'));
    for (const button of blueButtons) {
      console.log('💥 Found a button element, clicking it: ', button.textContent);
      button.click();
      return true;
    }
    
    console.log('❌ Could not find Visit Site button');
    return false;
  } catch (error) {
    console.error('Error bypassing ngrok warning:', error);
    return false;
  }
}

// Try to bypass on page load and repeatedly
function attemptBypass() {
  bypassNgrokWarningPage();
  
  // Try again a few times with increasing delays
  setTimeout(bypassNgrokWarningPage, 300);
  setTimeout(bypassNgrokWarningPage, 600);
  setTimeout(bypassNgrokWarningPage, 1000);
  setTimeout(bypassNgrokWarningPage, 2000);
}

// Run as soon as possible
attemptBypass();

// Also run when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attemptBypass);
} else {
  attemptBypass();
}

// And when the page has loaded
window.addEventListener('load', attemptBypass);

// Fallback to the older methods if needed
// Auto-click the "Visit Site" button - without jQuery dependencies
function clickVisitSiteButton() {
  // Try multiple selector strategies for the "Visit Site" button
  const selectors = [
    'a.button', 
    'button.button', 
    'a.btn', 
    'button.btn', 
    '[role="button"]',
    // More specific selectors based on the screenshot
    '#visit-site',
    '.visit-site'
  ];
  
  // Try each selector
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (element.textContent && element.textContent.trim() === 'Visit Site') {
          console.log('Found Visit Site button, clicking it');
          element.click();
          return true;
        }
      }
    } catch (e) {
      console.error('Error with selector:', selector, e);
    }
  }
  
  // Find any links with the text 'Visit Site'
  try {
    const links = document.getElementsByTagName('a');
    for (const link of links) {
      if (link.textContent && link.textContent.trim() === 'Visit Site') {
        console.log('Found Visit Site link, clicking it');
        link.click();
        return true;
      }
    }
  } catch (e) {
    console.error('Error finding Visit Site link:', e);
  }
  
  // Find any buttons with the text 'Visit Site'
  try {
    const buttons = document.getElementsByTagName('button');
    for (const button of buttons) {
      if (button.textContent && button.textContent.trim() === 'Visit Site') {
        console.log('Found Visit Site button, clicking it');
        button.click();
        return true;
      }
    }
  } catch (e) {
    console.error('Error finding Visit Site button:', e);
  }
  
  // Last resort: look for any element with "Visit Site" text
  try {
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.textContent && element.textContent.trim() === 'Visit Site') {
        console.log('Found Visit Site text, clicking element');
        element.click();
        // Also try parent element
        if (element.parentElement) {
          element.parentElement.click();
        }
        return true;
      }
    }
  } catch (e) {
    console.error('Error with all elements search:', e);
  }
  
  return false;
}

// Try repeatedly to find and click the button
let visitSiteAttempts = 0;
function tryClickVisitSite() {
  if (visitSiteAttempts++ < 20) { // Increase attempts
    if (!clickVisitSiteButton()) {
      setTimeout(tryClickVisitSite, 300); // More frequent checks
    }
  }
}

// Try immediately
tryClickVisitSite();

// Also try when the DOM is ready and when the page has fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryClickVisitSite);
} else {
  tryClickVisitSite();
}
window.addEventListener('load', tryClickVisitSite);

// Direct modification of the page if it's the ngrok warning
setTimeout(function() {
  // Check if we're on the ngrok warning page by looking for specific text
  if (document.body && document.body.textContent.includes('ngrok.com') && 
      document.body.textContent.includes('Visit Site')) {
    
    // Find the Visit Site link/button programmatically
    const links = document.getElementsByTagName('a');
    for (let i = 0; i < links.length; i++) {
      if (links[i].textContent && links[i].textContent.trim() === 'Visit Site') {
        links[i].click();
        break;
      }
    }
  }
}, 1000);
`;

// Initialize express
const app = express();

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  optionsSuccessStatus: 200
}));

// Add ngrok-skip-browser-warning header for all responses
app.use((req, res, next) => {
  // Set proper headers to bypass ngrok warning
  res.setHeader('ngrok-skip-browser-warning', 'true');
  res.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36');
  
  // Set other headers that might help bypass the warning
  res.setHeader('X-Forwarded-For', '127.0.0.1');
  res.setHeader('X-Requested-With', 'XMLHttpRequest');
  
  // Add Access-Control-Allow-Origin header explicitly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');
  
  next();
});

// Middleware to ensure correct content type for JS files
app.use((req, res, next) => {
  const path = req.path;
  if (path.endsWith('.js')) {
    // Store the original send method
    const originalSend = res.send;
    
    // Override the send method
    res.send = function(body) {
      // Set proper JavaScript MIME type
      if (!res.get('Content-Type')) {
        res.set('Content-Type', 'application/javascript; charset=utf-8');
      }
      res.set('X-Content-Type-Options', 'nosniff');
      
      // Call the original send method
      return originalSend.call(this, body);
    };
  }
  next();
});

// Set CORS headers for all routes - more comprehensive version
app.use((req, res, next) => {
  // Essential CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-PINGOTHER');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'credentialless');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Add a special dummy trigger image to help with CORB workarounds
app.get('/dummy-trigger.png', (req, res) => {
  // Create a simple 1x1 transparent PNG
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  
  // Set CORS headers explicitly
  res.set({
    'Content-Type': 'image/png',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'no-cache, no-store',
    'ngrok-skip-browser-warning': 'true'
  });
  
  res.send(png);
});

// GitHub API configuration
const githubConfig = {
  headers: {
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'ngrok-skip-browser-warning': 'true'
  }
};

// Only add token if it exists
if (process.env.GITHUB_TOKEN) {
  githubConfig.headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  console.log('GitHub token configured');
} else {
  console.log('No GitHub token provided. Rate limits for public repositories will apply.');
}

// Main route for documentation 
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>GitHub Code Renderer</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; }
          pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .menu { display: flex; gap: 20px; margin-bottom: 20px; }
          .menu a { padding: 8px 16px; background-color: #f0f0f0; border-radius: 4px; }
          .menu a:hover { background-color: #e0e0e0; text-decoration: none; }
          .card { background-color: #fff; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 20px; margin-bottom: 20px; }
          .alert { padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .alert-danger { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
          .alert-warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; }
          .alert-info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; }
          .btn { display: inline-block; padding: 8px 16px; margin: 5px 0; border-radius: 4px; text-decoration: none; }
          .btn-primary { background-color: #0066cc; color: white; }
          .btn-danger { background-color: #dc3545; color: white; }
          .btn-warning { background-color: #ffc107; color: #333; }
        </style>
      </head>
      <body>
        <h1>GitHub Code Renderer</h1>
        
        <div class="menu">
          <a href="/">Home</a>
          <a href="/direct-embed.html">Direct Embed Tool</a>
          <a href="/scroll-viewport-test.html">Scroll Viewport Demo</a>
          <a href="/scroll-viewport.html">Scroll Viewport Guide</a>
          <a href="/theme/docs.html">Theme Integration</a>
          <a href="/atlassian-connect-bypass.json">Atlassian Connect Descriptor</a>
        </div>
        
        <div class="alert alert-danger">
          <h3 style="margin-top:0">IMPORTANT: Scroll Viewport Users</h3>
          <p>Scroll Viewport <strong>filters out HTML tags</strong> from embedded content!</p>
          <p>Use our special JavaScript solution to bypass this limitation:</p>
          <a href="/scroll-viewport.html" class="btn btn-danger">Scroll Viewport Solution Guide</a>
          <a href="/theme/docs.html" class="btn btn-danger">Theme Integration Guide</a>
          <a href="/scroll-viewport-test.html" class="btn btn-danger">See Working Demo</a>
        </div>
        
        <div class="card">
          <h2>How to Use</h2>
          <p>This service renders GitHub code snippets with syntax highlighting. Choose your preferred method:</p>
          
          <h3>Option 1: For Scroll Viewport Users (Theme Integration)</h3>
          <p>Use our <strong>theme-based solution</strong> that works with Scroll Viewport's static pages:</p>
          <p><a href="/theme/docs.html" class="btn btn-primary">View Theme Integration Guide</a></p>
          
          <h3>Option 2: For Scroll Viewport Users (JavaScript Method)</h3>
          <p>Alternative JavaScript-based solution that injects code <em>after</em> Scroll Viewport filters content:</p>
          <pre>&lt;script src="${req.protocol}://${req.get('host')}/scroll-viewport.js?url=YOUR_GITHUB_URL"&gt;&lt;/script&gt;</pre>
          <p><a href="/scroll-viewport.html" class="btn btn-primary">View JavaScript Guide</a></p>
          
          <h3>Option 3: Direct Embed HTML</h3>
          <p>For regular Confluence pages (not using Scroll Viewport), use the <a href="/direct-embed.html">Direct Embed Tool</a> to generate HTML code for a Confluence HTML macro.</p>
          
          <h3>Option 4: Atlassian Connect App</h3>
          <p>Install this app in your Confluence instance using the <a href="/skip-ngrok.html">installation page</a>. This adds a "GitHub Code" macro to your Confluence editor.</p>
          
          <h3>Option 5: Direct HTML API</h3>
          <p>Use the HTML API endpoint directly:</p>
          <pre>GET /html?url={githubUrl}&theme={theme}&lines={lineRange}</pre>
          <p>Example: <a href="/html?url=https://github.com/itext/itext7/blob/develop/kernel/src/main/java/com/itextpdf/kernel/pdf/PdfDocument.java&lines=100-120&theme=github">/html?url=https://github.com/itext/itext7/blob/develop/kernel/src/main/java/com/itextpdf/kernel/pdf/PdfDocument.java&lines=100-120&theme=github</a></p>
        </div>
      </body>
    </html>
  `);
});

// Add the missing utility functions for code processing

// Function to detect language based on file extension
function detectLanguage(extension) {
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'kt': 'kotlin',
    'swift': 'swift',
    'rs': 'rust',
    'sh': 'bash',
    'md': 'markdown',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql'
  };
  
  return languageMap[extension.toLowerCase()] || 'plaintext';
}

// Function to extract specific lines from code
function extractLines(code, lineRange) {
  // Handle empty line range
  if (!lineRange) return code;
  
  // Split code into lines
  const lines = code.split('\n');
  
  // Parse the line range
  let selectedLines = [];
  try {
    // Handle different formats like "5-10", "5,7,9", "5", etc.
    const ranges = lineRange.split(',');
    
    for (const range of ranges) {
      if (range.includes('-')) {
        // Range like "5-10"
        const [start, end] = range.split('-').map(Number);
        // Convert to 0-indexed
        const startIdx = Math.max(0, start - 1);
        const endIdx = Math.min(lines.length - 1, end - 1);
        
        for (let i = startIdx; i <= endIdx; i++) {
          selectedLines.push(lines[i]);
        }
      } else {
        // Single line like "5"
        const lineNum = Number(range);
        // Convert to 0-indexed
        const lineIdx = Math.max(0, lineNum - 1);
        
        if (lineIdx < lines.length) {
          selectedLines.push(lines[lineIdx]);
        }
      }
    }
    
    return selectedLines.join('\n');
  } catch (error) {
    console.error(`Error parsing line range "${lineRange}":`, error.message);
    return code; // Return the original code on error
  }
}

// URL validation and transformation utility
function validateAndTransformGitHubUrl(url) {
  // Basic validation
  if (!url) {
    throw new Error('GitHub URL is required');
  }
  
  console.log(`Original URL: ${url}`);
  
  // Handle URL::theme format - remove theme before processing URL
  let theme = null;
  let lines = null; // Initialize lines variable at the top of the function
  
  if (url.includes('::')) {
    const parts = url.split('::');
    url = parts[0];
    theme = parts[1] || null;
    console.log(`Extracted theme from URL: ${theme}, URL is now: ${url}`);
  }
  
  // Handle line numbers/theme specified with colons
  // Strip any remaining colons after the path part
  if (url.indexOf('://') > -1) {
    const urlObj = new URL(url);
    // If path has colons, clean them up
    if (urlObj.pathname.includes(':')) {
      const pathParts = urlObj.pathname.split(':');
      urlObj.pathname = pathParts[0]; // Keep only the file path
      
      // Check if the second part looks like line numbers
      if (pathParts.length > 1 && /^[0-9,-]+$/.test(pathParts[1])) {
        lines = pathParts[1];
        console.log(`Extracted lines from pathname: ${lines}`);
      }
      
      // Reconstruct URL without the colons in pathname
      url = urlObj.toString();
      console.log(`Cleaned URL path: ${url}`);
    }
  }
  
  // Handle URL:lines format - remove lines before processing URL
  const lastColonIndex = url.lastIndexOf(':');
  if (lastColonIndex > url.indexOf('://') + 3) {
    // If what follows the last colon looks like line numbers
    const afterLastColon = url.substring(lastColonIndex + 1).trim();
    if (/^[0-9,-]+$/.test(afterLastColon)) {
      lines = afterLastColon;
      url = url.substring(0, lastColonIndex);
      console.log(`Extracted lines from URL: ${lines}, URL is now: ${url}`);
    }
  }
  
  // Clean up any remaining file path with colons (common error case)
  if (url.includes('/') && url.lastIndexOf(':') > url.lastIndexOf('/')) {
    url = url.substring(0, url.lastIndexOf(':'));
    console.log(`Fixed URL with trailing colon: ${url}`);
  }
  
  // Handle raw GitHub URLs directly
  if (url.includes('raw.githubusercontent.com')) {
    // Final safety check - make sure no colons are in the path part
    const purePath = new URL(url).pathname;
    if (purePath.includes(':')) {
      const cleanPath = purePath.split(':')[0];
      url = url.replace(purePath, cleanPath);
      console.log(`Safety cleaned raw URL: ${url}`);
    }
    
    return { 
      url: url,
      extractedTheme: theme,
      extractedLines: lines
    };
  }
  
  // Handle normal GitHub URLs
  if (url.includes('github.com')) {
    // Convert regular GitHub URLs to raw URLs
    const rawUrl = url.replace(/https?:\/\/github\.com/i, 'https://raw.githubusercontent.com')
                .replace('/blob/', '/');
    
    // Final safety check - make sure no colons are in the path part
    const purePath = new URL(rawUrl).pathname;
    if (purePath.includes(':')) {
      const cleanPath = purePath.split(':')[0];
      const fixedRawUrl = rawUrl.replace(purePath, cleanPath);
      console.log(`Safety cleaned GitHub URL: ${fixedRawUrl}`);
      
      return { 
        url: fixedRawUrl,
        extractedTheme: theme,
        extractedLines: lines
      };
    }
    
    return { 
      url: rawUrl,
      extractedTheme: theme,
      extractedLines: lines
    };
  }
  
  // Check if it's a GitHub URL without the https:// prefix
  if (url.startsWith('github.com')) {
    const rawUrl = `https://raw.githubusercontent.com${url.substring(10).replace('/blob/', '/')}`;
    
    // Final safety check for colons in path
    if (rawUrl.includes(':') && rawUrl.lastIndexOf(':') > rawUrl.indexOf('/', 10)) {
      const cleanUrl = rawUrl.substring(0, rawUrl.lastIndexOf(':'));
      console.log(`Cleaned URL without prefix: ${cleanUrl}`);
      
      return { 
        url: cleanUrl,
        extractedTheme: theme,
        extractedLines: lines
      };
    }
    
    return { 
      url: rawUrl,
      extractedTheme: theme,
      extractedLines: lines
    };
  }
  
  throw new Error('Invalid GitHub URL format: ' + url);
}

// Function to get theme-specific styles
function getThemeStyles(theme) {
  const themes = {
    'github': `
      .hljs-comment, .hljs-quote { color: #6a737d; }
      .hljs-keyword, .hljs-selector-tag { color: #d73a49; }
      .hljs-literal, .hljs-number, .hljs-tag .hljs-attr { color: #005cc5; }
      .hljs-attribute, .hljs-template-variable, .hljs-variable { color: #6f42c1; }
      .hljs-built_in, .hljs-builtin-name { color: #6f42c1; }
      .hljs-name, .hljs-section, .hljs-title { color: #22863a; }
      .hljs-tag, .hljs-selector-id, .hljs-selector-class { color: #22863a; }
      .hljs-type, .hljs-meta { color: #d73a49; }
      .hljs-link, .hljs-regexp { color: #032f62; }
      .hljs-string, .hljs-symbol { color: #032f62; }
      .hljs-bullet, .hljs-subst { color: #24292e; }
      .hljs-doctag, .hljs-meta-keyword, .hljs-meta-string, .hljs-template-tag { color: #22863a; }
      .hljs-deletion { color: #b31d28; background-color: #ffeef0; }
      .hljs-addition { color: #22863a; background-color: #f0fff4; }
    `,
    'github-dark': `
      .hljs { color: #c9d1d9; background: #0d1117; }
      .hljs-comment, .hljs-quote { color: #8b949e; }
      .hljs-keyword, .hljs-selector-tag { color: #ff7b72; }
      .hljs-literal, .hljs-number, .hljs-tag .hljs-attr { color: #79c0ff; }
      .hljs-attribute, .hljs-template-variable, .hljs-variable { color: #d2a8ff; }
      .hljs-built_in, .hljs-builtin-name { color: #d2a8ff; }
      .hljs-name, .hljs-section, .hljs-title { color: #7ee787; }
      .hljs-tag, .hljs-selector-id, .hljs-selector-class { color: #7ee787; }
      .hljs-type, .hljs-meta { color: #ff7b72; }
      .hljs-link, .hljs-regexp { color: #a5d6ff; }
      .hljs-string, .hljs-symbol { color: #a5d6ff; }
      .hljs-bullet, .hljs-subst { color: #c9d1d9; }
      .hljs-doctag, .hljs-meta-keyword, .hljs-meta-string, .hljs-template-tag { color: #7ee787; }
      .hljs-deletion { color: #ffdcd7; background-color: #67060c; }
      .hljs-addition { color: #aff5b4; background-color: #033a16; }
      .github-code-content { background: #0d1117; }
      .github-code-header, .github-code-footer { background: #161b22; color: #c9d1d9; border-color: #30363d; }
      .github-code-footer a { color: #58a6ff; }
    `,
    'monokai': `
      .hljs { color: #f8f8f2; background: #272822; }
      .hljs-comment, .hljs-quote { color: #75715e; }
      .hljs-keyword, .hljs-selector-tag, .hljs-tag { color: #f92672; }
      .hljs-literal, .hljs-number, .hljs-boolean, .hljs-selector-class, .hljs-selector-id, .hljs-punctuation { color: #ae81ff; }
      .hljs-attribute, .hljs-template-variable, .hljs-variable { color: #f8f8f2; }
      .hljs-built_in, .hljs-builtin-name, .hljs-doctag, .hljs-link, .hljs-symbol { color: #66d9ef; }
      .hljs-section, .hljs-name, .hljs-type, .hljs-class .hljs-title { color: #a6e22e; }
      .hljs-string, .hljs-meta, .hljs-meta-string, .hljs-regexp { color: #e6db74; }
      .github-code-content { background: #272822; }
      .github-code-header, .github-code-footer { background: #1e1f1c; color: #f8f8f2; border-color: #3e3e3e; }
      .github-code-footer a { color: #66d9ef; }
    `,
    'tomorrow': `
      .hljs { color: #4d4d4c; background: #ffffff; }
      .hljs-comment, .hljs-quote { color: #8e908c; }
      .hljs-keyword, .hljs-selector-tag { color: #8959a8; }
      .hljs-literal, .hljs-number, .hljs-tag .hljs-attr { color: #f5871f; }
      .hljs-attribute, .hljs-template-variable, .hljs-variable { color: #eab700; }
      .hljs-built_in, .hljs-builtin-name { color: #4271ae; }
      .hljs-name, .hljs-section, .hljs-title { color: #4271ae; }
      .hljs-tag, .hljs-selector-id, .hljs-selector-class { color: #c82829; }
      .hljs-type, .hljs-meta { color: #c82829; }
      .hljs-link, .hljs-regexp { color: #3e999f; }
      .hljs-string, .hljs-symbol { color: #718c00; }
    `,
    'xcode': `
      .hljs { color: #000000; background: #ffffff; }
      .hljs-comment, .hljs-quote { color: #007400; }
      .hljs-keyword, .hljs-selector-tag { color: #aa0d91; }
      .hljs-literal, .hljs-number, .hljs-tag .hljs-attr { color: #1c00cf; }
      .hljs-attribute, .hljs-template-variable, .hljs-variable { color: #836c28; }
      .hljs-built_in, .hljs-builtin-name { color: #5c2699; }
      .hljs-name, .hljs-section, .hljs-title { color: #1c00cf; }
      .hljs-tag, .hljs-selector-id, .hljs-selector-class { color: #bf4f24; }
      .hljs-type, .hljs-meta { color: #5c2699; }
      .hljs-link, .hljs-regexp { color: #0e0eff; }
      .hljs-string, .hljs-symbol { color: #c41a16; }
    `
  };
  
  return themes[theme] || themes['github'];
}

// Simple syntax highlighting function
function highlightCode(code, language) {
  // Basic implementations of syntax highlighting for common languages
  // In a real implementation, this would use a library like highlight.js or prism.js
  
  // For now, we'll implement a very simple syntax highlighting for a few languages
  if (!code) return '';
  
  const escape = (str) => str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  const escapedCode = escape(code);
  
  // Simple regex-based syntax highlighting
  if (language === 'java') {
    return escapedCode
      // Keywords
      .replace(/\b(abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|void|volatile|while)\b/g, '<span class="hljs-keyword">$1</span>')
      // Strings
      .replace(/"([^"\\]|\\.)*"/g, '<span class="hljs-string">$&</span>')
      // Comments
      .replace(/\/\/[^\n]*/g, '<span class="hljs-comment">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="hljs-comment">$&</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span class="hljs-number">$1</span>');
  } else if (language === 'javascript') {
    return escapedCode
      // Keywords
      .replace(/\b(const|let|var|function|return|if|else|for|while|break|continue|switch|case|default|try|catch|finally|throw|new|delete|typeof|instanceof|void|this|super|class|extends|import|export|default|from|as|async|await|of|in)\b/g, '<span class="hljs-keyword">$1</span>')
      // Strings
      .replace(/"([^"\\]|\\.)*"/g, '<span class="hljs-string">$&</span>')
      .replace(/'([^'\\]|\\.)*'/g, '<span class="hljs-string">$&</span>')
      .replace(/`([^`\\]|\\.)*`/g, '<span class="hljs-string">$&</span>')
      // Comments
      .replace(/\/\/[^\n]*/g, '<span class="hljs-comment">$&</span>')
      .replace(/\/\*[\s\S]*?\*\//g, '<span class="hljs-comment">$&</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span class="hljs-number">$1</span>');
  } else {
    // For other languages, just escape HTML and don't do syntax highlighting
    return escapedCode;
  }
}

// HTML endpoint for web embedding
app.get('/html', async (req, res) => {
  try {
    const { url, lines, theme } = req.query;
    console.log('Request parameters:', req.query);
    
    // Validate and transform the URL
    if (!url) {
      return res.status(400).send('<div class="github-code-error">Error: Missing GitHub URL</div>');
    }
    
    console.log('Processing URL for HTML output:', url);
    let extractedTheme = theme || 'github';
    
    try {
      // Use our utility function to transform the URL
      const result = validateAndTransformGitHubUrl(url);
      
      // Extract file extension for language detection
      const filepath = result.url.split('/').pop() || '';
      const fileExtension = filepath.split('.').pop();
      const language = detectLanguage(fileExtension);
      
      // Get any theme from the URL if not explicitly provided
      if ((!extractedTheme || extractedTheme === 'github') && result.extractedTheme) {
        extractedTheme = result.extractedTheme;
        console.log('Using theme from URL:', extractedTheme);
      }
      
      // Get theme styles
      const themeStyles = getThemeStyles(extractedTheme);
      
      // Create proxy URL to avoid CORB issues
      const proxyUrl = `${req.protocol}://${req.get('host')}/proxy-content?url=${encodeURIComponent(result.url)}${lines ? '&lines=' + encodeURIComponent(lines) : ''}`;
      
      // Fetch the code content directly on the server
      let code = '';
      try {
        const response = await axios.get(result.url, {
        headers: {
          'User-Agent': 'GitHub-Code-Renderer',
          'Accept': 'text/plain'
          },
          responseType: 'text',
          allowAbsoluteUrls: true
      });
      
      code = response.data;
      console.log(`Fetched ${code.length} bytes of code`);
      
        // Extract lines if specified
        if (lines || result.extractedLines) {
          code = extractLines(code, lines || result.extractedLines);
        }
        
        // Escape HTML for safety
        const escapedCode = code
          .replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;')
                             .replace(/'/g, '&#039;');
    
        // Apply syntax highlighting
        const highlightedCode = highlightCode(escapedCode, language);
    
    const html = `
        <div class="github-code-block" data-theme="${extractedTheme}" data-language="${language}">
  <style>
            .github-code-block {
              margin: 16px 0;
              font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
              font-size: 14px;
              line-height: 1.5;
              overflow: auto;
              border-radius: 6px;
              border: 1px solid #ddd;
            }
            .github-code-block[data-theme="github-dark"],
            .github-code-block[data-theme="monokai"] {
              border-color: #444;
            }
            .github-code-header {
              display: flex;
              justify-content: space-between;
              padding: 8px 16px;
              background: #f6f8fa;
              border-bottom: 1px solid #ddd;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            }
            .github-code-language {
              font-weight: 600;
              color: #57606a;
            }
            .github-code-content {
              padding: 16px;
              overflow-x: auto;
              background: #fff;
              min-height: 100px;
              position: relative;
            }
            .github-code-content pre {
              margin: 0;
              white-space: pre;
              background: transparent;
              border: 0;
              padding: 0;
              tab-size: 4;
            }
            .github-code-content code {
              font-family: inherit;
              background: transparent;
              display: block;
            }
            .github-code-footer {
              display: flex;
              justify-content: space-between;
              padding: 8px 16px;
              background: #f6f8fa;
              border-top: 1px solid #ddd;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
              font-size: 12px;
            }
            .github-code-footer a {
              color: #0366d6;
              text-decoration: none;
            }
            .github-code-footer a:hover {
              text-decoration: underline;
            }
    ${themeStyles}
  </style>
  <div class="github-code-header">
            <span class="github-code-language">${language}</span>
            <span class="github-code-theme">${extractedTheme}</span>
  </div>
  <div class="github-code-content">
            <pre><code class="language-${language}">${highlightedCode}</code></pre>
  </div>
          <div class="github-code-footer">
            <a href="${url}" target="_blank" rel="noopener noreferrer">View on GitHub</a>
            <span>Powered by Scroll Viewport</span>
  </div>
        </div>
        `;
    
        return res.status(200).send(html);
    
  } catch (error) {
        console.error('Error fetching or processing code:', error);
        return res.status(500).send(`<div class="github-code-error">Error fetching code: ${error.message}</div>`);
      }
      
    } catch (error) {
      console.error('Error creating code display:', error);
      return res.status(500).send(`<div class="github-code-error">Error creating code display: ${error.message}</div>`);
    }
  } catch (error) {
    console.error('General error:', error);
    return res.status(500).send(`<div class="github-code-error">Server error: ${error.message}</div>`);
  }
});

// Universal GitHub code renderer endpoint - PURE HTML ONLY
app.get('/render', async (req, res) => {
  try {
    const { url, lines, theme } = req.query;
    
    if (!url) {
      return res.status(400).send('GitHub URL is required');
    }
    
    console.log(`Processing URL: ${url}`);
    
    let code = '';
    
    // Direct fetch of the raw content
    try {
      // Use the URL as-is if it's already a raw URL, otherwise convert it
      const fetchUrl = url.includes('raw.githubusercontent.com') 
        ? url 
        : url.replace(/https?:\/\/github\.com/i, 'https://raw.githubusercontent.com')
              .replace('/blob/', '/');
      
      console.log(`Fetching from: ${fetchUrl}`);
      
      const response = await axios.get(fetchUrl, {
        headers: {
          'User-Agent': 'GitHub-Code-Renderer',
          'Accept': 'text/plain'
        }
      });
      
      code = response.data;
      console.log(`Fetched ${code.length} bytes of code`);
      
      // Extract specific lines if requested
      if (lines) {
        code = extractLines(code, lines);
      }
    } catch (error) {
      console.error('Error fetching code:', error.message);
      return res.status(500).send(`Error fetching code: ${error.message}`);
    }
    
    // Extract filename from URL
    const filename = url.split('/').pop() || 'code';
    
    // Determine language from file extension
    const extension = filename.split('.').pop().toLowerCase();
    const language = detectLanguage(extension);
    
    // Apply syntax highlighting
    let highlightedCode = '';
    try {
      highlightedCode = highlightCode(code, language);
    } catch (error) {
      console.error('Error highlighting code:', error.message);
      // Fallback to plain text with HTML escaping
      highlightedCode = code.replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;')
                             .replace(/'/g, '&#039;');
    }
    
    // Get theme-specific styles
    const themeStyles = getThemeStyles(theme || DEFAULT_THEME);
    
    // Return ONLY the HTML content, no wrappers, or scripts
    const html = `
<div class="github-code">
  <style>
    .github-code { font-family: monospace; margin: 10px 0; }
    .github-code-header { background: #f1f1f1; padding: 10px; border: 1px solid #ddd; border-bottom: none; }
    .github-code-content { padding: 10px; border: 1px solid #ddd; overflow-x: auto; }
    .github-code pre { margin: 0; white-space: pre; }
    ${themeStyles}
  </style>
  <div class="github-code-header">
    <strong>${filename}</strong> <span style="float:right">${language}</span>
  </div>
  <div class="github-code-content">
    <pre><code>${highlightedCode}</code></pre>
  </div>
  <div class="github-code-footer" style="background: #f1f1f1; padding: 10px; border: 1px solid #ddd; border-top: none;">
    <a href="${url}" target="_blank" style="color: #0366d6; text-decoration: none;">View on GitHub</a>
  </div>
</div>`;
    
    // Set content type to plain text to prevent any interpretation
    res.set('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('General error:', error.message);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Scroll Viewport script endpoint
app.get('/scroll-viewport-script', (req, res) => {
  const defaultTheme = req.query.defaultTheme || 'github';
  
  res.set('Content-Type', 'application/javascript');
  
  // This JavaScript will be executed in the Scroll Viewport context
  const script = `
/**
 * GitHub Code Renderer for Scroll Viewport
 * This version has NO dependencies on require() or any Atlassian/Confluence APIs
 */
    (function() {
  // Initialize GitHub Code Renderer
  console.log("GitHub Code Renderer initializing...");
  
  // Define the base URL for API requests - guaranteed HTTPS
  var apiBaseUrl = "${req.protocol}://${req.get('host')}";
  if (apiBaseUrl.startsWith("http://")) {
    apiBaseUrl = apiBaseUrl.replace("http://", "https://");
  }
  console.log("GitHub Code Renderer initialized with API URL:", apiBaseUrl);
  
  // Wait until DOM is fully loaded before processing
  function domReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }
  
  // Find all text nodes that match GitHub code markers
  function findAndProcessGitHubMarkers() {
    console.log("Scanning document for GitHub code markers...");
    
    // Create a tree walker to find all text nodes
    var textNodes = [];
    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    // Collect all text nodes
    var node;
    while (node = walker.nextNode()) {
          textNodes.push(node);
        }
        
    // Define regex for GitHub markers: ##GITHUB:URL:LINES:THEME##
    // Fix the regex pattern to correctly capture the entire GitHub URL
    var markerPattern = "##GITHUB:(https?:\\/\\/(?:github\\.com|raw\\.githubusercontent\\.com)[^#]+)(?::([^:]+))?(?::([^#]+))?##";
    var markerRegex = new RegExp(markerPattern, "g");
        
        // Process each text node
    var markersFound = 0;
        textNodes.forEach(textNode => {
          const text = textNode.nodeValue;
          if (text.includes('##GITHUB:')) {
            const parts = text.split(markerRegex);
            if (parts.length > 1) {
              const parent = textNode.parentNode;
              
              // Remove the original text node
              parent.removeChild(textNode);
              
              // Rebuild the content
              for (let i = 0; i < parts.length; i++) {
                if (i % 4 === 0) {
                  // This is regular text before/after/between markers
                  if (parts[i]) {
                    parent.appendChild(document.createTextNode(parts[i]));
                  }
                } else if (i % 4 === 1) {
                  // This is the URL
                  const url = parts[i];
                  const lines = parts[i+1] || ''; // Optional lines parameter
                  const theme = parts[i+2] || defaultTheme; // Optional theme parameter
                  
                  // Create a placeholder
                  const placeholder = document.createElement('div');
                  placeholder.classList.add('github-code-placeholder');
                  placeholder.innerHTML = '<p>Loading code from GitHub...</p>';
                  parent.appendChild(placeholder);
                  
                  // Fetch and render the code
                  fetchAndRenderCode(url, placeholder, theme, lines);
                  
                  // Skip the other captured groups
                  i += 2;
                }
              }
            }
          }
        });
      }
      
      // Function to process data-github-embed elements
      function processGitHubEmbeds() {
        // Find all elements with the data-github-embed attribute
        const embeds = document.querySelectorAll('[data-github-embed="true"]');
        
        embeds.forEach(embed => {
          const url = embed.getAttribute('data-url');
          const theme = embed.getAttribute('data-theme') || defaultTheme;
          const lines = embed.getAttribute('data-lines') || '';
          const loadingText = embed.getAttribute('data-loading-text') || 'Loading code from GitHub...';
          
          // Set loading state
          embed.innerHTML = '<p>' + loadingText + '</p>';
          
          // Fetch and render code
          if (url) {
            fetchAndRenderCode(url, embed, theme, lines);
          } else {
            embed.innerHTML = '<p style="color: red;">Error: No GitHub URL provided</p>';
          }
        });
      }
      
      // Function to fetch and render code
      function fetchAndRenderCode(url, element, theme, lines) {
    fetch(\`\${apiBaseUrl}/html?url=\${encodeURIComponent(url)}&theme=\${theme}\${lines ? '&lines=' + lines : ''}\`)
          .then(response => {
            if (!response.ok) {
              throw new Error(\`Error fetching code: \${response.status}\`);
            }
            return response.text();
          })
          .then(html => {
            element.innerHTML = html;
          })
          .catch(error => {
            element.innerHTML = \`
              <div style="color: red; padding: 10px; border: 1px solid #ffcccc; background-color: #ffeeee;">
                <strong>Error loading GitHub code:</strong> \${error.message}<br>
                URL: \${url}
              </div>
            \`;
          });
      }
      
      // Process markers and embeds when the DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
      findAndProcessGitHubMarkers();
          processGitHubEmbeds();
        });
      } else {
    findAndProcessGitHubMarkers();
        processGitHubEmbeds();
      }
    })();
  `;
  
  res.send(script);
});

// Serve the Scroll Viewport integration documentation
app.get('/scroll-viewport', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/scroll-viewport.html'));
});

// Explain how to use the script with Scroll Viewport
app.get('/scroll-viewport-old', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  
  res.send(`
    <h1>GitHub Code Renderer for Scrollport</h1>
    <p>Learn how to embed GitHub code in your Confluence pages that will still display correctly with Scroll Viewport.</p>
    
    <h2>Instructions</h2>
    <ol>
      <li>
        <strong>Step 1:</strong> In your Confluence page, insert an HTML Macro
        <ul>
          <li>Edit your Confluence page</li>
          <li>Click the "+" button to insert a macro</li>
          <li>Search for and select "HTML"</li>
        </ul>
      </li>
      <li>
        <strong>Step 2:</strong> Add this script tag to the HTML macro
        <pre style="background:#f5f5f5; padding:10px; border-radius:5px; overflow:auto;">
&lt;script src="${host}/scroll-viewport-script?url=YOUR_GITHUB_URL"&gt;&lt;/script&gt;
        </pre>
        <p>Replace YOUR_GITHUB_URL with your GitHub file URL, for example:</p>
        <pre style="background:#f5f5f5; padding:10px; border-radius:5px; overflow:auto;">
&lt;script src="${host}/scroll-viewport-script?url=https://github.com/itext/itext-publications-examples-java/blob/develop/src/main/java/com/itextpdf/samples/htmlsamples/chapter01/C01E02_HelloWorld.java"&gt;&lt;/script&gt;
        </pre>
      </li>
      <li>
        <strong>Step 3:</strong> Optional parameters
        <ul>
          <li><code>theme</code>: Specify a syntax highlighting theme (github, github-dark, monokai, atom-one-dark, vs2015, xcode, dracula)</li>
          <li><code>lines</code>: Specify line range to display (e.g., 10-20)</li>
        </ul>
        <p>Example with all parameters:</p>
        <pre style="background:#f5f5f5; padding:10px; border-radius:5px; overflow:auto;">
&lt;script src="${host}/scroll-viewport-script?url=https://github.com/itext/itext-publications-examples-java/blob/develop/src/main/java/com/itextpdf/samples/htmlsamples/chapter01/C01E02_HelloWorld.java&theme=github-dark&lines=10-30"&gt;&lt;/script&gt;
        </pre>
      </li>
    </ol>
    
    <h2>How it Works</h2>
    <p>This approach uses a JavaScript-only solution that is compatible with Scroll Viewport's content filtering:</p>
    <ul>
      <li>The script dynamically fetches and injects the code into your page</li>
      <li>No iframe is used, avoiding Scroll Viewport's iframe filtering</li>
      <li>Styles are applied inline to ensure compatibility</li>
      <li>The actual code is loaded at runtime after the page has loaded</li>
    </ul>
    
    <h2>Example</h2>
    <p>Here's a live example of the script in action:</p>
    <script src="${host}/scroll-viewport-script?url=https://github.com/itext/itext-publications-examples-java/blob/develop/src/main/java/com/itextpdf/samples/htmlsamples/chapter01/C01E02_HelloWorld.java&theme=github"></script>
  `);
});

// Add ngrok setup guide route
app.get('/ngrok-setup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/ngrok-setup.html'));
});

// Direct bypass for Atlassian Connect descriptor
app.get('/atlassian-connect-bypass.json', (req, res) => {
  fs.readFile(path.join(__dirname, 'atlassian-connect/atlassian-connect.json'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading Atlassian Connect descriptor:', err);
      return res.status(500).send('Error reading Atlassian Connect descriptor');
    }
    
    // Set all possible bypass headers
    res.set('Content-Type', 'application/json');
    res.set('ngrok-skip-browser-warning', 'true');
    res.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36');
    res.set('X-Requested-With', 'XMLHttpRequest');
    res.set('X-Forwarded-For', '127.0.0.1');
    
    // Send the raw JSON data
    res.send(data);
  });
});

// Redirect any direct requests to atlassian-connect.json to the bypass version
app.get('/atlassian-connect.json', (req, res) => {
  // Set bypass headers on the redirect
  res.set('ngrok-skip-browser-warning', 'true');
  res.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36');
  res.set('X-Requested-With', 'XMLHttpRequest');
  
  // Using HTML/JavaScript redirect instead of standard redirect to keep headers
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Redirecting...</title>
      <script>
        // Bypass script content here
        // Break out of iframe
        if (window !== window.top) {
          try { window.top.location.href = window.location.href; } catch(e) {}
        }
        
        // Fetch with custom headers
        fetch('/atlassian-connect-bypass.json', {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'Mozilla/5.0',
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => response.json())
        .then(data => {
          document.open();
          document.write(JSON.stringify(data));
          document.close();
        })
        .catch(error => {
          console.error('Error:', error);
          window.location.href = '/atlassian-connect-bypass.json';
        });
      </script>
    </head>
    <body>
      <p>Redirecting to Atlassian Connect descriptor...</p>
    </body>
    </html>
  `);
});

// Raw content endpoint - directly fetch and return raw GitHub content
app.get('/raw', async (req, res) => {
  try {
    const { url, lines } = req.query;
    
    // Validate URL
    if (!url) {
      return res.status(400).send('Error: Missing GitHub URL');
    }
    
    console.log('Fetching raw content from:', url);
    
    // Transform the URL
    let transformedUrl;
    let extractedLines;
    
    try {
      const result = validateAndTransformGitHubUrl(url);
      transformedUrl = result.url;
      extractedLines = lines || result.extractedLines;
    } catch (error) {
      return res.status(400).send(`Error: ${error.message}`);
    }
    
    // Fetch the raw content
    try {
      const response = await axios.get(transformedUrl, {
        headers: {
          'User-Agent': 'GitHub-Code-Renderer',
          'Accept': 'text/plain'
        },
        responseType: 'text',
        allowAbsoluteUrls: true
      });
      
      let code = response.data;
      console.log(`Fetched ${code.length} bytes of code`);
      
      // Extract lines if specified
      if (extractedLines) {
        code = extractLines(code, extractedLines);
      }
      
      // Set CORS headers to allow embedding
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Content-Type', 'text/plain');
      
      return res.send(code);
    } catch (error) {
      console.error('Error fetching raw code:', error);
      return res.status(500).send(`Error fetching code: ${error.message}`);
    }
  } catch (error) {
    console.error('General error in raw endpoint:', error);
    return res.status(500).send(`Server error: ${error.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add endpoint for Scroll Viewport theme file with strict CORS and content type settings
app.get('/scroll-viewport-theme.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
  });

  // Generate pure browser JavaScript with no require statements
  const script = `
/**
 * GitHub Code Renderer - Browser Version
 * Finds and replaces GitHub code markers in text
 */
(function() {
  // Create namespace to avoid conflicts
  window.GitHubRenderer = window.GitHubRenderer || {};
  
  // Configuration
  const config = {
    apiUrl: "${req.protocol}://${req.get('host')}",
    scanInterval: 2000,
    markerPattern: /##GITHUB:([^#]+)##/g,
    debug: true
  };
  
  // Logging function
  function log(...args) {
    if (config.debug) {
      console.log("[GitHub Renderer]", ...args);
    }
  }
  
  // Already processed nodes
  const processedNodes = new WeakSet();
  
  // Main function to find and process GitHub markers
  function scanForMarkers() {
    log("Scanning for GitHub markers...");
    
    // Use TreeWalker to find text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const nodesToProcess = [];
    let node;
    while (node = walker.nextNode()) {
      if (!processedNodes.has(node) && 
          node.textContent && 
          node.textContent.includes("##GITHUB:")) {
        nodesToProcess.push(node);
      }
    }
    
    log("Found", nodesToProcess.length, "nodes with potential GitHub markers");
    
    // Process each node
    nodesToProcess.forEach(processNode);
  }
  
  // Process a single text node
  function processNode(textNode) {
    if (processedNodes.has(textNode)) return;
    processedNodes.add(textNode);
    
    const content = textNode.textContent;
    const matches = [...content.matchAll(config.markerPattern)];
    
    if (matches.length === 0) return;
    
    log("Processing node with", matches.length, "GitHub markers:", textNode);
    
    // Create a document fragment to replace the text node
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    matches.forEach(match => {
      const [fullMatch, githubUrl] = match;
      const matchIndex = match.index;
      
      // Add text before the match
      if (matchIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(
          content.substring(lastIndex, matchIndex)
        ));
      }
      
      // Add the GitHub code block
      try {
        const codeElement = createGitHubCodeBlock(githubUrl.trim());
        fragment.appendChild(codeElement);
      } catch (error) {
        log("Error creating code block:", error);
        fragment.appendChild(document.createTextNode(fullMatch));
      }
      
      lastIndex = matchIndex + fullMatch.length;
    });
    
    // Add any remaining text
    if (lastIndex < content.length) {
      fragment.appendChild(document.createTextNode(
        content.substring(lastIndex)
      ));
    }
    
    // Replace the original text node with the fragment
    textNode.parentNode.replaceChild(fragment, textNode);
  }
  
  // Create a GitHub code block for a URL
  function createGitHubCodeBlock(githubUrl) {
    log("Creating code block for URL:", githubUrl);
    
    // Parse URL params
    let url = githubUrl;
    let theme = "light";
    let lineRange = null;
    
    // Extract theme if specified
    if (url.includes("|theme=")) {
      const parts = url.split("|theme=");
      url = parts[0].trim();
      theme = parts[1].trim();
    }
    
    // Extract line range if specified
    if (url.includes("#L")) {
      try {
        const lineMatch = url.match(/#L(\\d+)(-L(\\d+))?/);
        if (lineMatch) {
          const start = parseInt(lineMatch[1], 10);
          const end = lineMatch[3] ? parseInt(lineMatch[3], 10) : start;
          lineRange = { start, end };
          
          // Remove line numbers from URL for API call
          url = url.replace(/#L(\\d+)(-L(\\d+))?/, '');
        }
      } catch (e) {
        log("Error parsing line range:", e);
      }
    }
    
    // Container element
    const container = document.createElement('div');
    container.className = 'github-code-container';
    container.style.cssText = 'margin: 10px 0; border: 1px solid #ddd; border-radius: 3px; overflow: hidden;';
    
    // Header
    const header = document.createElement('div');
    header.className = 'github-code-header';
    header.style.cssText = 'display: flex; align-items: center; padding: 8px 16px; background: #f6f8fa; border-bottom: 1px solid #ddd;';
    
    // Extract filename from URL
    let filename = "code";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      filename = pathParts[pathParts.length - 1];
    } catch (e) {
      log("Error extracting filename:", e);
    }
    
    // Add filename to header
    const filenameSpan = document.createElement('span');
    filenameSpan.textContent = filename;
    filenameSpan.style.cssText = 'flex-grow: 1; font-family: monospace; font-weight: bold;';
    header.appendChild(filenameSpan);
    
    // Add GitHub link
    const githubLink = document.createElement('a');
    githubLink.href = url;
    githubLink.target = '_blank';
    githubLink.textContent = 'View on GitHub';
    githubLink.style.cssText = 'color: #0366d6; text-decoration: none; font-size: 12px;';
    header.appendChild(githubLink);
    
    container.appendChild(header);
    
    // Content area with loading indicator
    const content = document.createElement('div');
    content.className = 'github-code-content';
    content.style.cssText = 'position: relative; min-height: 100px; background: ' + (theme === 'dark' ? '#1e1e1e' : '#fff') + ';';
    
    // Loading indicator
    const loader = document.createElement('div');
    loader.className = 'github-code-loader';
    loader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;';
    
    const spinner = document.createElement('div');
    spinner.style.cssText = 'width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: github-code-spin 1s linear infinite;';
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = '@keyframes github-code-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    loader.appendChild(spinner);
    content.appendChild(loader);
    container.appendChild(content);
    
    // Fetch the code
    fetchGitHubCode(url, lineRange, theme).then(codeHtml => {
      loader.remove();
      content.innerHTML = codeHtml;
    }).catch(error => {
      loader.remove();
      content.innerHTML = '<div style="padding: 16px; color: red;">Error: ' + error.message + '</div>';
    });
    
    return container;
  }
  
  // Fetch GitHub code
  function fetchGitHubCode(url, lineRange, theme) {
    log("Fetching GitHub code for URL:", url);
    
    // Prepare API URL with bypass params
    const apiUrl = \`\${config.apiUrl}/code?url=\${encodeURIComponent(url)}\`;
    const fullUrl = apiUrl + 
      (lineRange ? \`&start=\${lineRange.start}&end=\${lineRange.end}\` : '') + 
      \`&theme=\${theme}\`;
    
    // Use XMLHttpRequest with special headers
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', fullUrl);
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('Failed to load code: ' + xhr.statusText));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error while fetching code'));
      };
      
      xhr.send();
    });
  }
  
  // Initialize and start scanning
  function initialize() {
    log("Initializing GitHub Code Renderer");
    
    // Initial scan
    scanForMarkers();
    
    // Periodic scanning
    setInterval(scanForMarkers, config.scanInterval);
    
    // Also scan when DOM changes
    if (window.MutationObserver) {
      const observer = new MutationObserver(mutations => {
        let shouldScan = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldScan = true;
          }
        });
        
        if (shouldScan) {
          scanForMarkers();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      log("MutationObserver started");
    }
  }
  
  // Export public API
  GitHubRenderer.scanForMarkers = scanForMarkers;
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  log("GitHub Code Renderer loaded successfully");
})();
  `;
  
  res.send(script);
});

// Add a dedicated code endpoint that returns raw code
app.get('/code', (req, res) => {
  const { url, start, end, theme } = req.query;
  
  if (!url) {
    return res.status(400).send('<div style="color:red;">Error: Missing GitHub URL</div>');
  }
  
  // Set proper CORS headers
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'Content-Type': 'text/html; charset=utf-8',
  });
  
  const themeName = theme || 'light';
  const lineStart = start ? parseInt(start, 10) : null;
  const lineEnd = end ? parseInt(end, 10) : null;
  
  // Validate and transform GitHub URL
  try {
    const transformedUrl = validateAndTransformGitHubUrl(url);
    
    // Fetch code from GitHub
    fetchGitHubCode(transformedUrl)
      .then(codeData => {
        try {
          // Extract lines if specified
          let code = codeData.content;
          if (lineStart !== null && lineEnd !== null) {
            code = extractLines(code, { start: lineStart, end: lineEnd });
          }
          
          // Get language from file extension
          const extension = transformedUrl.split('/').pop().split('.').pop();
          const language = getLanguageFromExtension(extension);
          
          // Format code with styling
          const formattedCode = formatCodeWithLineNumbers(code, language);
          
          // Add theme styles
          const styles = getThemeStyles(themeName);
          const html = `<style>${styles}</style>${formattedCode}`;
          
          res.send(html);
  } catch (error) {
          console.error('Error processing code:', error);
          res.status(500).send(`<div style="color:red;">Error formatting code: ${error.message}</div>`);
        }
      })
      .catch(error => {
        console.error('Error fetching GitHub code:', error);
        res.status(500).send(`<div style="color:red;">Error fetching code: ${error.message}</div>`);
      });
  } catch (error) {
    console.error('Invalid GitHub URL:', error);
    res.status(400).send(`<div style="color:red;">Error: ${error.message}</div>`);
  }
});

// Add an iframe-specific endpoint to avoid CORB issues
app.get('/html-iframe', async (req, res) => {
  try {
    const { url, lines, theme = 'github' } = req.query;
    
    // Validate URL
    if (!url) {
      return res.status(400).send('Error: Missing GitHub URL');
    }
    
    console.log('Fetching GitHub content for iframe from:', url);
    
    // Transform GitHub URL to raw URL
    let transformedUrl;
    let extractedLines;
    
    try {
      const result = validateAndTransformGitHubUrl(url);
      transformedUrl = result.url;
      extractedLines = lines || result.extractedLines;
  } catch (error) {
      console.error('URL transformation error:', error);
      return res.status(400).send(`Error: ${error.message}`);
    }
    
    // Fetch the raw content
    try {
      const response = await axios.get(transformedUrl, {
        headers: {
          'User-Agent': 'GitHub-Code-Renderer',
          'Accept': 'text/plain'
        },
        responseType: 'text'
      });
      
      let code = response.data;
      console.log(`Fetched ${code.length} bytes of code for iframe`);
      
      // Extract lines if specified
      if (extractedLines) {
        code = extractLines(code, extractedLines);
      }
      
      // Get the language from the file extension
      const fileExtension = transformedUrl.split('.').pop().toLowerCase();
      const language = getLanguageFromExtension(fileExtension);
      
      // Set appropriate CORS headers
      res.set({
        'Content-Type': 'text/html',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'no-cache'
      });
      
      // Return a complete HTML document for the iframe with the code and styling
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Code</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 14px;
      line-height: 1.5;
      overflow-x: auto;
      background: ${theme === 'github-dark' ? '#0d1117' : '#fff'};
      color: ${theme === 'github-dark' ? '#c9d1d9' : '#24292e'};
    }
    pre {
      margin: 0;
      white-space: pre;
    }
    code {
      display: block;
      padding: 0;
      tab-size: 4;
    }
    .line-numbers {
      user-select: none;
      text-align: right;
      color: ${theme === 'github-dark' ? '#484f58' : '#bbb'};
      padding-right: 10px;
      margin-right: 10px;
      border-right: 1px solid ${theme === 'github-dark' ? '#30363d' : '#eee'};
      display: inline-block;
    }
    .hljs-keyword { color: ${theme === 'github-dark' ? '#ff7b72' : '#d73a49'}; }
    .hljs-string { color: ${theme === 'github-dark' ? '#a5d6ff' : '#032f62'}; }
    .hljs-comment { color: ${theme === 'github-dark' ? '#8b949e' : '#6a737d'}; }
    .hljs-function { color: ${theme === 'github-dark' ? '#d2a8ff' : '#6f42c1'}; }
    .hljs-number { color: ${theme === 'github-dark' ? '#79c0ff' : '#005cc5'}; }
    .hljs-class { color: ${theme === 'github-dark' ? '#ff7b72' : '#d73a49'}; }
    .hljs-type { color: ${theme === 'github-dark' ? '#ffa657' : '#e36209'}; }
    .hljs-variable { color: ${theme === 'github-dark' ? '#c9d1d9' : '#24292e'}; }
    .hljs-title { color: ${theme === 'github-dark' ? '#d2a8ff' : '#6f42c1'}; }
    .hljs-property { color: ${theme === 'github-dark' ? '#79c0ff' : '#005cc5'}; }
    .hljs-attribute { color: ${theme === 'github-dark' ? '#79c0ff' : '#005cc5'}; }
    .hljs-literal { color: ${theme === 'github-dark' ? '#79c0ff' : '#005cc5'}; }
    .hljs-symbol { color: ${theme === 'github-dark' ? '#79c0ff' : '#005cc5'}; }
    .hljs-built_in { color: ${theme === 'github-dark' ? '#ffa657' : '#e36209'}; }
    .table-container {
      display: table;
      width: 100%;
    }
    .line-container {
      display: table-row;
    }
    .line-numbers, .line-content {
      display: table-cell;
    }
  </style>
</head>
<body>
  <pre><code>${formatCodeWithLineNumbers(escapeHtml(code), language)}</code></pre>
  <script>
    // Send message to parent with height for sizing the iframe
    window.addEventListener('load', function() {
      if (window.parent) {
        window.parent.postMessage(JSON.stringify({
          type: 'resize',
          height: document.body.scrollHeight
        }), '*');
      }
    });
  </script>
</body>
</html>`);
  } catch (error) {
      console.error('Error fetching code for iframe:', error);
      return res.status(500).send(`Error fetching code: ${error.message}`);
    }
  } catch (error) {
    console.error('General error in iframe endpoint:', error);
    return res.status(500).send(`Server error: ${error.message}`);
  }
});

// Helper function to format code with line numbers
function formatCodeWithLineNumbers(code, language) {
  const lines = code.split('\n');
  let html = '<div class="table-container">';
  
  // Add each line with line number
  lines.forEach((line, i) => {
    // Basic syntax highlighting (very simplified)
    let highlightedLine = basicSyntaxHighlight(line, language);
    
    html += `<div class="line-container">
      <span class="line-numbers">${i + 1}</span>
      <span class="line-content">${highlightedLine || '&nbsp;'}</span>
    </div>`;
  });
  
  html += '</div>';
  return html;
}

// Super basic syntax highlighting
function basicSyntaxHighlight(line, language) {
  // Escape HTML first
  let highlightedLine = line;
  
  // Keywords for various languages
  const keywords = {
    'java': ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'static', 'final', 'void', 'new', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'package', 'import'],
    'javascript': ['function', 'const', 'let', 'var', 'return', 'if', 'else', 'for', 'while', 'new', 'class', 'import', 'export', 'default', 'try', 'catch', 'await', 'async'],
    'python': ['def', 'class', 'import', 'from', 'as', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'with', 'lambda', 'global', 'nonlocal'],
    'csharp': ['using', 'namespace', 'class', 'public', 'private', 'protected', 'static', 'void', 'string', 'int', 'bool', 'var', 'return', 'if', 'else', 'for', 'foreach', 'while', 'try', 'catch']
  };
  
  const currentKeywords = keywords[language] || keywords['java']; // Default to Java
  
  // Apply keyword highlighting
  currentKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    highlightedLine = highlightedLine.replace(regex, `<span class="hljs-keyword">${keyword}</span>`);
  });
  
  // String literals
  highlightedLine = highlightedLine.replace(/"([^"\\]*(\\.[^"\\]*)*)"/, '<span class="hljs-string">"$1"</span>');
  highlightedLine = highlightedLine.replace(/'([^'\\]*(\\.[^'\\]*)*)'/, '<span class="hljs-string">\'$1\'</span>');
  
  // Comments
  if (language === 'java' || language === 'javascript' || language === 'csharp') {
    highlightedLine = highlightedLine.replace(/\/\/(.*)$/, '<span class="hljs-comment">//$1</span>');
    highlightedLine = highlightedLine.replace(/\/\*([\s\S]*?)\*\//, '<span class="hljs-comment">/*$1*/</span>');
  } else if (language === 'python') {
    highlightedLine = highlightedLine.replace(/#(.*)$/, '<span class="hljs-comment">#$1</span>');
  }
  
  // Numbers
  highlightedLine = highlightedLine.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="hljs-number">$1</span>');
  
  return highlightedLine;
}

// Helper function to get language from file extension
function getLanguageFromExtension(extension) {
  const map = {
    'js': 'javascript',
    'ts': 'javascript',
    'jsx': 'javascript',
    'tsx': 'javascript',
    'java': 'java',
    'py': 'python',
    'rb': 'ruby',
    'php': 'php',
    'cs': 'csharp',
    'go': 'go',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'md': 'markdown',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sql': 'sql',
    'sh': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml',
    'rs': 'rust',
    'kt': 'kotlin',
    'swift': 'swift'
  };
  
  return map[extension] || 'plaintext';
}

// Helper function to escape HTML entities
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Add a special iframe proxy route for Scroll Viewport 
app.get('/viewport-proxy.html', (req, res) => {
  const ngrokUrl = process.env.NGROK_URL || `${req.protocol}://${req.get('host')}`;
  
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  });
  
  // Generate a special proxy page that will load the JavaScript safely
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GitHub Code Loader</title>
  <script>
    // This function loads the GitHub Code Renderer script directly in this page
    // The script will execute in this context and communicate with the parent window
    function loadScript() {
      fetch('/scroll-viewport-theme.js', {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load script: ' + response.status);
        }
          return response.text(); 
        })
      .then(code => {
        // Create a new script element with the code
        const script = document.createElement('script');
        script.textContent = code;
        document.head.appendChild(script);
        
        // Send success message to the parent window
        window.parent.postMessage({
          type: 'github-code-renderer-loaded',
          success: true
        }, '*');
      })
      .catch(error => {
        console.error('Error loading script:', error);
        
        // Send error message to the parent window
        window.parent.postMessage({
          type: 'github-code-renderer-loaded',
          success: false,
          error: error.message
        }, '*');
      });
    }

    // Load script when the page is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadScript);
    } else {
      loadScript();
    }
  </script>
</head>
<body style="margin:0;padding:0;background:transparent;font-family:sans-serif;">
  <div id="status" style="padding:8px;font-size:12px;color:#666;">Loading GitHub Code Renderer...</div>
</body>
</html>`;
  
  res.send(html);
});

// Add explicit route for the loader script
app.get('/scroll-viewport-loader.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
  });

  // Generate a loader with pipe format support
  const script = `
/**
 * GitHub Code Renderer Loader
 * Supports ##GITHUB:url|lines|theme## format
 */
    (function() {
  console.log("GitHub Code Renderer starting...");
  
  // Configuration
  const config = {
    apiUrl: "${req.protocol}://${req.get('host')}",
    scanInterval: 2000,
    // Support for pipe format
    markerPattern: /##GITHUB:(https?:\\/\\/(?:github\\.com|raw\\.githubusercontent\\.com)[^#]+(?:#L\\d+(?:-L\\d+)?)?)(?:\\|([^|]+))?(?:\\|([^#]+))?##/g,
    debug: true
  };
  
  // Logging function
  function log(...args) {
    if (config.debug) {
      console.log("[GitHub Renderer]", ...args);
    }
  }
  
  // Already processed nodes
  const processedNodes = new WeakSet();
  
  // Main function to find and process GitHub markers
  function scanForMarkers() {
    log("Scanning for GitHub markers...");
    
    // Use TreeWalker to find text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const nodesToProcess = [];
    let node;
        while (node = walker.nextNode()) {
      if (!processedNodes.has(node) && 
          node.textContent && 
          node.textContent.includes("##GITHUB:")) {
        nodesToProcess.push(node);
      }
    }
    
    log("Found", nodesToProcess.length, "nodes with potential GitHub markers");
    
    // Process each node
    nodesToProcess.forEach(processNode);
  }
  
  // Process a single text node
  function processNode(textNode) {
    if (processedNodes.has(textNode)) return;
    processedNodes.add(textNode);
    
    const content = textNode.textContent;
    let match;
    const matches = [];
    
    // Reset regex for fresh matching
    config.markerPattern.lastIndex = 0;
    
    // Find all matches in this text node
    while ((match = config.markerPattern.exec(content)) !== null) {
              matches.push({
                fullMatch: match[0],
                url: match[1],
        params: match[2] || "",
        theme: match[3] || "light",
        index: match.index
      });
    }
    
    if (matches.length === 0) return;
    
    log("Processing node with", matches.length, "GitHub markers:", textNode);
    
    // Create a document fragment to replace the text node
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    matches.forEach(match => {
      // Add text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(
          content.substring(lastIndex, match.index)
        ));
      }
      
      // Add the GitHub code block
      try {
        // Extract line range from URL directly
        let url = match.url;
        let lineRange = null;
        
        // First check if URL contains #L line markers
        if (url.includes("#L")) {
          try {
            const lineMatch = url.match(/#L(\\d+)(?:-L(\\d+))?/);
            if (lineMatch) {
              const start = parseInt(lineMatch[1], 10);
              const end = lineMatch[2] ? parseInt(lineMatch[2], 10) : start;
              lineRange = { start, end };
              
              // Clean URL for API call - keep the original for display
              url = url.replace(/#L\\d+(?:-L\\d+)?/, '');
            }
          } catch (e) {
            log("Error parsing line range from URL:", e);
          }
        }
        
        // Check if additional line range was specified in parameters
        if (!lineRange && match.params) {
          try {
            // Try to parse as start-end format
            if (match.params.includes('-')) {
              const parts = match.params.split('-');
              const start = parseInt(parts[0], 10);
              const end = parseInt(parts[1], 10);
              if (!isNaN(start) && !isNaN(end)) {
                lineRange = { start, end };
              }
            } else {
              // Try to parse as single line
              const line = parseInt(match.params, 10);
              if (!isNaN(line)) {
                lineRange = { start: line, end: line };
              }
            }
          } catch (e) {
            log("Error parsing line range from parameters:", e);
          }
        }
        
        const codeElement = createGitHubCodeBlock(url, lineRange, match.theme);
        fragment.appendChild(codeElement);
      } catch (error) {
        log("Error creating code block:", error);
        fragment.appendChild(document.createTextNode(match.fullMatch));
      }
      
      lastIndex = match.index + match.fullMatch.length;
    });
    
    // Add any remaining text
    if (lastIndex < content.length) {
      fragment.appendChild(document.createTextNode(
        content.substring(lastIndex)
      ));
    }
    
    // Replace the original text node with the fragment
    textNode.parentNode.replaceChild(fragment, textNode);
  }
  
  // Create a GitHub code block for a URL
  function createGitHubCodeBlock(githubUrl, lineRange, theme) {
    log("Creating code block for URL:", githubUrl, "lines:", lineRange ? lineRange.start + "-" + lineRange.end : "all", "theme:", theme);
    
    // Container element
    const container = document.createElement('div');
    container.className = 'github-code-container';
    container.style.cssText = 'margin: 10px 0; border: 1px solid #ddd; border-radius: 3px; overflow: hidden;';
    
    // Header
    const header = document.createElement('div');
    header.className = 'github-code-header';
    header.style.cssText = 'display: flex; align-items: center; padding: 8px 16px; background: #f6f8fa; border-bottom: 1px solid #ddd;';
    
    // Extract filename from URL
    let filename = "code";
    try {
      const urlObj = new URL(githubUrl);
      const pathParts = urlObj.pathname.split('/');
      filename = pathParts[pathParts.length - 1];
    } catch (e) {
      log("Error extracting filename:", e);
    }
    
    // Add filename to header
    const filenameSpan = document.createElement('span');
    filenameSpan.textContent = filename;
    filenameSpan.style.cssText = 'flex-grow: 1; font-family: monospace; font-weight: bold;';
    header.appendChild(filenameSpan);
    
    // Add line range if specified
    if (lineRange) {
      const linesSpan = document.createElement('span');
      linesSpan.textContent = 'Lines ' + lineRange.start + 
        (lineRange.end > lineRange.start ? '-' + lineRange.end : '');
      linesSpan.style.cssText = 'margin-right: 10px; color: #666; font-size: 12px;';
      header.appendChild(linesSpan);
    }
    
    // Add GitHub link
    const githubLink = document.createElement('a');
    githubLink.href = githubUrl;
    githubLink.target = '_blank';
    githubLink.textContent = 'View on GitHub';
    githubLink.style.cssText = 'color: #0366d6; text-decoration: none; font-size: 12px;';
    header.appendChild(githubLink);
    
    container.appendChild(header);
    
    // Content area with loading indicator
    const content = document.createElement('div');
    content.className = 'github-code-content';
    content.style.cssText = 'position: relative; min-height: 100px; background: ' + (theme === 'dark' ? '#1e1e1e' : '#fff') + ';';
    
    // Loading indicator
    const loader = document.createElement('div');
    loader.className = 'github-code-loader';
    loader.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center;';
    
    const spinner = document.createElement('div');
    spinner.style.cssText = 'width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: github-code-spin 1s linear infinite;';
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = '@keyframes github-code-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
    
    loader.appendChild(spinner);
    content.appendChild(loader);
    container.appendChild(content);
    
    // Fetch the code
    fetchGitHubCode(githubUrl, lineRange, theme).then(codeHtml => {
      loader.remove();
      content.innerHTML = codeHtml;
    }).catch(error => {
      loader.remove();
      content.innerHTML = '<div style="padding: 16px; color: red;">Error: ' + error.message + '</div>';
    });
    
    return container;
  }
  
  // Fetch GitHub code
  function fetchGitHubCode(url, lineRange, theme) {
    log("Fetching GitHub code for URL:", url);
    
    // Prepare API URL with bypass params
    const apiUrl = \`\${config.apiUrl}/code?url=\${encodeURIComponent(url)}\`;
    let fullUrl = apiUrl + \`&theme=\${theme}\`;
    
    // Add line range if specified
    if (lineRange) {
      fullUrl += \`&start=\${lineRange.start}&end=\${lineRange.end}\`;
    }
    
    // Use XMLHttpRequest with special headers
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', fullUrl);
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('Failed to load code: ' + xhr.statusText));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error while fetching code'));
      };
      
      xhr.send();
    });
  }
  
  // Initialize and start scanning
  function initialize() {
    log("Initializing GitHub Code Renderer");
    
    // Initial scan
    scanForMarkers();
    
    // Periodic scanning
    setInterval(scanForMarkers, config.scanInterval);
    
    // Also scan when DOM changes
    if (window.MutationObserver) {
      const observer = new MutationObserver(mutations => {
        let shouldScan = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldScan = true;
          }
        });
        
        if (shouldScan) {
          scanForMarkers();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      log("MutationObserver started");
    }
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  log("GitHub Code Renderer loaded successfully");
})();`;

  res.send(script);
});

// Add direct-fetch.js endpoint
app.get('/direct-fetch.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
  });

  // Simple script to load the loader script with ngrok bypass headers
  const script = `(function(){
  console.log("Direct fetch loader starting...");
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "${req.protocol}://${req.get('host')}/scroll-viewport-loader.js");
  xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
  xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  
  xhr.onload = function() {
    if (xhr.status >= 200 && xhr.status < 300) {
      console.log("Script loaded successfully");
      const script = document.createElement("script");
      script.textContent = xhr.responseText;
      document.head.appendChild(script);
    } else {
      console.error("Script load error:", xhr.status);
    }
  };
  
  xhr.onerror = function() {
    console.error("XHR error");
  };
  
  xhr.send();
})();`;

  res.send(script);
});

// Add a completely self-contained script
app.get('/github-code-renderer.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });

  // This script is completely self-contained and doesn't make any further requests to the server
  // Except for the actual code fetching when a GitHub marker is found
  const script = `
/**
 * GitHub Code Renderer - All In One Version
 * No additional script loading required
 */
(function() {
  console.log("GitHub Code Renderer - All In One Version - Starting");
  
  // Configuration
  const config = {
    apiBase: "${req.protocol}://${req.get('host')}",
    scanInterval: 2000,
    // Support both hash format (#L10-L20) and pipe format (|10-20|dark)
    markerPattern: /##GITHUB:(https?:\\/\\/(?:github\\.com|raw\\.githubusercontent\\.com)[^#]+(?:#L\\d+(?:-L\\d+)?)?)(?:\\|([^|]+))?(?:\\|([^#]+))?##/g,
    debug: true
  };
  
  // Logging function
  function log(...args) {
    if (config.debug) {
      console.log("[GitHub Renderer]", ...args);
    }
  }
  
  // Already processed nodes
  const processedNodes = new WeakSet();
  
  // Add required styles
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = \`
      .github-code-container {
        margin: 10px 0;
        border: 1px solid #ddd;
        border-radius: 3px;
        overflow: hidden;
        font-family: monospace;
      }
      .github-code-header {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        background: #f6f8fa;
        border-bottom: 1px solid #ddd;
      }
      .github-code-content {
        position: relative;
        min-height: 100px;
        background: #fff;
      }
      .github-code-content.dark {
        background: #1e1e1e;
        color: #d4d4d4;
      }
      .github-code-loader {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .github-code-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: github-code-spin 1s linear infinite;
      }
      @keyframes github-code-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .github-code-line {
        display: flex;
      }
      .github-code-line-number {
        color: #999;
        text-align: right;
        padding-right: 8px;
        user-select: none;
        min-width: 40px;
        border-right: 1px solid #eee;
        margin-right: 8px;
      }
      .github-code-line-content {
        flex: 1;
        white-space: pre;
      }
      .dark .github-code-line-number {
        color: #6a737d;
        border-right-color: #333;
      }
    \`;
    document.head.appendChild(style);
  }
  
  // Find and process GitHub markers
  function scanForMarkers() {
    log("Scanning for GitHub markers...");
    
    // Use TreeWalker to find text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const nodesToProcess = [];
    let node;
    while (node = walker.nextNode()) {
      if (!processedNodes.has(node) && 
          node.textContent && 
          node.textContent.includes("##GITHUB:")) {
        nodesToProcess.push(node);
      }
    }
    
    log("Found", nodesToProcess.length, "nodes with potential GitHub markers");
    
    // Process each node
    nodesToProcess.forEach(processNode);
  }
  
  // Process a single text node
  function processNode(textNode) {
    if (processedNodes.has(textNode)) return;
    processedNodes.add(textNode);
    
    const content = textNode.textContent;
    const matches = [];
    let match;
    
    // Reset regex for fresh matching
    config.markerPattern.lastIndex = 0;
    
    // Find all matches in this text node
    while ((match = config.markerPattern.exec(content)) !== null) {
      matches.push({
        fullMatch: match[0],
        url: match[1],
        params: match[2] || "",
        theme: match[3] || "light",
        index: match.index
      });
    }
    
    if (matches.length === 0) return;
    
    log("Processing node with", matches.length, "GitHub markers:", textNode);
    
    // Create a document fragment to replace the text node
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    matches.forEach(match => {
      // Add text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(
          content.substring(lastIndex, match.index)
        ));
      }
      
      // Add the GitHub code block
      try {
        const codeElement = createGitHubCodeBlock(match);
        fragment.appendChild(codeElement);
      } catch (error) {
        log("Error creating code block:", error);
        fragment.appendChild(document.createTextNode(match.fullMatch));
      }
      
      lastIndex = match.index + match.fullMatch.length;
    });
    
    // Add any remaining text
    if (lastIndex < content.length) {
      fragment.appendChild(document.createTextNode(
        content.substring(lastIndex)
      ));
    }
    
    // Replace the original text node with the fragment
    textNode.parentNode.replaceChild(fragment, textNode);
  }
  
  // Create a GitHub code block 
  function createGitHubCodeBlock(match) {
    let url = match.url;
    let lineRange = null;
    let theme = match.theme;
    
    log("Creating code block for URL:", url, "params:", match.params, "theme:", theme);
    
    // Check if URL contains #L line markers
    if (url.includes("#L")) {
      try {
        const lineMatch = url.match(/#L(\\d+)(?:-L(\\d+))?/);
        if (lineMatch) {
          const start = parseInt(lineMatch[1], 10);
          const end = lineMatch[2] ? parseInt(lineMatch[2], 10) : start;
          lineRange = { start, end };
          
          // Store original URL for display
          const originalUrl = url;
          
          // Clean URL for API call
          url = url.replace(/#L\\d+(?:-L\\d+)?/, '');
          
          log("Extracted line range from URL:", lineRange);
        }
      } catch (e) {
        log("Error parsing line range from URL:", e);
      }
    }
    
    // Check if line range was specified in parameters
    if (!lineRange && match.params) {
      try {
        // Try to parse as start-end format
        if (match.params.includes('-')) {
          const parts = match.params.split('-');
          const start = parseInt(parts[0], 10);
          const end = parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end)) {
            lineRange = { start, end };
            log("Extracted line range from params:", lineRange);
          }
        } else {
          // Try to parse as single line
          const line = parseInt(match.params, 10);
          if (!isNaN(line)) {
            lineRange = { start: line, end: line };
            log("Extracted single line from params:", lineRange);
          }
        }
      } catch (e) {
        log("Error parsing line range from parameters:", e);
      }
    }
    
    // Container element
    const container = document.createElement('div');
    container.className = 'github-code-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'github-code-header';
    
    // Extract filename from URL
    let filename = "code";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      filename = pathParts[pathParts.length - 1];
    } catch (e) {
      log("Error extracting filename:", e);
    }
    
    // Add filename to header
    const filenameSpan = document.createElement('span');
    filenameSpan.textContent = filename;
    filenameSpan.style.cssText = 'flex-grow: 1; font-family: monospace; font-weight: bold;';
    header.appendChild(filenameSpan);
    
    // Add line range if specified
    if (lineRange) {
      const linesSpan = document.createElement('span');
      linesSpan.textContent = 'Lines ' + lineRange.start + 
        (lineRange.end > lineRange.start ? '-' + lineRange.end : '');
      linesSpan.style.cssText = 'margin-right: 10px; color: #666; font-size: 12px;';
      header.appendChild(linesSpan);
    }
    
    // Add GitHub link
    const githubLink = document.createElement('a');
    githubLink.href = match.url; // Use original URL with line markers
    githubLink.target = '_blank';
    githubLink.textContent = 'View on GitHub';
    githubLink.style.cssText = 'color: #0366d6; text-decoration: none; font-size: 12px;';
    header.appendChild(githubLink);
    
    container.appendChild(header);
    
    // Content area with loading indicator
    const content = document.createElement('div');
    content.className = 'github-code-content';
    if (theme === 'dark') {
      content.classList.add('dark');
    }
    
    // Loading indicator
    const loader = document.createElement('div');
    loader.className = 'github-code-loader';
    
    const spinner = document.createElement('div');
    spinner.className = 'github-code-spinner';
    
    loader.appendChild(spinner);
    content.appendChild(loader);
    container.appendChild(content);
    
    // Fetch the code
    fetchGitHubCode(url, lineRange, theme)
      .then(code => {
        // Remove loader
        loader.remove();
        
        // Create code display
        const pre = document.createElement('pre');
        pre.style.margin = '0';
        pre.style.padding = '8px 0';
        pre.style.overflow = 'auto';
        
        // Get language from file extension for syntax highlighting
        const extension = filename.split('.').pop();
        const language = getLanguageFromExtension(extension);
        
        // Split code into lines
        const lines = code.split('\\n');
        
        // Apply line range filter if specified
        const startLine = lineRange ? lineRange.start : 1;
        const endLine = lineRange ? lineRange.end : lines.length;
        
        // Select only the requested lines, subtracting 1 for 0-based array
        const filteredLines = lines.slice(
          Math.max(0, startLine - 1),
          Math.min(lines.length, endLine)
        );
        
        // Create HTML
        filteredLines.forEach((line, i) => {
          const lineNumber = startLine + i;
          
          const lineContainer = document.createElement('div');
          lineContainer.className = 'github-code-line';
          
          // Line number
          const lineNumberEl = document.createElement('span');
          lineNumberEl.className = 'github-code-line-number';
          lineNumberEl.textContent = lineNumber;
          
          // Line content with basic syntax highlighting
          const lineContentEl = document.createElement('span');
          lineContentEl.className = 'github-code-line-content';
          lineContentEl.innerHTML = syntaxHighlight(line, language, theme);
          
          lineContainer.appendChild(lineNumberEl);
          lineContainer.appendChild(lineContentEl);
          pre.appendChild(lineContainer);
        });
        
        content.appendChild(pre);
      })
      .catch(error => {
        // Remove loader and show error
        loader.remove();
        content.innerHTML = '<div style="padding: 16px; color: red;">Error: ' + error.message + '</div>';
      });
    
    return container;
  }
  
  // Basic syntax highlighting
  function syntaxHighlight(line, language, theme) {
    // Escape HTML first
    let html = escapeHtml(line || ' ');
    
    // Skip highlighting if no language
    if (!language) return html;
    
    const isDark = theme === 'dark';
    
    // Only do basic highlighting for common languages
    if (['js', 'javascript', 'ts', 'typescript', 'java', 'c', 'cpp', 'csharp', 'php'].includes(language)) {
      // String literals
      html = html.replace(/(["'])(.*?)\\1/g, '<span style="color: ' + 
        (isDark ? '#ce9178' : '#032f62') + ';">$1$2$1</span>');
      
      // Keywords
      const keywords = ['const', 'let', 'var', 'function', 'class', 'extends', 'implements', 
                        'interface', 'import', 'export', 'from', 'return', 'if', 'else', 
                        'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this',
                        'public', 'private', 'protected', 'static', 'void', 'int', 'string',
                        'boolean', 'true', 'false', 'null', 'undefined'];
      
      keywords.forEach(keyword => {
        const regex = new RegExp('\\\\b' + keyword + '\\\\b', 'g');
        html = html.replace(regex, '<span style="color: ' + 
          (isDark ? '#569cd6' : '#d73a49') + ';">' + keyword + '</span>');
      });
      
      // Comments
      html = html.replace(/(\\/\\/.*$)/g, '<span style="color: ' + 
        (isDark ? '#6a9955' : '#6a737d') + ';">$1</span>');
    }
    
    return html;
  }
  
  // Helper function for language detection
  function getLanguageFromExtension(ext) {
    if (!ext) return '';
    ext = ext.toLowerCase();
    
    const map = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      html: 'html',
      css: 'css',
      scss: 'scss',
      php: 'php',
      go: 'go',
      rs: 'rust',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      md: 'markdown',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      sh: 'bash',
      bash: 'bash',
      txt: 'text'
    };
    
    return map[ext] || ext;
  }
  
  // Escape HTML chars
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Fetch GitHub code
  function fetchGitHubCode(url, lineRange, theme) {
    log("Fetching GitHub code for URL:", url);
    
    return new Promise((resolve, reject) => {
      // Transform GitHub URL to raw content URL
      let rawUrl = url;
      try {
        // GitHub blob URLs need transformation
        if (url.includes('github.com') && url.includes('/blob/')) {
          rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }
        
        log("Transformed to raw URL:", rawUrl);
      } catch (e) {
        reject(new Error("Invalid GitHub URL"));
        return;
      }
      
      // Use XMLHttpRequest with special headers
      const xhr = new XMLHttpRequest();
      xhr.open('GET', rawUrl);
      
      // Add headers to bypass potential restrictions
      xhr.setRequestHeader('Accept', 'text/plain');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
                  } else {
          // Try server proxy if direct fetch fails
          log("Direct fetch failed, trying server proxy");
          fetchViaProxy(url, lineRange, theme)
            .then(resolve)
            .catch(reject);
        }
      };
      
      xhr.onerror = function() {
        // Try server proxy as fallback
        log("XHR error, trying server proxy");
        fetchViaProxy(url, lineRange, theme)
          .then(resolve)
          .catch(reject);
      };
      
      xhr.send();
    });
  }
  
  // Fetch via server proxy
  function fetchViaProxy(url, lineRange, theme) {
    log("Fetching via server proxy:", url);
    
    // Create proxy URL with parameters
    let proxyUrl = config.apiBase + '/code?url=' + encodeURIComponent(url);
    
    // Add line range if specified
    if (lineRange) {
      proxyUrl += '&start=' + lineRange.start + '&end=' + lineRange.end;
    }
    
    // Add theme
    proxyUrl += '&theme=' + theme;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', proxyUrl);
      
      // Add headers to bypass ngrok warning
      xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Extract just the code from the HTML response
          let code = xhr.responseText;
          
          // If it's HTML (from server proxy), extract just the code
          if (code.startsWith('<') && code.includes('<pre>')) {
            try {
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = code;
              const pre = tempDiv.querySelector('pre');
              if (pre) {
                code = pre.textContent;
              }
            } catch (e) {
              log("Error extracting code from HTML:", e);
            }
          }
          
          resolve(code);
        } else {
          reject(new Error('Error fetching code: ' + xhr.statusText));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error while fetching code'));
      };
      
      xhr.send();
    });
  }
  
  // Initialize
  function initialize() {
    log("Initializing GitHub Code Renderer");
    
    // Add required styles
    addStyles();
    
    // Initial scan
    scanForMarkers();
    
    // Periodic scanning
    setInterval(scanForMarkers, config.scanInterval);
    
    // Also scan when DOM changes
    if (window.MutationObserver) {
      const observer = new MutationObserver(mutations => {
        let shouldScan = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldScan = true;
          }
        });
        
        if (shouldScan) {
          scanForMarkers();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      log("MutationObserver started");
    }
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  log("GitHub Code Renderer loaded successfully");
})();
  `;
  
  res.send(script);
});

// Add a simple minimal renderer
app.get('/simple-renderer.js', (req, res) => {
  res.set({
    'Content-Type': 'application/javascript; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, ngrok-skip-browser-warning, X-Requested-With, Accept',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
  });

  // Serve the simple renderer from the file system
  res.sendFile(path.join(__dirname, 'public', 'simple-renderer.js'));
});

// Add this middleware to properly set content types
app.use((req, res, next) => {
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Set proper MIME types for js files
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  next();
});

// Serve static files with proper MIME types
app.use(express.static('public', {
  setHeaders: function (res, path) {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));