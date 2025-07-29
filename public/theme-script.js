/**
 * Scroll Viewport Custom Theme JavaScript  
 * Version: 3.1.8 (Line Numbers Fix - synchronized with Confluence app)
 * 
 * This script provides custom functionality for the Scroll Viewport theme including:
 * - Module 0: GitHub Code Processing
 * - Module 1: Canonical Link Tag Injection for SEO
 * - Module 2: JDoodle Code Example Embed Injection (Currently Disabled)
 * - Module 3: Footer Privacy Policy Link Injection
 * - Module 4: Bing Search Console Meta Tag Injection
 * - Module 5: Legacy Notice Injection for iText 5 Articles
 * - Module 6: Release Version Variable Changer
 * - Module 7: Search Parameter Redirection
 * - Module 8: "Did you know?" Info Box Injection
 */

// --- Module 0: GitHub Code Processing ---
/**
 * Process GitHub code markers in the content
 * This module handles ##GITHUB:url|lines|theme## markers and converts them to highlighted code blocks
 */
(function() {
    'use strict';
    
    const GITHUB_MARKER_PATTERN = /##GITHUB:([^#]+)##/g;
    const GITHUB_LOG_PREFIX = '[GitHub Code]';
    
    // CSS is embedded directly in Scroll Viewport - no dynamic loading needed
    
    // Load highlight.js once
    if (!window.hljsLoadPromise) {
        window.hljsLoadPromise = vp.loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js')
            .then(() => {
                // Load the theme CSS
                const linkEl = document.createElement('link');
                linkEl.rel = 'stylesheet';
                linkEl.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
                document.head.appendChild(linkEl);
                console.log(`${GITHUB_LOG_PREFIX} highlight.js loaded successfully`);
                return window.hljs;
            })
            .catch(err => {
                console.error(`${GITHUB_LOG_PREFIX} Failed to load highlight.js:`, err);
                return null;
            });
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    /**
     * Convert GitHub URL to raw content URL
     */
    function getRawGitHubUrl(url) {
        if (!url) return null;
        
        // Already a raw URL
        if (url.includes('raw.githubusercontent.com')) {
            return url;
        }
        
        // Convert blob URL to raw URL
        if (url.includes('github.com') && url.includes('/blob/')) {
            return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }
        
        return null;
    }
    
    /**
     * Detect programming language from file extension
     */
    function detectLanguage(url) {
        if (!url) return 'plaintext';
        
        const match = url.match(/\.([^./?#]+)(?:[?#]|$)/);
        const ext = match ? match[1].toLowerCase() : '';
        
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
    
    /**
     * Extract specific lines from code
     */
    function extractLines(code, lineSpec) {
        if (!lineSpec) return code;
        
        const lines = code.split('\n');
        const selected = [];
        
        lineSpec.split(',').forEach(range => {
            range = range.trim();
            
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(n => parseInt(n, 10));
                if (!isNaN(start) && !isNaN(end)) {
                    selected.push(...lines.slice(Math.max(0, start - 1), Math.min(lines.length, end)));
                }
            } else {
                const lineNum = parseInt(range, 10);
                if (!isNaN(lineNum) && lines[lineNum - 1] !== undefined) {
                    selected.push(lines[lineNum - 1]);
                }
            }
        });
        
        return selected.join('\n');
    }
    
    /**
     * Fetch and render GitHub code with retry logic
     */
    async function fetchAndRenderCode(url, lines, theme, container, retryCount = 0) {
        const maxRetries = 2;
        const retryDelay = 1000;
        
        try {
            console.log(`${GITHUB_LOG_PREFIX} Fetching: ${url}`);
            
            // Fetch the code through our app backend to avoid CORS issues
            const proxyUrl = `https://dev.tandav.com/app/fetch-github-code?url=${encodeURIComponent(url)}&lines=${encodeURIComponent(lines || '')}&theme=${encodeURIComponent(theme || 'github-light')}`;
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 403) {
                    throw new Error(`GitHub API rate limit exceeded (403). Please try again later.`);
                } else if (response.status === 404) {
                    throw new Error(`GitHub file not found (404). Check the URL: ${url}`);
                } else if (response.status === 401) {
                    throw new Error(`Access denied (401). The repository may be private or URL incorrect.`);
                } else {
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
            }
            
            const responseData = await response.json();
            if (!responseData.success) {
                throw new Error(responseData.error || 'Unknown error from server');
            }
            
            const codeToHighlight = responseData.code;
            const language = responseData.language;
            
            console.log(`${GITHUB_LOG_PREFIX} Successfully fetched ${responseData.extractedLength} characters for ${language}`);
            
            // Wait for highlight.js to load
            const hljs = await window.hljsLoadPromise;
            
            let highlightedCode;
            if (hljs && hljs.getLanguage(language)) {
                try {
                    highlightedCode = hljs.highlight(codeToHighlight, { language }).value;
                } catch (e) {
                    console.warn(`${GITHUB_LOG_PREFIX} Highlighting failed for ${language}:`, e);
                    highlightedCode = escapeHtml(codeToHighlight);
                }
            } else {
                console.warn(`${GITHUB_LOG_PREFIX} No highlighter for ${language}, using plain text`);
                highlightedCode = escapeHtml(codeToHighlight);
            }
            
            // Create the code block with line numbers
            const codeBlock = document.createElement('div');
            codeBlock.className = 'github-code-block';
            codeBlock.setAttribute('data-theme', theme || 'github-light');
            codeBlock.setAttribute('data-github-processed', 'true');
            
            // Split code into lines and add line numbers
            const codeLines = codeToHighlight.split('\n');
            let lineNumberedHtml = '';
            
            codeLines.forEach((line, index) => {
                const lineNumber = index + 1;
                const highlightedLine = hljs && hljs.getLanguage(language) 
                    ? (hljs.highlight(line, { language }).value || escapeHtml(line))
                    : escapeHtml(line);
                
                lineNumberedHtml += `
                    <div class="code-line">
                        <span class="line-number">${lineNumber}</span>
                        <span class="line-content">${highlightedLine}</span>
                    </div>`;
            });
            
            // Add GitHub-style code block with line numbers
            codeBlock.innerHTML = `
                <div class="github-code-header">
                    <span class="github-code-language">${language}</span>
                    <a href="${url}" target="_blank" rel="noopener" class="github-code-link">View on GitHub</a>
                </div>
                <div class="github-code-content">
                    ${lineNumberedHtml}
                </div>
            `;
            
            // Replace the container
            if (container.parentNode) {
                container.parentNode.replaceChild(codeBlock, container);
                console.log(`${GITHUB_LOG_PREFIX} Successfully rendered code block for ${url}`);
            } else {
                console.error(`${GITHUB_LOG_PREFIX} Container has no parent node`);
            }
            
        } catch (error) {
            console.error(`${GITHUB_LOG_PREFIX} Failed to fetch code (attempt ${retryCount + 1}):`, error);
            
            // Retry logic
            if (retryCount < maxRetries && !error.message.includes('404') && !error.message.includes('Invalid GitHub URL')) {
                console.log(`${GITHUB_LOG_PREFIX} Retrying in ${retryDelay}ms...`);
                setTimeout(() => {
                    fetchAndRenderCode(url, lines, theme, container, retryCount + 1);
                }, retryDelay);
                return;
            }
            
            // Final error display
            container.className = 'github-code-error';
            container.innerHTML = `
                <strong>GitHub Code Error:</strong><br>
                ${escapeHtml(error.message)}<br>
                <small>URL: ${escapeHtml(url)}</small>
            `;
        }
    }
    
    /**
     * Process all GitHub markers in the document
     */
    function processGitHubMarkers() {
        console.log(`${GITHUB_LOG_PREFIX} Processing GitHub code markers...`);
        
        // Clear processed marker tracking for fresh start
        let processedMarkers = new Set();
        let globalDelayIndex = 0;
        
        // Find all text nodes containing GitHub markers using a simpler approach
        function findTextNodesWithMarkers(element) {
            const textNodes = [];
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: node => {
                        // Skip script, style, and already processed elements
                        const parent = node.parentElement;
                        if (parent.closest('script, style, noscript')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        // Skip already processed nodes
                        if (parent.hasAttribute('data-github-processed') || 
                            parent.closest('.github-code-block, .github-code-loading, .github-code-error')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        // Accept nodes with GitHub markers
                        return node.nodeValue && node.nodeValue.includes('##GITHUB:') 
                            ? NodeFilter.FILTER_ACCEPT 
                            : NodeFilter.FILTER_REJECT;
                    }
                }
            );
            
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            return textNodes;
        }
        
        const nodesToProcess = findTextNodesWithMarkers(document.body);
        console.log(`${GITHUB_LOG_PREFIX} Found ${nodesToProcess.length} text nodes with GitHub markers`);
        
        nodesToProcess.forEach((textNode, nodeIndex) => {
            try {
                const text = textNode.nodeValue;
                const matches = [...text.matchAll(GITHUB_MARKER_PATTERN)];
                
                if (matches.length === 0) return;
                
                console.log(`${GITHUB_LOG_PREFIX} Processing ${matches.length} markers in text node ${nodeIndex + 1}`);
                
                const parent = textNode.parentNode;
                if (!parent) return;
                
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                
                matches.forEach((match, matchIndex) => {
                    const [fullMatch, params] = match;
                    const index = match.index;
                    
                    // Parse marker parameters first
                    const [url, lines, theme] = params.split('|').map(s => s?.trim());
                    const markerKey = `${url}-${index}-${Date.now()}`;
                    
                    // Add text before the marker
                    if (index > lastIndex) {
                        const textBefore = text.substring(lastIndex, index);
                        if (textBefore.trim()) {
                            fragment.appendChild(document.createTextNode(textBefore));
                        }
                    }
                    
                    if (!url) {
                        console.warn(`${GITHUB_LOG_PREFIX} Empty URL in marker ${matchIndex + 1}`);
                        lastIndex = index + fullMatch.length;
                        return;
                    }
                    
                    // Skip if already processed (shouldn't happen but safety check)
                    if (processedMarkers.has(markerKey)) {
                        console.log(`${GITHUB_LOG_PREFIX} Skipping already processed marker: ${url}`);
                        lastIndex = index + fullMatch.length;
                        return;
                    }
                    processedMarkers.add(markerKey);
                    
                    // Create unique placeholder with better identification
                    const placeholder = document.createElement('div');
                    placeholder.className = 'github-code-loading';
                    placeholder.setAttribute('data-github-url', url);
                    placeholder.setAttribute('data-github-index', `node-${nodeIndex}-match-${matchIndex}-global-${globalDelayIndex}`);
                    placeholder.setAttribute('data-github-processed', 'loading');
                    placeholder.textContent = `Loading GitHub code from ${url.split('/').pop()}... (${globalDelayIndex + 1})`;
                    
                    fragment.appendChild(placeholder);
                    
                    console.log(`${GITHUB_LOG_PREFIX} Created placeholder ${globalDelayIndex + 1} for ${url}`);
                    
                    // Stagger requests with increasing delays
                    const delay = globalDelayIndex * 300; // Increased delay between requests
                    setTimeout(() => {
                        console.log(`${GITHUB_LOG_PREFIX} Starting fetch for placeholder ${globalDelayIndex + 1}: ${url}`);
                        fetchAndRenderCode(url, lines, theme, placeholder);
                    }, delay);
                    
                    globalDelayIndex++;
                    lastIndex = index + fullMatch.length;
                });
                
                // Add remaining text
                if (lastIndex < text.length) {
                    const textAfter = text.substring(lastIndex);
                    if (textAfter.trim()) {
                        fragment.appendChild(document.createTextNode(textAfter));
                    }
                }
                
                // Mark parent as processed to prevent re-processing
                parent.setAttribute('data-github-processing', 'true');
                
                // Replace the original text node
                parent.replaceChild(fragment, textNode);
                
            } catch (error) {
                console.error(`${GITHUB_LOG_PREFIX} Error processing text node:`, error);
            }
        });
        
        console.log(`${GITHUB_LOG_PREFIX} Queued ${globalDelayIndex} GitHub code blocks for processing`);
    }
    
    // Export globally for compatibility
    window.processGitHubCodeMarkers = processGitHubMarkers;
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processGitHubMarkers);
    } else {
        // Small delay to ensure Scroll Viewport has finished rendering
        setTimeout(processGitHubMarkers, 100);
    }
    
    // Re-process on Scroll Viewport navigation
    window.addEventListener('viewport.page.ready', () => {
        setTimeout(processGitHubMarkers, 100);
    });
})();


// --- Module 1: Canonical Link Tag Injection for SEO ---
/**
 * Conditionally de-indexes pages by injecting a canonical link tag.
 * This is an alternative approach for SPA frameworks like K15t Scroll Viewport
 * that aggressively overwrite the <head> tag, making 'noindex' injection difficult.
 */
(function() {
    'use strict';

    const CANONICAL_TAG_ID = 'dynamic-canonical-tag';
    const LOG_PREFIX = '[Canonical-Script]';
    const HOME_PAGE_URL = window.location.protocol + '//' + window.location.hostname + '/';

    let canonicalScriptObserver = null;

    /**
     * Enforce canonical tag rules based on current URL
     */
    const enforceCanonicalRule = () => {
        if (!canonicalScriptObserver) {
            console.warn(`${LOG_PREFIX} Observer not initialized yet. Skipping rule enforcement.`);
            return;
        }

        const url = window.location.href;
        const shouldAddCanonical = url.includes('search.html') || url.includes('__attachment');
        const tagExists = !!document.getElementById(CANONICAL_TAG_ID);

        // Temporarily disconnect observer to prevent infinite loops
        canonicalScriptObserver.disconnect();

        if (shouldAddCanonical && !tagExists) {
            const link = document.createElement('link');
            link.setAttribute('id', CANONICAL_TAG_ID);
            link.setAttribute('rel', 'canonical');
            link.setAttribute('href', HOME_PAGE_URL);
            document.head.appendChild(link);
            console.log(`${LOG_PREFIX} Canonical tag injected, pointing to ${HOME_PAGE_URL}`);
        } else if (!shouldAddCanonical && tagExists) {
            document.getElementById(CANONICAL_TAG_ID).remove();
            console.log(`${LOG_PREFIX} Custom canonical tag removed.`);
        }

        // Reconnect observer
        canonicalScriptObserver.observe(document.head, { childList: true });
    };

    /**
     * Initialize canonical script with MutationObserver
     */
    const initializeCanonicalScript = () => {
        if (!document.head) {
            console.log(`${LOG_PREFIX} document.head not ready, retrying...`);
            setTimeout(initializeCanonicalScript, 50);
            return;
        }

        console.log(`${LOG_PREFIX} Initializing script...`);

        canonicalScriptObserver = new MutationObserver(() => {
            console.log(`${LOG_PREFIX} Mutation detected in <head>. Re-enforcing rule.`);
            enforceCanonicalRule();
        });

        window.addEventListener('viewport.page.ready', () => {
            console.log(`${LOG_PREFIX} 'viewport.page.ready' event detected. Enforcing rule.`);
            enforceCanonicalRule();
        });

        console.log(`${LOG_PREFIX} Performing initial rule enforcement.`);
        enforceCanonicalRule();
    };

    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCanonicalScript);
    } else {
        initializeCanonicalScript();
    }
})();


