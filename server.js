/**
 * GitHub Code Renderer - ACE Server (Minimal)
 * Hosts the Atlassian Connect Express app.
 * The core rendering logic is now handled client-side by theme-script.js
 */

const express = require('express');
const cors = require('cors'); // Keep CORS for potential ACE needs
const highlight = require('highlight.js'); // Keep for potential future use or if ACE requires it implicitly
const NodeCache = require('node-cache');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const ace = require('atlassian-connect-express');
const bodyParser = require('body-parser'); // Keep bodyParser, ACE might need it
const http = require('http');

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.PORT || 3000; // Default port 3000
const DEBUG = process.env.DEBUG === 'true';
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'github-light'; // Keep for reference if needed
const CACHE_TTL = process.env.CACHE_TTL || 3600; // 1 hour cache TTL

// Initialize cache (TTL in seconds)
const codeCache = new NodeCache({ 
  stdTTL: CACHE_TTL,
  checkperiod: Math.floor(CACHE_TTL / 10), // Check for expired keys every 6 minutes
  useClones: false // Better performance, immutable data
});

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  clears: 0,
  startTime: Date.now()
};

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
// ACE requires body parsing middleware, keep these.
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
// Define ACE configuration (keep this structure)
const config = {
  config: {
    development: {
      port: 3000,
      localBaseUrl: process.env.AC_LOCAL_BASE_URL || 'https://dev.tandav.com', // Ensure this matches your tunnel
      store: {
        adapter: 'sequelize', // Use adapter for Sequelize
        dialect: 'sqlite',    // Explicitly set dialect for SQLite file storage
        storage: dbPath,      // Path to the SQLite file (now absolute)
        logging: DEBUG ? console.log : false // Enable logging only if DEBUG=true
      },
      watch: false // Disable ACE file watching if using nodemon
    },
    production: {
      // Production config remains unchanged, assuming PostgreSQL
      port: process.env.PORT || 3000,
      store: {
        adapter: 'sequelize',
        dialect: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: true, // Assuming production DB requires SSL
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false // Adjust as needed for your DB provider
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
  addon = ace(app, config); // Initialize ACE
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
// Serve files from 'public' directory (contains macro editor, theme script)
app.use(express.static(path.join(__dirname, 'public')));
// -----------------------------

// Log the specific store config being used
console.log(`ACE Initialized. Active environment: [${addon.config.environment()}]`);
console.log(`Store configuration being used:`, JSON.stringify(addon.config.store(), null, 2));

// --- Cache Helper Functions ---
function generateCacheKey(url, lines, theme) {
  return `github:${Buffer.from(`${url}|${lines || ''}|${theme || 'github-light'}`).toString('base64')}`;
}

function logCacheOperation(operation, key, details = '') {
  if (DEBUG) {
    console.log(`[Cache ${operation.toUpperCase()}] ${key} ${details}`);
  }
}

// --- Cache Management Endpoints ---
// Cache statistics endpoint (public for debugging)
app.get('/app/cache/stats', (req, res) => {
  const stats = {
    ...cacheStats,
    keys: codeCache.keys().length,
    uptime: Math.floor((Date.now() - cacheStats.startTime) / 1000),
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) + '%'
      : '0%'
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(stats);
});

// Clear all cache endpoint
app.post('/app/cache/clear', (req, res) => {
  const clearedCount = codeCache.keys().length;
  codeCache.flushAll();
  cacheStats.clears++;
  
  console.log(`[Cache CLEAR] Cleared ${clearedCount} cached items`);
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: `Cleared ${clearedCount} cached items`,
    clearedCount
  });
});

// Clear specific URL from cache
app.post('/app/cache/clear/:urlHash', (req, res) => {
  const urlHash = req.params.urlHash;
  const keys = codeCache.keys();
  const matchingKeys = keys.filter(key => key.includes(urlHash));
  
  let clearedCount = 0;
  matchingKeys.forEach(key => {
    if (codeCache.del(key)) {
      clearedCount++;
      logCacheOperation('delete', key);
    }
  });
  
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    success: true,
    message: `Cleared ${clearedCount} matching cached items`,
    clearedCount,
    urlHash
  });
});

// --- Mount Public Routes (No Authentication) ---
// Add CORS preflight handler for the GitHub fetch endpoint
app.options('/app/fetch-github-code', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control');
  res.status(200).end();
});

