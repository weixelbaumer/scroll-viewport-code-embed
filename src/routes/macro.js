const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Supported themes
const THEMES = {
    GITHUB_LIGHT: 'github-light',
    GITHUB_DARK: 'github-dark',
    MONOKAI: 'monokai',
    DRACULA: 'dracula',
    VS2015: 'vs2015',
    XCODE: 'xcode',
    ATOM_DARK: 'atom-one-dark'
};

router.post('/macro', async (req, res) => {
    const { url, lineRange, theme = THEMES.GITHUB_LIGHT } = req.query;
    
    if (!url) {
        return res.status(400).json({
            error: 'Missing GitHub URL parameter',
            details: 'The GitHub URL parameter is required.',
            receivedQuery: req.query
        });
    }
    
    try {
        const githubUrl = normalizeGitHubUrl(url);
        const code = await fetchGitHubContent(githubUrl, lineRange);
        const html = generateCodeBlock(code, theme);
        
        res.json({
            html: html,
            height: calculateHeight(code),
            width: '100%'
        });
    } catch (error) {
        console.error('Macro error:', error);
        res.status(500).json({
            error: 'Failed to fetch or render code',
            details: error.message
        });
    }
});

function normalizeGitHubUrl(url) {
    if (!url) {
        throw new Error('GitHub URL is required');
    }

    // Handle raw URLs
    if (url.includes('raw.githubusercontent.com')) {
        return url;
    }

    // Convert github.com URLs to raw format
    const githubRegex = /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;
    const match = url.match(githubRegex);
    
    if (!match) {
        throw new Error('Invalid GitHub URL format');
    }

    const [, owner, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}

async function fetchGitHubContent(url, lineRange) {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
    }

    let code = await response.text();

    // Handle line range if specified
    if (lineRange) {
        const lines = code.split('\n');
        const [start, end] = lineRange.split('-').map(num => parseInt(num));
        
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
            code = lines.slice(start - 1, end).join('\n');
        }
    }

    return code;
}

function generateCodeBlock(code, theme) {
    // Detect language from file extension or default to text
    const language = detectLanguage(code);
    
    return `
        <div class="code-block ${theme}">
            <pre><code class="language-${language}">${escapeHtml(code)}</code></pre>
            <style>
                .code-block {
                    background: var(--bg-color);
                    border-radius: 4px;
                    padding: 16px;
                    overflow: auto;
                }
                .code-block pre {
                    margin: 0;
                    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
                }
                .code-block.${theme} {
                    --bg-color: ${getThemeBackground(theme)};
                    color: ${getThemeColor(theme)};
                }
            </style>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function calculateHeight(code) {
    const lines = code.split('\n').length;
    const lineHeight = 20; // pixels per line
    const padding = 32; // top + bottom padding
    return Math.min(Math.max(lines * lineHeight + padding, 100), 500); // min 100px, max 500px
}

function detectLanguage(code) {
    const extensions = {
        js: 'javascript',
        ts: 'typescript',
        py: 'python',
        java: 'java',
        rb: 'ruby',
        php: 'php',
        cs: 'csharp',
        go: 'go',
        rs: 'rust',
        cpp: 'cpp',
        c: 'c',
        html: 'html',
        css: 'css',
        md: 'markdown',
        json: 'json',
        yml: 'yaml',
        yaml: 'yaml',
        xml: 'xml',
        sh: 'bash',
        bash: 'bash',
        sql: 'sql'
    };

    // Try to detect from file extension in URL
    const urlMatch = /\.([^.]+)$/.exec(url);
    if (urlMatch && extensions[urlMatch[1]]) {
        return extensions[urlMatch[1]];
    }

    // Default to plaintext if we can't detect
    return 'plaintext';
}

function getThemeBackground(theme) {
    const backgrounds = {
        'github-light': '#ffffff',
        'github-dark': '#0d1117',
        'monokai': '#272822',
        'dracula': '#282a36',
        'vs2015': '#1e1e1e',
        'xcode': '#ffffff',
        'atom-one-dark': '#282c34'
    };
    return backgrounds[theme] || backgrounds['github-light'];
}

function getThemeColor(theme) {
    const colors = {
        'github-light': '#24292e',
        'github-dark': '#c9d1d9',
        'monokai': '#f8f8f2',
        'dracula': '#f8f8f2',
        'vs2015': '#d4d4d4',
        'xcode': '#000000',
        'atom-one-dark': '#abb2bf'
    };
    return colors[theme] || colors['github-light'];
}

module.exports = router; 