// --- Module 3: Footer Privacy Policy Link Injection ---
/**
 * Injects a "Privacy Policy" link into the footer's links section.
 */
(function() {
    'use strict';

    const injectPrivacyPolicyLink = () => {
        console.log('Attempting to inject Privacy Policy link into footer...');

        try {
            const footerLinksContainer = document.querySelector('footer .footer__links');

            if (footerLinksContainer) {
                // Check if already exists
                if (!footerLinksContainer.querySelector('a[href="https://itextpdf.com/how-buy/legal/privacy-policy"]')) {
                    // Create separator
                    const separatorSpan = document.createElement('span');
                    separatorSpan.classList.add('footer__links--separator');
                    separatorSpan.setAttribute('aria-hidden', 'true');
                    separatorSpan.textContent = '/ ';

                    // Create link
                    const newLink = document.createElement('a');
                    newLink.href = 'https://itextpdf.com/how-buy/legal/privacy-policy';
                    newLink.textContent = 'Privacy Policy';
                    newLink.classList.add('hc-footer-font-color');
                    newLink.rel = 'noopener';
                    newLink.target = '_blank';

                    // Append both
                    footerLinksContainer.appendChild(separatorSpan);
                    footerLinksContainer.appendChild(newLink);

                    console.log('Successfully injected "Privacy Policy" link.');
                }
            } else {
                console.error('Error: Could not find footer links container.');
            }
        } catch (e) {
            console.error('Error during Privacy Policy link injection:', e);
        }
    };

    // Execute on page ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPrivacyPolicyLink);
    } else {
        injectPrivacyPolicyLink();
    }
    
    window.addEventListener('viewport.page.ready', injectPrivacyPolicyLink);
})();


