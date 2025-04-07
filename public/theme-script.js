/**
 * GitHub Code Renderer - Scroll Viewport Theme Script v2.0.3 (Client-Side Fetch - Syntax Fix 3)
 * Finds anchors with class "github-code-anchor" and replaces them with
 * code blocks fetched and rendered entirely on the client-side.
 */
(function() {
    console.log("GitHub Theme Script v2.0.3 (Client-Side Fetch): Script loading");

    // --- Configuration ---
    const ANCHOR_SELECTOR = 'a.github-code-anchor'; // Class name MUST match output from src/routes/macro.js
    const MAX_RETRIES = 2; // Retries for fetching GitHub content
    const RETRY_DELAY_MS = 500; // Delay between retries
    // ---------------------

    // Helper function to escape HTML for inserting into code blocks
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        // Use single quotes for the outer string to avoid conflict with "
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"') // Correctly handled within single quotes
            .replace(/'/g, '&#039;'); // Correctly handled within single quotes
    }

    // Helper function to extract specific lines from code
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
                        console.warn(`[GitHub Theme Script] Invalid range format: ${trimmedRange}`);
                    }
                } else {
                    const lineNum = parseInt(trimmedRange, 10);
                    if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
                        selectedLines.push(lines[lineNum - 1]);
                    } else {
                        console.warn(`[GitHub Theme Script] Invalid line number: ${trimmedRange}`);
                    }
                }
            }
            return selectedLines.join('\n');
        } catch (error) {
            console.error(`[GitHub Theme Script] Error parsing line range "${lineRange}":`, error.message);
            return code;
        }
    }

    // Function to fetch raw content from GitHub with retries
    async function fetchGitHubContentWithRetry(url, retries = MAX_RETRIES) {
        console.log(`[GitHub Theme Script] Attempting to fetch: ${url}`);
        try {
            const response = await fetch(url, { mode: 'cors' });

            if (!response.ok) {
                if (response.status === 404) {
                     throw new Error(`GitHub fetch failed: Not Found (404)`);
                } else if (response.status === 403) {
                     const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                     if (rateLimitRemaining === '0') {
                         throw new Error(`GitHub fetch failed: Rate Limit Exceeded (403)`);
                     } else {
                         throw new Error(`GitHub fetch failed: Forbidden (403 - possibly private repo?)`);
                     }
                }
                throw new Error(`GitHub fetch failed: HTTP ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            if (retries > 0) {
                console.warn(`[GitHub Theme Script] Fetch failed for ${url}, retrying (${retries} left)... Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                return fetchGitHubContentWithRetry(url, retries - 1);
            } else {
                console.error(`[GitHub Theme Script] Fetch failed for ${url} after multiple retries.`);
                throw error;
            }
        }
    }

    // Function to transform GitHub page URL to raw content URL
    function getRawGitHubUrl(url) {
        if (!url) return null;
        try {
            if (url.includes('raw.githubusercontent.com')) {
                return url;
            }
            if (url.includes('github.com') && url.includes('/blob/')) {
                return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            }
             if (url.startsWith('github.com')) {
                 const pathPart = url.substring(url.indexOf('/') + 1);
                 return `https://raw.githubusercontent.com/${pathPart.replace('/blob/', '/')}`;
             }
            console.warn(`[GitHub Theme Script] Could not convert URL to raw format: ${url}`);
            return null;
        } catch (e) {
            console.error(`[GitHub Theme Script] Error converting URL ${url}: ${e.message}`);
            return null;
        }
    }

    // Function to detect language from URL for highlight.js
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
            sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
            dockerfile: 'dockerfile', groovy: 'groovy', scala: 'scala',
            perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
        };
        return langMap[ext] || 'plaintext';
    }

    // Main function to process anchors
    async function processAnchor(anchor) {
        if (anchor.hasAttribute('data-github-processed') || anchor.hasAttribute('data-github-processing')) {
            return;
        }
        anchor.setAttribute('data-github-processing', 'true');
        anchor.style.display = 'inline-block';
        anchor.textContent = `[Loading GitHub Code...]`;

        const githubUrl = anchor.getAttribute('data-url');
        const lines = anchor.getAttribute('data-lines');
        const theme = anchor.getAttribute('data-theme') || 'default';

        if (!githubUrl) {
            showError(anchor, "Anchor is missing data-url attribute.");
            anchor.setAttribute('data-github-processed', 'true');
            anchor.removeAttribute('data-github-processing');
            return;
        }

        const rawUrl = getRawGitHubUrl(githubUrl);
        if (!rawUrl) {
            showError(anchor, `Invalid or unsupported GitHub URL format: ${githubUrl}`);
            anchor.setAttribute('data-github-processed', 'true');
            anchor.removeAttribute('data-github-processing');
            return;
        }

        try {
            const rawCode = await fetchGitHubContentWithRetry(rawUrl);
            const codeToHighlight = extractLines(rawCode, lines);
            const language = detectLanguage(rawUrl);
            let highlightedCode;

            if (typeof hljs !== 'undefined') {
                try {
                    if (language !== 'plaintext' && hljs.getLanguage(language)) {
                        highlightedCode = hljs.highlight(codeToHighlight, { language: language, ignoreIllegals: true }).value;
                    } else {
                        highlightedCode = hljs.highlight(codeToHighlight, { language: 'plaintext' }).value;
                    }
                } catch(highlightError) {
                     console.error(`[GitHub Theme Script] highlight.js error for language ${language}:`, highlightError);
                     highlightedCode = escapeHtml(codeToHighlight);
                }
            } else {
                console.warn("[GitHub Theme Script] highlight.js (hljs) not found. Rendering plain text.");
                highlightedCode = escapeHtml(codeToHighlight);
            }

            const codeBlock = document.createElement('div');
            codeBlock.className = `code-block github-embed hljs ${theme}`;
            codeBlock.style.whiteSpace = 'pre';
            codeBlock.style.overflowX = 'auto';
            codeBlock.style.border = '1px solid #ccc';
            codeBlock.style.padding = '1em';
            codeBlock.style.backgroundColor = '#f8f8f8';

            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = `language-${language}`;
            code.innerHTML = highlightedCode;

            pre.appendChild(code);
            codeBlock.appendChild(pre);

            if (anchor.parentNode) {
                anchor.parentNode.replaceChild(codeBlock, anchor);
            } else {
                 console.warn("[GitHub Theme Script] Anchor lost its parent before replacement:", anchor);
            }

        } catch (error) {
            console.error(`[GitHub Theme Script] Failed to process anchor for ${githubUrl}:`, error);
            showError(anchor, `Error loading code: ${error.message}`);
            anchor.setAttribute('data-github-processed', 'true');
            anchor.removeAttribute('data-github-processing');
        }
    }

    // Function to display errors in place of the anchor
    function showError(anchorElement, message) {
        anchorElement.textContent = `[GitHub Code Error: ${message}]`;
        anchorElement.style.color = 'red';
        anchorElement.style.border = '1px solid red';
        anchorElement.style.backgroundColor = '#fee';
        anchorElement.style.padding = '5px';
        anchorElement.style.display = 'inline-block';
    }

    // Function to find and process all unprocessed anchors
    function processAllAnchors() {
        console.log(`[GitHub Theme Script] Searching for anchors with selector: ${ANCHOR_SELECTOR}`);
        const anchors = document.querySelectorAll(ANCHOR_SELECTOR);
        console.log(`[GitHub Theme Script] Found ${anchors.length} anchors.`);

        if (anchors.length === 0) {
             console.log("[GitHub Theme Script] No anchors found matching selector. Ensure server output matches.");
             const allAnchors = document.querySelectorAll('a[data-url]');
             console.log(`[GitHub Theme Script] DEBUG: Found ${allAnchors.length} anchors with data-url.`);
        }

        anchors.forEach(anchor => {
            if (!anchor.hasAttribute('data-github-processed') && !anchor.hasAttribute('data-github-processing')) {
                 processAnchor(anchor);
            }
        });
    }

    // --- Initialization ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processAllAnchors);
    } else {
        processAllAnchors();
    }

    // Optional: Use MutationObserver
    const observer = new MutationObserver((mutationsList) => {
        let needsProcessing = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(newNode => {
                    if (newNode.nodeType === Node.ELEMENT_NODE) {
                        if (newNode.matches(ANCHOR_SELECTOR)) {
                            needsProcessing = true;
                        } else if (newNode.querySelector && newNode.querySelector(ANCHOR_SELECTOR)) {
                            needsProcessing = true;
                        }
                    }
                });
            }
        }
        if (needsProcessing) {
            console.log("[GitHub Theme Script] MutationObserver detected potential new anchors. Re-scanning.");
            clearTimeout(observer.debounceTimeout);
            observer.debounceTimeout = setTimeout(processAllAnchors, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log("GitHub Theme Script v2.0.3: Initialization complete. Waiting for DOM ready / observing mutations.");

})();