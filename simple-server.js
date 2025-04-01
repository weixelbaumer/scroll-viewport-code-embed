/**
 * Simple GitHub Code Renderer Server
 * This version doesn't use atlassian-connect-express at all
 * to avoid the SQLite storage issues
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const http = require('http');

// Initialize express
const app = express();

// Setup logging to file
const logStream = fs.createWriteStream(path.join(__dirname, 'simple-server.log'), { flags: 'a' });

// Custom logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${req.method} ${req.originalUrl}\n`;
    
    // Log to console
    process.stdout.write(logEntry);
    
    // Log to file
    logStream.write(logEntry);
    
    next();
});

// Enable CORS
app.use(cors());

// Use body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the atlassian-connect.json directly
app.get('/atlassian-connect.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'atlassian-connect.json'));
});

// Installation endpoint - just log the data
app.post('/installed', (req, res) => {
    console.log("=== INSTALLATION REQUEST RECEIVED ===");
    console.log("Client Key:", req.body.clientKey);
    console.log("Base URL:", req.body.baseUrl);
    console.log("App installed successfully!");
    res.status(200).send('Installation successful');
});

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

// Function to detect language based on file extension
function detectLanguage(url) {
    // Extract file extension from URL
    const extension = url.split('.').pop().toLowerCase();
    
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
    
    return languageMap[extension] || 'plaintext';
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
        // Add other themes here if needed
    };
    
    return themes[theme] || themes['github'];
}

// Helper function escapeAttr
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

// Helper function escapeHtml
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper function to fetch GitHub content
async function fetchGitHubContent(url) {
    log(`Fetching GitHub content from: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'GitHub-Code-Renderer'
            }
        });
        log(`Successfully fetched ${response.data.length} bytes from ${url}`);
        return response.data;
    } catch (error) {
        log(`Error fetching GitHub content: ${error.message}`);
        throw error;
    }
}

// Helper function to log both to console and file
function log(...args) {
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // Log to console
    process.stdout.write(logEntry);
    
    // Log to file
    logStream.write(logEntry);
}

// ROUTE HANDLER FOR DYNAMIC MACRO RENDERING
app.all('/render-github-macro', async (req, res) => {
    log(`-----------------------------------------------------`);
    log(`Incoming /render-github-macro request`);
    log(`Method: ${req.method}`);
    log(`URL: ${req.originalUrl}`);
    log(`Query Params: ${JSON.stringify(req.query, null, 2)}`);
    log(`Body Params: ${JSON.stringify(req.body, null, 2)}`);
    log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
    log(`-----------------------------------------------------`);

    // Extract parameters
    const githubUrl = req.query.url || req.body.url;
    const lineRange = req.query.lines || req.body.lines;
    const theme = req.query.theme || req.body.theme || 'github';

    log(`Extracted Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${theme}'`);

    // Check for the mandatory URL parameter
    if (!githubUrl) {
        log(`Validation Error: Missing GitHub URL parameter.`);
        return res.status(400).json({ 
            error: 'Missing GitHub URL parameter.',
            receivedQuery: req.query,
            receivedBody: req.body 
        });
    }

    // Check if running in Scroll Viewport context
    const isScrollViewport = req.headers['x-scroll-viewport'] === 'true';
    log(`Scroll Viewport Context: ${isScrollViewport}`);

    try {
        // Convert GitHub URL to raw URL if needed
        let rawUrl = githubUrl;
        if (githubUrl.includes('github.com') && !githubUrl.includes('raw.githubusercontent.com')) {
            rawUrl = githubUrl.replace(/https?:\/\/github\.com/i, 'https://raw.githubusercontent.com')
                             .replace('/blob/', '/');
            log(`Converted GitHub URL to raw URL: ${rawUrl}`);
        }

        // Fetch content
        log(`Fetching content for: ${rawUrl}`);
        const content = await fetchGitHubContent(rawUrl);

        // Extract lines
        log(`Extracting lines: '${lineRange}'`);
        let codeToRender = extractLines(content, lineRange);

        // Detect language
        const language = detectLanguage(rawUrl);
        log(`Detected language: ${language}`);

        // Get theme styles
        const themeStyles = getThemeStyles(theme);

        // Respond based on context
        if (isScrollViewport) {
            const uniqueId = `gh-placeholder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            log(`ScrollViewport detected. Rendering hidden anchor placeholder #${uniqueId}`);
            const anchorHtml = `<a 
                                id="${escapeAttr(uniqueId)}" 
                                class="gh-code-anchor-placeholder" 
                                href="#" 
                                style="display: none;" 
                                data-url="${escapeAttr(githubUrl)}" 
                                data-lines="${escapeAttr(lineRange || '')}" 
                                data-theme="${escapeAttr(theme || 'github')}"
                                aria-hidden="true">GitHub Content Placeholder</a>`;
            res.type('text/html').send(anchorHtml);
        } else {
            log(`Regular view detected. Rendering full code block.`);
            const htmlResponse = `
                <style>${themeStyles}</style>
                <pre><code class="hljs ${language}">${escapeHtml(codeToRender)}</code></pre>
            `;
            res.type('text/html').send(htmlResponse);
        }
    } catch (error) {
        log(`Error in /render-github-macro handler for URL "${githubUrl}": ${error.message}`);
        console.error(error); // Full stack trace to console only
        res.status(500).json({ 
            error: `Error fetching or processing GitHub content: ${error.message}`,
            urlProcessed: githubUrl
        });
    }
});

// Start the server
const port = 3000;
http.createServer(app).listen(port, () => {
    log(`Simple server is running on port ${port}`);
    log(`Atlassian Connect Base URL should be set to: https://dev.tandav.com`);
    log(`Server started at: ${new Date().toISOString()}`);
    log(`-----------------------------------------------------`);
}); 