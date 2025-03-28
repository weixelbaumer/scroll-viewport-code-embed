const fetch = require('node-fetch');
const hljs = require('highlight.js'); // Use a server-side highlighter

// Use require for highlight.js styles if needed, or link in HTML
// require('highlight.js/styles/github.css'); // Example

// Supported themes (Map to highlight.js styles if possible)
const THEME_CLASSES = {
    'github-light': 'hljs github', // Map to actual CSS classes
    'github-dark': 'hljs github-dark',
    'monokai': 'hljs monokai',
    'dracula': 'hljs dracula',
    'vs2015': 'hljs vs2015',
    'xcode': 'hljs xcode',
    'atom-one-dark': 'hljs atom-one-dark'
};
const DEFAULT_THEME = 'github-light';

function normalizeGitHubUrl(url) {
    // (Same logic as before)
    if (!url) throw new Error('GitHub URL is required');
    if (url.includes('raw.githubusercontent.com')) return url;
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)/;
    const match = url.match(githubRegex);
    if (!match) throw new Error('Invalid GitHub URL format. Use full URL to file.');
    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

async function fetchGitHubContent(rawUrl, lineRange) {
    // (Same logic as before, ensure node-fetch is installed)
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`GitHub fetch error (${response.status}): ${response.statusText}`);
    let code = await response.text();
    if (lineRange) {
        const lines = code.split('\n');
        const range = lineRange.match(/^(\d+)(?:-(\d+))?$/);
        if (range) {
            const start = parseInt(range[1], 10);
            const end = range[2] ? parseInt(range[2], 10) : start;
            if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
                 // Adjust for 0-based index, ensure end is within bounds
                const startIndex = Math.max(0, start - 1);
                const endIndex = Math.min(lines.length, end);
                 if (startIndex < endIndex) {
                    code = lines.slice(startIndex, endIndex).join('\n');
                 } else {
                    code = ''; // Handle invalid range gracefully
                 }
            } else {
                console.warn("Invalid line range format:", lineRange);
            }
        } else {
             console.warn("Invalid line range format:", lineRange);
        }
    }
    return code;
}

function generateCodeBlock(code, rawUrl, theme) {
    const themeClass = THEME_CLASSES[theme] || THEME_CLASSES[DEFAULT_THEME];
    let highlightedCode;
    try {
        // Attempt auto-detection or use file extension
        const language = detectLanguageFromUrl(rawUrl) || hljs.highlightAuto(code).language || 'plaintext';
        highlightedCode = hljs.highlight(code, { language: language, ignoreIllegals: true }).value;
    } catch (e) {
        console.warn("Highlighting failed, falling back to plaintext:", e);
        highlightedCode = escapeHtml(code); // Use escaped plaintext on error
    }

    // Generate HTML suitable for Confluence/Viewport
    // Using pre/code and highlight.js classes
    // Inline styles might be needed for Viewport if theme CSS isn't loaded
    return `
        <div class="code-block-container">
          <pre><code class="${themeClass} language-${hljs.highlightAuto(code).language || 'plaintext'}">${highlightedCode}</code></pre>
        </div>
        `;
        // Consider adding inline styles here if needed for Viewport
        // <style> .code-block-container { ... } .${themeClass} { ... } </style>
}

function detectLanguageFromUrl(rawUrl) {
    const extensionMap = {
        js: 'javascript', ts: 'typescript', py: 'python', java: 'java', rb: 'ruby',
        php: 'php', cs: 'csharp', go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c',
        html: 'xml', xml: 'xml', css: 'css', md: 'markdown', json: 'json',
        yml: 'yaml', yaml: 'yaml', sh: 'bash', sql: 'sql', groovy: 'groovy'
        // Add more mappings as needed
    };
    const match = rawUrl.match(/\.([^./?#]+)(?:[?#]|$)/);
    return match ? extensionMap[match[1].toLowerCase()] : null;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }


function calculateHeight(code) {
    // (Same logic as before)
    const lines = code.split('\n').length;
    const lineHeight = 18; // Adjust as needed
    const padding = 20;
    return Math.min(Math.max(lines * lineHeight + padding, 80), 600); // Adjust min/max
}

module.exports = {
    normalizeGitHubUrl,
    fetchGitHubContent,
    generateCodeBlock,
    calculateHeight
}; 