// Add public GitHub fetch endpoint for CORS-free access
app.get('/app/fetch-github-code', async (req, res) => {
  console.log(`[GitHub Fetch] Public CORS-free request received.`);
  
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Cache-Control');
  
  const githubUrl = req.query.url || '';
  const lineRange = req.query.lines || '';
  let codeTheme = req.query.theme || 'github-light';
  const nocache = req.query.nocache === '1' || req.query.nocache === 'true';
  
  // Clean theme parameter - remove 'theme=' prefix if present
  if (codeTheme.startsWith('theme=')) {
    codeTheme = codeTheme.substring(6);
  }

  console.log(`[GitHub Fetch] Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${codeTheme}', NoCache=${nocache}`);

  if (!githubUrl) {
    return res.status(400).json({ 
      error: 'No URL provided',
      code: 'MISSING_URL'
    });
  }

  // Generate cache key
  const cacheKey = generateCacheKey(githubUrl, lineRange, codeTheme);
  
  // Check cache first (unless nocache is requested)
  if (!nocache) {
    const cachedData = codeCache.get(cacheKey);
    if (cachedData) {
      cacheStats.hits++;
      logCacheOperation('hit', cacheKey, `${cachedData.extractedLength} chars`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({
        ...cachedData,
        cached: true,
        cacheKey: DEBUG ? cacheKey : undefined
      });
    }
  }
  
  cacheStats.misses++;
  logCacheOperation('miss', cacheKey);

  try {
    // Import the helper functions from macro.js
    const https = require('https');
    
    // Helper function to convert GitHub URL to raw URL
    function getRawGitHubUrl(url) {
      if (!url) return null;
      if (url.includes('raw.githubusercontent.com')) {
        return url;
      }
      if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      return null;
    }
    
    // Helper function to detect language from URL
    function detectLanguage(url) {
      if (!url) return 'plaintext';
      const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
      if (!filenameMatch) return 'plaintext';
      const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
      const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
        go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
        html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
        md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift'
      };
      return langMap[ext] || 'plaintext';
    }
    
    // Helper function to extract specific lines
    function extractLines(code, lineSpec) {
      if (!lineSpec) return code;
      const lines = code.split('\n');
      const selected = [];
      lineSpec.split(',').forEach(range => {
        range = range.trim();
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(n => parseInt(n, 10));
          if (!isNaN(start) && !isNaN(end)) {
            // Handle both 0-based and 1-based input, convert to 1-based
            const startLine = start === 0 ? 1 : start;
            const endLine = end;
            selected.push(...lines.slice(Math.max(0, startLine - 1), Math.min(lines.length, endLine)));
          }
        } else {
          const lineNum = parseInt(range, 10);
          if (!isNaN(lineNum)) {
            // Handle both 0-based and 1-based input, convert to 1-based  
            const actualLineNum = lineNum === 0 ? 1 : lineNum;
            if (lines[actualLineNum - 1] !== undefined) {
              selected.push(lines[actualLineNum - 1]);
            }
          }
        }
      });
      return selected.join('\n');
    }
    
    // Fetch the code from GitHub
    const rawUrl = getRawGitHubUrl(githubUrl);
    if (!rawUrl) {
      throw new Error('Invalid GitHub URL format');
    }
    
    // Fetch with ETag support for smart caching
    const fetchOptions = {
      headers: {}
    };
    
    // Check if we have cached ETag data for this URL
    const etagCacheKey = `etag:${rawUrl}`;
    const cachedETag = codeCache.get(etagCacheKey);
    if (cachedETag && !nocache) {
      fetchOptions.headers['If-None-Match'] = cachedETag.etag;
    }
    
    const { code, etag, fromCache } = await new Promise((resolve, reject) => {
      const request = https.get(rawUrl, fetchOptions, (response) => {
        const statusCode = response.statusCode;
        
        // If 304 Not Modified, use cached data
        if (statusCode === 304 && cachedETag) {
          console.log(`[GitHub Fetch] 304 Not Modified - using ETag cached data`);
          return resolve({ 
            code: cachedETag.data, 
            etag: cachedETag.etag, 
            fromCache: true 
          });
        }
        
        if (statusCode !== 200) {
          reject(new Error(`HTTP ${statusCode}: ${response.statusMessage}`));
          return;
        }
        
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          const etag = response.headers.etag;
          
          // Cache the raw data with ETag for future requests
          if (etag && data) {
            codeCache.set(etagCacheKey, { 
              data, 
              etag, 
              timestamp: Date.now() 
            }, CACHE_TTL);
            logCacheOperation('store', etagCacheKey, `ETag: ${etag}`);
          }
          
          resolve({ code: data, etag, fromCache: false });
        });
      });
      
      request.on('error', reject);
    });
    
    const extractedCode = extractLines(code, lineRange);
    const language = detectLanguage(rawUrl);
    
    const responseData = {
      success: true,
      code: extractedCode,
      language: language,
      url: githubUrl,
      lines: lineRange,
      theme: codeTheme,
      totalLength: code.length,
      extractedLength: extractedCode.length,
      cached: false,
      etag: etag || null,
      fromETagCache: fromCache || false
    };
    
    // Cache the processed response (unless nocache is requested)
    if (!nocache) {
      codeCache.set(cacheKey, responseData, CACHE_TTL);
      logCacheOperation('store', cacheKey, `${extractedCode.length} chars`);
    }
    
    console.log(`[GitHub Fetch] Successfully fetched ${code.length} characters for ${language}${fromCache ? ' (ETag cached)' : ''}`);
    
    // Return JSON response with raw code data
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Cache', 'MISS');
    if (DEBUG) {
      res.setHeader('X-Cache-Key', cacheKey);
      res.setHeader('X-ETag', etag || 'none');
    }
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('[GitHub Fetch] Error fetching code:', error);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'FETCH_ERROR',
      url: githubUrl,
      cacheKey: DEBUG ? cacheKey : undefined
    });
  }
});

// --- Mount Application Routes (No Global Auth) ---
// Mount the simplified macro route handler
// Each route in macro.js handles its own authentication with addon.authenticate()
const macroRoutes = require('./src/routes/macro')(addon); // Pass addon instance
app.use('/app', macroRoutes); // Mount under /app prefix (or adjust as needed)
// --------------------------------------------------

// --- Removed Duplicated Helper Functions ---
// (escapeAttr, escapeHtml, validateAndTransformGitHubUrl, etc. are removed)
// --- Removed /html Endpoint ---
// --- Removed githubConfig ---

// --- Mount Other Non-ACE Routes ---
// Keep dummy trigger if it's used for some specific purpose (e.g., keep-alive)
app.get('/dummy-trigger.png', (req, res) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  res.set({ 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': '*', 'Cache-Control': 'no-cache, no-store', 'ngrok-skip-browser-warning': 'true' });
  res.send(png);
});

// Main route for documentation (optional)
app.get('/', (req, res) => { res.redirect('/documentation.html'); });

// --- Start Server ---
http.createServer(app).listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (addon.config.localBaseUrl()) {
      console.log(`Atlassian Connect Base URL should be set to: ${addon.config.localBaseUrl()}`);
  }
});