// --- Module 4: Bing Search Console Meta Tag Injection ---
/**
 * Injects a Bing Search Console verification meta tag into the document's <head>.
 */
(function() {
    'use strict';

    function addMetaTag(name, content) {
        if (document.querySelector(`meta[name="${name}"]`)) {
            console.log(`Meta tag with name "${name}" already exists.`);
            return;
        }

        const meta = document.createElement('meta');
        meta.setAttribute('name', name);
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
        console.log(`Successfully injected meta tag: name="${name}" content="${content}"`);
    }

    const injectBingMetaTag = () => {
        console.log('Attempting to inject Bing Search Console meta tag...');
        
        if (document.head) {
            addMetaTag("msvalidate.01", "47B3FB3D92DE441C9073DD4A12A888FF");
        }

        // Log page ID for debugging
        const pageId = document.documentElement.getAttribute('data-vp-page-id');
        if (pageId) {
            console.log('The Scroll Viewport page ID is:', pageId);
        }
    };

    // Execute immediately if head is available
    if (document.head) {
        injectBingMetaTag();
    } else {
        document.addEventListener('DOMContentLoaded', injectBingMetaTag);
    }
})();


// --- Module 5: Legacy Notice Injection for iText 5 Articles ---
/**
 * Inserts a "Legacy notice" HTML block at the top of articles within the 'it5kb' space.
 */
