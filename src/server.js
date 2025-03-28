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

// HTML endpoint (GET - for Viewport theme script)
app.get('/html', async (req, res) => {
    const { url, lines, theme = 'github-light' } = req.query; // Use 'lines' from query
    console.log('Received /html GET request:', { url, lines, theme });
    try {
        const rawUrl = githubHelper.normalizeGitHubUrl(url);
        // Pass 'lines' (from query) as lineRange argument
        const code = await githubHelper.fetchGitHubContent(rawUrl, lines);
        const html = githubHelper.generateCodeBlock(code, rawUrl, theme);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('/html GET error:', error);
        res.status(400).setHeader('Content-Type', 'text/plain');
        res.send(`Error loading GitHub code: ${error.message}`);
    }
});

// Serve atlassian-connect.json
app.get('/atlassian-connect.json', (req, res) => {
    console.log('Serving atlassian-connect.json');
    res.sendFile(path.join(__dirname, '../atlassian-connect.json'));
});

// Serve macro view/editor files (if needed)
// This is handled by express.static if they are in 'public'

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 