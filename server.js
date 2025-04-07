/**
 * GitHub Code Renderer - ACE Server (Minimal)
 * Hosts the Atlassian Connect Express app.
 * The core rendering logic is now handled client-side by theme-script.js
 */

const express = require('express');
// Removed: const axios = require('axios');
const cors = require('cors'); // Keep CORS for potential ACE needs
const highlight = require('highlight.js'); // Keep for potential future use or if ACE requires it implicitly
// Removed: const cache = require('memory-cache');
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
// Removed CACHE_DURATION
const DEBUG = process.env.DEBUG === 'true';
const DEFAULT_THEME = process.env.DEFAULT_THEME || 'github-light'; // Keep for reference if needed

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

// Add authentication middleware for install/uninstall callbacks AFTER static files
// ACE handles /installed and /uninstalled routes implicitly with this middleware
app.use(addon.authenticateInstall());

// --- Mount Application Routes (ACE Authenticated) ---
// Mount the simplified macro route handler
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