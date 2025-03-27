require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const hljs = require('highlight.js');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GitHub API base URL
const GITHUB_API_URL = 'https://api.github.com';

/**
 * Fetch code from GitHub
 * @param {string} repo - Repository in format owner/repo
 * @param {string} path - Path to file in repository
 * @param {string} branch - Branch name (default: main)
 * @returns {Promise<string>} - File content
 */
async function fetchGitHubCode(repo, path, branch = 'main') {
  try {
    const url = `${GITHUB_API_URL}/repos/${repo}/contents/${path}?ref=${branch}`;
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
    };
    
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error('Error fetching from GitHub:', error.message);
    throw new Error(`Failed to fetch code from GitHub: ${error.message}`);
  }
}

/**
 * Extract specific lines from code
 * @param {string} code - Complete code
 * @param {string} lineRange - Range of lines (e.g., "10-20")
 * @returns {string} - Extracted code snippet
 */
function extractLines(code, lineRange) {
  if (!lineRange) return code;
  
  const lines = code.split('\n');
  const [start, end] = lineRange.split('-').map(num => parseInt(num.trim(), 10));
  
  // Validate line numbers
  const startLine = Math.max(1, isNaN(start) ? 1 : start);
  const endLine = Math.min(lines.length, isNaN(end) ? lines.length : end);
  
  return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Apply syntax highlighting to code
 * @param {string} code - Code to highlight
 * @param {string} language - Programming language
 * @returns {string} - HTML with syntax highlighting
 */
function highlightCode(code, language) {
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  } catch (error) {
    console.error('Error highlighting code:', error.message);
    return hljs.highlightAuto(code).value;
  }
}

/**
 * Generate HTML for code display
 * @param {string} highlightedCode - Code with syntax highlighting
 * @param {Object} metadata - Additional metadata
 * @returns {string} - Complete HTML for embedding
 */
function generateHtml(highlightedCode, metadata) {
  const { repo, path, branch, language } = metadata;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Code: ${path}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.5.1/styles/github.min.css">
  <style>
    .code-container {
      background: #f6f8fa;
      border-radius: 6px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
      padding: 16px;
      overflow: auto;
    }
    .code-header {
      background: #f1f1f1;
      border-radius: 6px 6px 0 0;
      border-bottom: 1px solid #ddd;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
    }
    .code-footer {
      background: #f1f1f1;
      border-radius: 0 0 6px 6px;
      border-top: 1px solid #ddd;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      padding: 8px 16px;
      text-align: right;
    }
    .code-footer a {
      color: #0366d6;
      text-decoration: none;
    }
    .code-footer a:hover {
      text-decoration: underline;
    }
    pre {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="code-header">
    <span>${path}</span>
    <span>${language || 'code'}</span>
  </div>
  <div class="code-container">
    <pre><code>${highlightedCode}</code></pre>
  </div>
  <div class="code-footer">
    <a href="https://github.com/${repo}/blob/${branch}/${path}" target="_blank">View on GitHub</a>
  </div>
</body>
</html>
  `;
}

// Route to get GitHub code
app.get('/github-code', async (req, res) => {
  try {
    const { repo, path, branch = 'main', lines, language } = req.query;
    
    // Validate required parameters
    if (!repo || !path) {
      return res.status(400).json({ error: 'Repository and path are required' });
    }
    
    // Fetch code from GitHub
    const code = await fetchGitHubCode(repo, path, branch);
    
    // Extract specific lines if requested
    const codeSnippet = lines ? extractLines(code, lines) : code;
    
    // Determine language from file extension if not provided
    const fileExtension = path.split('.').pop();
    const detectedLanguage = language || fileExtension;
    
    // Apply syntax highlighting
    const highlightedCode = highlightCode(codeSnippet, detectedLanguage);
    
    // Generate complete HTML
    const html = generateHtml(highlightedCode, { repo, path, branch, language: detectedLanguage });
    
    res.send(html);
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Route for HTML-only code snippet
app.get('/github-code-snippet', async (req, res) => {
  try {
    const { repo, path, branch = 'main', lines, language } = req.query;
    
    // Validate required parameters
    if (!repo || !path) {
      return res.status(400).json({ error: 'Repository and path are required' });
    }
    
    // Fetch code from GitHub
    const code = await fetchGitHubCode(repo, path, branch);
    
    // Extract specific lines if requested
    const codeSnippet = lines ? extractLines(code, lines) : code;
    
    // Determine language from file extension if not provided
    const fileExtension = path.split('.').pop();
    const detectedLanguage = language || fileExtension;
    
    // Apply syntax highlighting
    const highlightedCode = highlightCode(codeSnippet, detectedLanguage);
    
    // Set content type to HTML
    res.setHeader('Content-Type', 'text/html');
    
    // Return only the highlighted code for embedding
    res.send(`<pre><code class="hljs ${detectedLanguage}">${highlightedCode}</code></pre>`);
  } catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Simple health check route
app.get('/health', (req, res) => {
  res.send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 