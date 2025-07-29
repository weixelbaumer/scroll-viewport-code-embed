/**
 * GitHub Code Block Integration for Scroll Sites
 * 
 * This JavaScript provides standalone functionality to embed and syntax highlight
 * code from GitHub URLs in Scroll Sites, independent of the Forge infrastructure.
 * 
 * Usage:
 * <script src="path/to/scroll-sites-integration.js"></script>
 * <div class="github-code-block" 
 *      data-github-url="https://github.com/user/repo/blob/main/file.js" 
 *      data-line-range="10-20,25" 
 *      data-theme="github-dark">
 * </div>
 */

(function(window, document) {
    'use strict';

    // Language mapping for file extensions
    const LANGUAGE_MAP = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
        go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
        html: 'xml', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
        md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
        dockerfile: 'dockerfile', groovy: 'groovy', scala: 'scala',
        perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
    };

    // Available themes
    const THEMES = {
        'github-light': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css',
        'github-dark': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
        'monokai': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai.min.css',
        'dracula': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/dracula.min.css',
        'vs2015': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css',
        'xcode': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/xcode.min.css',
        'atom-one-dark': 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css'
    };

    /**
     * Transform GitHub page URL to raw content URL
     */
    function getRawGitHubUrl(url) {
        if (!url) return null;
        try {
            // Handle existing raw URLs
            if (url.includes('raw.githubusercontent.com')) {
                return url;
            }
            // Handle standard GitHub blob URLs
            if (url.includes('github.com') && url.includes('/blob/')) {
                return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            }
            // Handle URLs starting with github.com (less common)
            if (url.startsWith('github.com')) {
                const pathPart = url.substring(url.indexOf('/') + 1);
                return `https://raw.githubusercontent.com/${pathPart.replace('/blob/', '/')}`;
            }
            console.warn(`Could not convert URL to raw format: ${url}`);
            return null;
        } catch (e) {
            console.error(`Error converting URL ${url}: ${e.message}`);
            return null;
        }
    }

    /**
     * Extract specific lines from code
     */
    function extractLines(code, lineRange) {
        if (!lineRange || lineRange.trim() === '') return code;

        const lines = code.split('\n');
        let selectedLines = [];
        try {
            const ranges = lineRange.split(',');
            for (const range of ranges) {
                const trimmedRange = range.trim();
                if (trimmedRange.includes('-')) {
                    const [startStr, endStr] = trimmedRange.split('-');
                    const start = parseInt(startStr, 10);
                    const end = parseInt(endStr, 10);
                    if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= lines.length) {
                        selectedLines = selectedLines.concat(lines.slice(start - 1, Math.min(end, lines.length)));
                    } else {
                        console.warn(`Invalid range format: ${trimmedRange}`);
                    }
                } else {
                    const lineNum = parseInt(trimmedRange, 10);
                    if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
                        selectedLines.push(lines[lineNum - 1]);
                    } else {
                        console.warn(`Invalid line number: ${trimmedRange}`);
                    }
                }
            }
            return selectedLines.join('\n');
        } catch (error) {
            console.error(`Error parsing line range "${lineRange}":`, error.message);
            return code;
        }
    }

    /**
     * Detect language from GitHub URL
     */
    function detectLanguage(url) {
        if (!url) return 'plaintext';
        const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
        if (!filenameMatch) return 'plaintext';
        const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
        const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
        return LANGUAGE_MAP[ext] || 'plaintext';
    }

    /**
     * Load CSS dynamically
     */
    function loadCSS(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * Load highlight.js library
     */
    function loadHighlightJS() {
        return new Promise((resolve, reject) => {
            if (window.hljs) {
                resolve(window.hljs);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
            script.onload = () => {
                if (window.hljs) {
                    resolve(window.hljs);
                } else {
                    reject(new Error('highlight.js failed to load'));
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Fetch GitHub code content
     */
    async function fetchGitHubCode(githubUrl, lineRange) {
        const rawUrl = getRawGitHubUrl(githubUrl);
        if (!rawUrl) {
            throw new Error(`Invalid GitHub URL format: ${githubUrl}`);
        }

        try {
            const response = await fetch(rawUrl);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`GitHub file not found (404): ${rawUrl}`);
                } else if (response.status === 403) {
                    throw new Error(`Access denied (403) for ${rawUrl}. Check if the repository is private or if rate limits were exceeded.`);
                }
                throw new Error(`GitHub fetch failed with status ${response.status}`);
            }

            const rawCode = await response.text();
            return extractLines(rawCode, lineRange);
        } catch (error) {
            throw new Error(`Failed to fetch GitHub code: ${error.message}`);
        }
    }

    /**
     * Render code block in container
     */
    async function renderCodeBlock(container, githubUrl, lineRange, theme) {
        try {
            // Show loading state
            container.innerHTML = `<div class="github-code-loading">Loading code from ${githubUrl}...</div>`;

            // Load theme CSS
            if (theme && THEMES[theme]) {
                await loadCSS(THEMES[theme]);
            }

            // Load highlight.js
            const hljs = await loadHighlightJS();

            // Fetch code
            const code = await fetchGitHubCode(githubUrl, lineRange);
            const language = detectLanguage(githubUrl);

            // Create code element
            const pre = document.createElement('pre');
            const codeElement = document.createElement('code');
            codeElement.className = `language-${language}`;
            codeElement.textContent = code;
            pre.appendChild(codeElement);

            // Clear container and add code
            container.innerHTML = '';
            container.className += ` code-block-container ${theme || 'github-light'}`;
            container.appendChild(pre);

            // Apply syntax highlighting
            hljs.highlightElement(codeElement);

        } catch (error) {
            console.error('Error rendering code block:', error);
            container.innerHTML = `
                <div class="github-code-error" style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">
                    Error: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Initialize all GitHub code blocks on the page
     */
    function initializeGitHubCodeBlocks() {
        const codeBlocks = document.querySelectorAll('.github-code-block');
        
        codeBlocks.forEach(container => {
            const githubUrl = container.dataset.githubUrl;
            const lineRange = container.dataset.lineRange || '';
            const theme = container.dataset.theme || 'github-light';

            if (githubUrl) {
                renderCodeBlock(container, githubUrl, lineRange, theme);
            } else {
                container.innerHTML = `
                    <div class="github-code-error" style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">
                        Error: Missing data-github-url attribute
                    </div>
                `;
            }
        });
    }

    /**
     * Public API
     */
    window.GitHubCodeBlock = {
        init: initializeGitHubCodeBlocks,
        render: renderCodeBlock,
        fetchCode: fetchGitHubCode
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGitHubCodeBlocks);
    } else {
        initializeGitHubCodeBlocks();
    }

})(window, document);