(function() {
    'use strict';

    async function insertLegacyNotice() {
        console.log('Attempting to inject Legacy Notice...');

        const spaceMeta = document.querySelector('meta[name="repository-base-url"]');
        const titleMeta = document.querySelector('meta[name="title"]');

        if (spaceMeta && spaceMeta.content.toLowerCase().includes('/it5kb')) {
            console.log('This article is in the "it5kb" space. Injecting legacy notice.');

            const htmlContent = `
                <div class="confluence-information-macro confluence-information-macro-warning conf-macro output-block" 
                     data-hasbody="true" data-macro-name="warning" 
                     style="border: 1px solid red; padding: 10px; margin: 10px; text-align:left;">
                    <h3 class="title" style="color:red;">⚠️ Legacy notice!</h3>
                    <div class="confluence-information-macro-body">
                        <span style="color: rgb(81,81,81);">
                            iText 5 is the previous major version of iText's leading PDF SDK. iText 5 is EOL, 
                            and is no longer developed, although we still provide support and security fixes. 
                            Switch your project to <a rel="nofollow" href="https://kb.itextpdf.com/itext">iText 9</a>, 
                            our latest version which supports the latest PDF standards and technologies.<br/>
                            <span style="text-align:center; margin: 0;">
                                <a class="itext-7-related" 
                                   href="https://kb.itextpdf.com/search.html?l=en&max=10&ol=&q=${encodeURIComponent(titleMeta ? titleMeta.content : '')}&s=itext&start=0">
                                   Check related iText 9 content!
                                </a>
                            </span>
                        </span>
                    </div>
                </div>`;

            const target = document.getElementById('article-content');
            if (target) {
                const container = document.createElement('div');
                container.innerHTML = htmlContent;
                target.prepend(container.firstElementChild);
                console.log('Legacy info injected successfully!');
            }
        }
    }

    // Execute when ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        insertLegacyNotice();
    } else {
        document.addEventListener('DOMContentLoaded', insertLegacyNotice);
    }
})();


