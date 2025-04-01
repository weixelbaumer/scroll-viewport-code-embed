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
const ace = require('atlassian-connect-express');
const bodyParser = require('body-parser');
const http = require('http');

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000; // Default port 3000
const CACHE_DURATION = parseInt(process.env.CACHE_DURATION) || 1800000; // Default: 30 minutes
const DEBUG = process.env.DEBUG === 'true';
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'github';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';
const NGROK_URL = process.env.NGROK_URL || '';

// Initialize express
const app = express();

// *** Initialize Atlassian Connect Express (ACE) ***
// This creates the 'addon' object and MUST come before routes using its middleware.
// Ensure database.sqlite is created in the current directory
console.log("Current directory:", __dirname);
console.log("Database file will be created at:", path.resolve(__dirname, 'database.sqlite'));

// Delete any existing database to start clean
try {
    if (fs.existsSync(path.resolve(__dirname, 'database.sqlite'))) {
        fs.unlinkSync(path.resolve(__dirname, 'database.sqlite'));
        console.log("Existing database file deleted");
    }
} catch (err) {
    console.error("Error deleting existing database:", err);
}

// Add a monkey patch for Sequelize to force file-based storage
if (process.env.FORCE_DB_FILE) {
    console.log("FORCE_DB_FILE environment variable detected! Adding monkey patch to force file-based storage.");
    
    // Save original require function
    const originalRequire = module.require;
    
    // Monkey patch require to intercept Sequelize loading
    module.require = function(path) {
        const result = originalRequire.apply(this, arguments);
        
        // If this is the sequelize module, monkey patch its constructor
        if (path === 'sequelize' || path.endsWith('/sequelize')) {
            console.log("Sequelize module detected! Patching constructor...");
            
            // Save the original constructor
            const originalSequelize = result;
            
            // Override the constructor
            function PatchedSequelize() {
                // Call the original constructor
                const instance = new originalSequelize(...arguments);
                
                // Force storage to be file-based
                if (instance.options.dialect === 'sqlite') {
                    console.log("PATCHING: Forcing SQLite to use file-based storage");
                    console.log("BEFORE:", instance.options.storage);
                    instance.options.storage = path.resolve(__dirname, 'database.sqlite');
                    console.log("AFTER:", instance.options.storage);
                }
                
                return instance;
            }
            
            // Copy prototype and static properties
            PatchedSequelize.prototype = originalSequelize.prototype;
            Object.setPrototypeOf(PatchedSequelize, originalSequelize);
            
            // Return the patched constructor
            return PatchedSequelize;
        }
        
        // Otherwise, return the original module
        return result;
    };
}

const ace_config = {
    config: {
        development: {
            port: 3000,
            sequelize: {
                storage: path.resolve(__dirname, 'database.sqlite') // Set at the sequelize level
            },
            store: {
                adapter: 'sequelize',
                dialect: 'sqlite3',
                storage: path.resolve(__dirname, 'database.sqlite'), // Use absolute path
                logging: console.log // Enable SQL logging
            }
        },
        production: {
             port: process.env.PORT || 3000,
             store: {
                 adapter: 'sequelize',
                 dialect: 'postgres',
                 url: process.env.DATABASE_URL
             }
        }
    }
};

console.log("ACE configuration:", JSON.stringify(ace_config, null, 2));
const addon = ace(app, ace_config);

// *** ADD THIS LOGGING LINE ***
console.log(`ACE Initialized. Active environment: [${addon.config.environment()}]`);
// Log the specific store config being used based on the environment
console.log(`Store configuration being used:`, JSON.stringify(addon.config.store(), null, 2));

// Middleware like body-parser, static files, etc., should come after ACE init
// but before your specific routes.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS
app.use(cors());

// Make sure body-parser middleware is used BEFORE your routes
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Serve the atlassian-connect.json directly
app.get('/atlassian-connect.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'atlassian-connect.json'));
});

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

// *** Add the route handler for the lifecycle callback ***
// This endpoint receives the installation data from Confluence.
// ACE automatically handles saving the client key, shared secret, etc.
// You only need custom logic here if you want to perform actions AFTER installation.
app.post('/installed', (req, res) => {
  console.log("=== INSTALLATION REQUEST RECEIVED ===");
  console.log("Client Key:", req.body.clientKey);
  console.log("Base URL:", req.body.baseUrl);
  
  // Store the installation details in a global variable for simplicity
  global.installations = global.installations || {};
  global.installations[req.body.clientKey] = {
    clientKey: req.body.clientKey,
    baseUrl: req.body.baseUrl,
    sharedSecret: req.body.sharedSecret
  };
  
  console.log("Installation stored in memory:", global.installations[req.body.clientKey] ? "YES" : "NO");
  console.log("App installed successfully!");
  res.sendStatus(200);
});

// Simple authentication bypass middleware for testing
function bypassAuthentication(req, res, next) {
  // For testing purposes, bypass authentication
  console.log("BYPASSING AUTHENTICATION FOR TESTING");
  next();
}

