const express = require('express');
const cors = require('cors');
const path = require('path');
const githubHelper = require('./utils/githubHelper'); // Import helpers

const app = express();

// More permissive CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS requests explicitly
app.options('/macro', cors());

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files from public

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Test endpoint working' });
});

// Macro endpoint
app.post('/macro', cors(), async (req, res) => {
    const { url, lineRange, theme = 'github-light' } = req.body;
    console.log('Received /macro POST request:', { url, lineRange, theme });
    try {
        const rawUrl = githubHelper.normalizeGitHubUrl(url);
        const code = await githubHelper.fetchGitHubContent(rawUrl, lineRange);
        const html = githubHelper.generateCodeBlock(code, rawUrl, theme);
        res.json({
            html: html,
            // Calculate height based on fetched code (before slicing if lineRange applied)
            // Or pass full code to calculateHeight if needed
            height: githubHelper.calculateHeight(code),
            width: '100%'
        });
    } catch (error) {
        console.error('/macro POST error:', error);
        res.status(400).json({ // Use 400 for client errors like bad URL/range
            error: 'Failed to process GitHub code',
            details: error.message
        });
    }
});

// GET /html endpoint (for theme script)
app.get('/html', async (req, res) => {
    const { url, lines, theme = 'github-light' } = req.query;
    logDebug(`Received /html GET request: URL=${url}, Lines=${lines}, Theme=${theme}`); // Add server-side logging
    try {
        const rawUrl = githubHelper.normalizeGitHubUrl(url);
        const code = await githubHelper.fetchGitHubContent(rawUrl, lines);
        const html = githubHelper.generateCodeBlock(code, rawUrl, theme);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('/html GET error:', error); // Log error server-side
        res.status(400).setHeader('Content-Type', 'text/plain');
        res.send(`Error loading GitHub code: ${error.message}`);
    }
});

// GET /atlassian-connect.json
app.get('/atlassian-connect.json', (req, res) => {
    logDebug('Serving atlassian-connect.json');
    res.sendFile(path.join(__dirname, '../atlassian-connect.json'));
});

// Render GitHub macro endpoint
app.get('/render-github-macro', async (req, res) => {
    logDebug(`Received /render-github-macro GET request: ${JSON.stringify(req.query)}`);
    
    try {
        // First, try to decode the JWT token to get the macro parameters
        let macroParams = null;
        if (req.query.jwt) {
            try {
                // In a real implementation, you would verify the JWT signature
                // For now, we'll just decode it to get the payload
                const jwtParts = req.query.jwt.split('.');
                if (jwtParts.length === 3) {
                    const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
                    logDebug(`JWT payload: ${JSON.stringify(payload)}`);
                    
                    // The macro parameters might be in the context
                    if (payload.context && payload.context.macro && payload.context.macro.parameters) {
                        macroParams = payload.context.macro.parameters;
                        logDebug(`Found macro parameters in JWT: ${JSON.stringify(macroParams)}`);
                    }
                }
            } catch (e) {
                logDebug(`Error decoding JWT: ${e.message}`);
            }
        }
        
        // Extract parameters from various possible sources
        let url, lines, theme;
        
        // 1. Try to get parameters from the JWT token
        if (macroParams) {
            url = macroParams.url ? macroParams.url.value : null;
            lines = macroParams.lines ? macroParams.lines.value : '';
            theme = macroParams.theme ? macroParams.theme.value : 'github-light';
            logDebug(`Using parameters from JWT: ${JSON.stringify({ url, lines, theme })}`);
        }
        // 2. Check for direct URL parameter in query
        else if (req.query.url) {
            url = req.query.url;
            lines = req.query.lines || '';
            theme = req.query.theme || 'github-light';
            logDebug(`Using direct query parameters: ${JSON.stringify({ url, lines, theme })}`);
        }
        // 3. Check for parameters JSON in query
        else if (req.query.parameters) {
            try {
                const parameters = JSON.parse(req.query.parameters);
                url = parameters.url ? parameters.url.value : null;
                lines = parameters.lines ? parameters.lines.value : '';
                theme = parameters.theme ? parameters.theme.value : 'github-light';
                logDebug(`Using parameters from JSON: ${JSON.stringify({ url, lines, theme })}`);
            } catch (e) {
                logDebug(`Error parsing parameters JSON: ${e.message}`);
            }
        }
        
        if (!url) {
            logDebug('No URL parameter found in any source');
            return res.status(400).json({
                error: 'Missing GitHub URL parameter',
                details: 'The GitHub URL parameter is required.',
                receivedQuery: req.query
            });
        }
        
        // Process the GitHub URL and generate the HTML
        logDebug(`Processing GitHub URL: ${url}, Lines: ${lines}, Theme: ${theme}`);
        const rawUrl = githubHelper.normalizeGitHubUrl(url);
        const code = await githubHelper.fetchGitHubContent(rawUrl, lines);
        const html = githubHelper.generateCodeBlock(code, rawUrl, theme);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('/render-github-macro GET error:', error);
        res.status(400).json({
            error: 'Failed to fetch or render code',
            details: error.message,
            receivedQuery: req.query
        });
    }
    
    try {
        logDebug(`Processing GitHub URL: ${url}, Lines: ${lines}, Theme: ${theme}`);
        const rawUrl = githubHelper.normalizeGitHubUrl(url);
        const code = await githubHelper.fetchGitHubContent(rawUrl, lines);
        const html = githubHelper.generateCodeBlock(code, rawUrl, theme);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('/render-github-macro GET error:', error);
        res.status(400).json({
            error: 'Failed to fetch or render code',
            details: error.message,
            receivedQuery: req.query
        });
    }
});

// Serve macro view/editor files (if needed)
// This is handled by express.static if they are in 'public'

// Optional: Add a root handler or test endpoint
app.get('/', (req, res) => res.send('GitHub Renderer App is running.'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Simple logger function for server-side
function logDebug(message) {
    console.log(`[Server Log] ${new Date().toISOString()}: ${message}`);
} 