// --- Module 6: Release Version Variable Changer ---
/**
 * Replaces specific placeholder strings with their corresponding release version numbers
 */
(function() {
    'use strict';

    const LOG_PREFIX = '[Module 6]';
    console.log(`${LOG_PREFIX} Initializing release version changer.`);

    const replacements = {
        '$release-license-base-variable': '4.2.2',
        '$release-license-remote-variable': '4.2.2',
        '$release-pdfOffice-variable': '2.0.5',
        '$release-pdfOptimizer-variable': '4.0.2',
        '$release-pdfOCR-variable': '4.0.2',
        '$release-core-7-variable': '9.2.0',
        '$release-pdfCalligraph-variable': '5.0.2',
        '$release-pdfHTML-variable': '6.2.0',
        '$release-pdfRender-variable': '2.0.4',
        '$release-pdfSweep-variable': '5.0.2',
        '$release-pdfXFA-variable': '5.0.2',
        '$release-license-variable': '3.1.6',
        '$release-license-volume-variable': '3.1.6'
    };

    // Pre-compile regular expressions
    const regexMap = new Map(
        Object.entries(replacements).map(([key, value]) => {
            const escapedKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            return [key, { regex: new RegExp(escapedKey, 'gi'), value }];
        })
    );

    /**
     * Replace version variables in the document
     */
    const changeReleaseVersions = () => {
        console.log(`${LOG_PREFIX} Starting release version replacement process.`);
        const startTime = performance.now();

        // Handle code blocks separately
        document.querySelectorAll('pre code').forEach(codeBlock => {
            let originalText = codeBlock.textContent;
            let modifiedText = originalText;
            let hasChanged = false;

            for (const [, { regex, value }] of regexMap) {
                if (regex.test(modifiedText)) {
                    modifiedText = modifiedText.replace(regex, value);
                    hasChanged = true;
                }
            }

            if (hasChanged) {
                console.log(`${LOG_PREFIX} Found and replaced variables in a CODE block.`);
                codeBlock.textContent = modifiedText;

                // Re-apply highlighting if available
                if (window.hljs && typeof window.hljs.highlightElement === 'function') {
                    try {
                        window.hljs.highlightElement(codeBlock);
                        console.log(`${LOG_PREFIX} Successfully re-highlighted a code block.`);
                    } catch (e) {
                        console.error(`${LOG_PREFIX} Error re-highlighting code block:`, e);
                    }
                }
            }
        });

        // Handle all other text nodes
        const textWalker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (node.parentElement.closest('script, style, textarea, [contenteditable], pre, code')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    if (!node.nodeValue.includes('$')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let currentNode;
        while (currentNode = textWalker.nextNode()) {
            let originalValue = currentNode.nodeValue;
            let modifiedValue = originalValue;
            let hasChanged = false;

            for (const [, { regex, value }] of regexMap) {
                if (regex.test(modifiedValue)) {
                    modifiedValue = modifiedValue.replace(regex, value);
                    hasChanged = true;
                }
            }

            if (hasChanged) {
                currentNode.nodeValue = modifiedValue;
            }
        }

        const endTime = performance.now();
        console.log(`${LOG_PREFIX} Release version replacement completed in ${Math.round(endTime - startTime)}ms.`);
    };

    // Schedule execution with delay
    const executionDelay = 500;
    let timeoutId = null;

    const scheduleExecution = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(changeReleaseVersions, executionDelay);
    };

    // Run on initial load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleExecution);
    } else {
        scheduleExecution();
    }

    // Also listen for Scroll Viewport page changes
    window.addEventListener('viewport.page.ready', scheduleExecution);
})();