// ROUTE HANDLER FOR DYNAMIC MACRO RENDERING
app.all('/render-github-macro', bypassAuthentication, async (req, res) => {
  // <<< KEY LOGGING ADDED HERE >>>
  console.log(`-----------------------------------------------------`);
  console.log(`[${new Date().toISOString()}] Incoming /render-github-macro request`);
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.originalUrl}`); // Log the full original URL with query string
  console.log(`Query Params:`, JSON.stringify(req.query, null, 2));
  console.log(`Body Params:`, JSON.stringify(req.body, null, 2));
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2)); // Log headers too for context like x-scroll-viewport
  console.log(`-----------------------------------------------------`);

  // Extract parameters - prioritize query params based on client script and curl test, fallback to body
  const githubUrl = req.query.url || req.body.url;
  const lineRange = req.query.lines || req.body.lines;
  const theme = req.query.theme || req.body.theme || 'github'; // Default theme

  console.log(`Extracted Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${theme}'`); // Log extracted params

  // Check for the mandatory URL parameter
  if (!githubUrl) {
    console.error('Validation Error: Missing GitHub URL parameter.'); // Log before sending 400
    // Send a more informative error message back
    return res.status(400).json({ 
        error: 'Missing GitHub URL parameter.',
        receivedQuery: req.query,
        receivedBody: req.body 
    });
  }

  // Check if running in Scroll Viewport context
  const isScrollViewport = req.headers['x-scroll-viewport'] === 'true';
  console.log(`Scroll Viewport Context: ${isScrollViewport}`);

  try {
    let processedUrl = githubUrl;
    let extractedLines = lineRange; 
    let extractedTheme = theme;

    // Use validateAndTransformGitHubUrl if it exists (defined previously around line 419)
    if (typeof validateAndTransformGitHubUrl === 'function') {
        try {
            console.log(`Using validateAndTransformGitHubUrl for: ${githubUrl}`);
            // Pass the original URL as entered by user
            const validationResult = validateAndTransformGitHubUrl(githubUrl); 
            processedUrl = validationResult.url; // URL ready for fetch/normalize
            // Use explicitly passed params first, then fall back to extracted ones
            extractedLines = lineRange || validationResult.extractedLines; 
            extractedTheme = theme || validationResult.extractedTheme || 'github';
            console.log(`After validateAndTransformGitHubUrl: URL='${processedUrl}', Lines='${extractedLines}', Theme='${extractedTheme}'`);
        } catch (validationError) {
            console.error(`URL validation/transformation failed: ${validationError.message}`);
            return res.status(400).json({ 
                error: `Invalid GitHub URL format: ${validationError.message}`,
                originalUrl: githubUrl
            });
        }
    } else {
         console.log(`validateAndTransformGitHubUrl not found, using raw params.`);
         processedUrl = githubUrl;
         extractedLines = lineRange;
         extractedTheme = theme;
    }

    // Fetch content
    console.log(`Fetching content for: ${processedUrl}`);
    const content = await fetchGitHubContent(processedUrl); // Ensure defined

    // Extract lines
    console.log(`Extracting lines: '${extractedLines}'`);
    let codeToRender = extractLines(content, extractedLines); // Ensure defined

    // Detect language
    const language = detectLanguage(processedUrl); // Ensure defined
    console.log(`Detected language: ${language}`);

    // Get theme styles
    const themeStyles = getThemeStyles(extractedTheme); // Ensure defined

    // Respond based on context
    if (isScrollViewport) {
        const uniqueId = `gh-placeholder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        console.log(`ScrollViewport detected. Rendering hidden anchor placeholder #${uniqueId}`);
        const anchorHtml = `<a 
                              id="${escapeAttr(uniqueId)}" 
                              class="gh-code-anchor-placeholder" 
                              href="#" 
                              style="display: none;" 
                              data-url="${escapeAttr(githubUrl)}" 
                              data-lines="${escapeAttr(lineRange || '')}" 
                              data-theme="${escapeAttr(theme || 'github')}"
                              aria-hidden="true">GitHub Content Placeholder</a>`;
        res.type('text/html').send(anchorHtml); // Set content type

    } else {
        console.log(`Regular view detected. Rendering full code block.`);
        const htmlResponse = `
          <style>${themeStyles}</style>
          <pre><code class="hljs ${language}">${escapeHtml(codeToRender)}</code></pre>
        `;
        res.type('text/html').send(htmlResponse); // Set content type
    }

  } catch (error) {
    console.error(`Error in /render-github-macro handler for URL "${githubUrl}":`, error);
    // Send JSON error for easier parsing by fetch error handler
    res.status(500).json({ 
        error: `Error fetching or processing GitHub content: ${error.message}`,
        urlProcessed: githubUrl // Reference the original URL attempted
    });
  }
});

// Helper function escapeAttr (ensure it's defined)
function escapeAttr(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[<>"'&]/g, function(match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            case '&': return '&amp;';
            default: return match;
        }
    });
}

// Helper function escapeHtml (ensure it's defined)
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

// Get the port from the ACE configuration
const port = addon.config.port();

// Start the server using http
http.createServer(app).listen(port, () => {
  console.log(`Server is running on port ${port}`);
  // Log the base URL in development for testing
  if (addon.config.environment() === 'development') {
      console.log(`Atlassian Connect Base URL should be set to: ${addon.config.localBaseUrl()}`);
  }
});