// --- Module 7: Search Parameter Redirection ---
/**
 * Modifies search URL parameters for Scroll Viewport's search pages.
 */
(function() {
    'use strict';

    console.log('[Module 7] Initializing Search Parameter Redirection module.');

    if (window.scrollHelpCenter && window.scrollHelpCenter.isSearch) {
        console.log('[Module 7] Search page detected. Proceeding with parameter analysis.');

        const urlParams = new URLSearchParams(window.location.search);
        let qParam = urlParams.get('q') || '';
        let lParam = urlParams.get('l') || '';

        console.log(`[Module 7] Initial qParam: '${qParam}', Initial lParam: '${lParam}'`);

        function isValidParam(param) {
            const isValid = param && param.length >= 2 && param.toLowerCase() !== 'search.html';
            console.log(`[Module 7] isValidParam('${param}'): ${isValid}`);
            return isValid;
        }

        let updateQParam = false;

        if (!isValidParam(qParam)) {
            console.log('[Module 7] Initial qParam is invalid. Checking alternatives.');
            
            if (isValidParam(lParam) && lParam.toLowerCase() !== 'en') {
                qParam = lParam;
                updateQParam = true;
                console.log(`[Module 7] Using lParam for qParam: '${qParam}'`);
            } else {
                const pathSegments = window.location.pathname.split('/').filter(Boolean);
                const lastSegment = pathSegments.pop() || '';
                console.log(`[Module 7] Fallback to last path segment: '${lastSegment}'`);
                
                if (isValidParam(lastSegment) && lastSegment.toLowerCase() !== 'search.html') {
                    qParam = lastSegment.replace(/[_]/g, ' ');
                    updateQParam = true;
                    console.log(`[Module 7] Using last path segment for qParam: '${qParam}'`);
                }
            }
        }

        let updateLParam = lParam.toLowerCase() !== 'en';
        console.log(`[Module 7] Update lParam needed: ${updateLParam}`);

        if (updateQParam || updateLParam) {
            console.log('[Module 7] Redirection logic entered.');
            
            if (updateQParam) {
                urlParams.set('q', qParam);
                console.log(`[Module 7] Set 'q' parameter to: '${qParam}'`);
            }
            
            if (updateLParam) {
                urlParams.set('l', 'en');
                console.log(`[Module 7] Set 'l' parameter to: 'en'`);
            }

            const newSearchString = urlParams.toString();
            console.log(`[Module 7] Attempting redirect to: ${window.location.pathname}?${newSearchString}`);
            window.location.search = newSearchString;
        } else {
            console.log('[Module 7] No search parameter updates needed.');
        }
    } else {
        console.log('[Module 7] Not a search page or window.scrollHelpCenter is not defined.');
    }
})();


// --- Module 8: "Did you know?" Info Box Injection for iText Space ---
/**
 * Inserts a "Did you know?" informational HTML block at the top of articles
 */
(function() {
    'use strict';

    async function insertDidYouKnowNotice() {
        console.log('Attempting to inject "Did you know?" info box...');

        const spaceMeta = document.querySelector('meta[name="repository-base-url"]');
        const excludedPageIdentifier = 'how-can-i-find-code-examples-for-specific-itext-ve';
        const currentPageUrl = window.location.href;

        if (currentPageUrl.includes(excludedPageIdentifier)) {
            console.log(`"Did you know?" info box injection skipped: excluded page.`);
            return;
        }

        if (spaceMeta && spaceMeta.content.toLowerCase().includes('/itext')) {
            console.log('This article is in the "itext" space. Injecting "Did you know?" notice.');

            const htmlContent = `
                <div class="panel-macro panel-macro--info panel-macros--info" 
                     role="note" aria-label="Information" data-type="info">
                    <div class="panel-macro__icon panel-macros--info__icon">
                        <img aria-hidden="true" 
                             src="../__theme/images/common/info-macro-icon--39985156a8a940b9a79d.svg">
                    </div>
                    <div class="panel-macro__content panel-macros--info__content">
                        <p class="panel-macro__content--heading panel-macros--info__content--heading">Did you know?</p>
                        <p>
                            You can find <strong>up-to-date versions</strong> 
                            of all examples on our GitHub, or get ones tailor-made for 
                            <strong>specific iText releases</strong>?
                        </p>
                        <p>
                            <a href="https://kb.itextpdf.com/itext/how-can-i-find-code-examples-for-specific-itext-ve" 
                               rel="noopener noreferrer">Learn how!</a>
                        </p>
                    </div>
                </div>`;

            const target = document.getElementById('main-content');
            if (target) {
                const container = document.createElement('div');
                container.innerHTML = htmlContent;
                target.prepend(container.firstElementChild);
                console.log('"Did you know?" info box injected successfully!');
            }
        }
    }

    // Execute when ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        insertDidYouKnowNotice();
    } else {
        document.addEventListener('DOMContentLoaded', insertDidYouKnowNotice);
    }
})();