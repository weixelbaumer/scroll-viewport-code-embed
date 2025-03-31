/**
 * GitHub Code Renderer - Scroll Viewport Theme Script v1.1.11
 * Finds ##GITHUB:url:lines:theme## markers and replaces them with code blocks.
 * Also processes anchor tags with class "gh-code-anchor-placeholder".
 */
(function() {
    console.log("GitHub Theme Script v1.1.11: Script loading");
    
    // Determine the base URL for the API. Assumes this script is served from the same origin as the API.
    // If hosted elsewhere, this needs to be configured.
    const scriptOrigin = document.currentScript ? document.currentScript.src : window.location.origin;
    // Derive API base URL (ensure HTTPS)
    let apiBaseUrl = new URL(scriptOrigin).origin;
    if (apiBaseUrl.startsWith("http://")) {
         apiBaseUrl = apiBaseUrl.replace("http://", "https://");
    }
    console.log("GitHub Theme Script: Initializing. API Base URL:", apiBaseUrl);

    const MARKER_PREFIX = '##GITHUB:';
    const MARKER_SUFFIX = '##';
    const MAX_DEPTH = 10; // Limit recursion depth for safety

    // Function to process nodes and find text markers
    function processNode(node, depth = 0) {
        if (depth > MAX_DEPTH) {
            console.warn("GitHub Theme Script: Max recursion depth reached for node", node);
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.nodeValue;
            if (text && text.includes(MARKER_PREFIX)) {
                // Use spans to wrap markers reliably before replacement
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                // Find all markers ##GITHUB:url|lines|theme##
                const regex = /##GITHUB:([^|#]+)\|([^|#]*)\|([^|#]+)##/g;

                while ((match = regex.exec(text)) !== null) {
                    const markerText = match[0];
                    const url = match[1];
                    const lines = match[2] || ''; // Can be empty
                    const theme = match[3];
                    const index = match.index;

                    // Add text before the marker
                    if (index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
                    }

                    // Create a span placeholder for the marker
                    const span = document.createElement('span');
                    span.setAttribute('data-github-marker', 'true');
                    span.setAttribute('data-url', url);
                    span.setAttribute('data-lines', lines);
                    span.setAttribute('data-theme', theme);
                    span.textContent = `Loading ${url}...`; // Placeholder text
                    span.style.display = 'inline-block'; // Prevent layout shifts
                    span.style.padding = '5px';
                    span.style.border = '1px dashed #ccc';
                    span.style.backgroundColor = '#f9f9f9';
                    fragment.appendChild(span);

                    lastIndex = index + markerText.length;
                }

                // Add any remaining text after the last marker
                if (lastIndex < text.length) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
                }

                // Replace the original text node with the fragment if markers were found
                if (lastIndex > 0) {
                     // Check if parent exists before replacing
                    if (node.parentNode) {
                        node.parentNode.replaceChild(fragment, node);
                    } else {
                         console.warn("GitHub Theme Script: Text node has no parent during replacement:", node);
                    }

                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes.length > 0) {
             // Check node name - avoid processing script/style tags etc.
            const tagName = node.tagName.toLowerCase();
            if (tagName === 'script' || tagName === 'style' || tagName === 'textarea' || node.closest('[data-github-fetched]')) {
                return; // Skip content of these tags and already fetched blocks
            }
            // Process child nodes recursively (using a copy of the list as it might change)
            Array.from(node.childNodes).forEach(child => processNode(child, depth + 1));
        }
    }

    // Function to handle text marker spans
    function fetchAndReplaceMarkers() {
        console.log("GitHub Theme Script: Searching for marker spans...");
        const spans = document.querySelectorAll('span[data-github-marker="true"]');
        console.log(`GitHub Theme Script: Found ${spans.length} spans to process.`);

        spans.forEach(span => {
            // Prevent reprocessing
            if (span.hasAttribute('data-github-processing')) return;
            span.setAttribute('data-github-processing', 'true');

            const url = span.getAttribute('data-url');
            const lines = span.getAttribute('data-lines');
            const theme = span.getAttribute('data-theme');

            if (!url) {
                showError(span, "Marker is missing URL.");
                return;
            }

            // Construct API URL (GET request to /html)
            const apiUrl = new URL(apiBaseUrl + "/html");
            apiUrl.searchParams.append('url', url);
            if (lines) {
                apiUrl.searchParams.append('lines', lines);
            }
            apiUrl.searchParams.append('theme', theme);

            console.log("GitHub Theme Script: Fetching", apiUrl.toString());

            fetch(apiUrl.toString())
                .then(response => {
                    if (!response.ok) {
                         return response.text().then(text => { throw new Error(`HTTP ${response.status}: ${text || response.statusText}`); });
                    }
                    return response.text(); // Expecting raw HTML
                })
                .then(html => {
                    // Replace the span with the fetched HTML
                    const container = document.createElement('div');
                     // Mark container to prevent reprocessing inner content
                    container.setAttribute('data-github-fetched', 'true');
                    container.innerHTML = html;
                    // Replace span with the container's content or the container itself
                    if (container.firstChild) {
                         // If the fetched HTML has a single root element, use that
                        if (container.childNodes.length === 1 && container.firstChild.nodeType === Node.ELEMENT_NODE) {
                            span.parentNode.replaceChild(container.firstChild, span);
                        } else {
                            // Otherwise, insert all children before the span and remove the span
                            while (container.firstChild) {
                                span.parentNode.insertBefore(container.firstChild, span);
                            }
                            span.parentNode.removeChild(span);
                        }
                    } else {
                        // Fallback if HTML is empty or just text
                         span.textContent = "[Empty Response]";
                    }
                })
                .catch(error => {
                    console.error("GitHub Theme Script: Error fetching code for", url, error);
                    showError(span, `Error: ${error.message}`);
                });
        });
    }

    // Function to process anchor placeholders
    function fetchAndReplaceAnchorPlaceholders() {
        console.log("GitHub Theme Script: Searching for anchor placeholders (class: gh-code-anchor-placeholder)...");
        
        // Dump all anchors for debugging
        const allAnchors = document.querySelectorAll('a');
        console.log(`GitHub Theme Script: DEBUG - Found ${allAnchors.length} total anchor elements on page`);
        
        if (allAnchors.length > 0 && allAnchors.length < 50) {
            console.log("GitHub Theme Script: DEBUG - Listing all anchors:");
            allAnchors.forEach((a, i) => {
                console.log(`Anchor ${i}: class="${a.className}", id="${a.id}", href="${a.href}"`);
            });
        }
        
        // Now search for our specific placeholders
        const anchors = document.querySelectorAll('a.gh-code-anchor-placeholder');
        console.log(`GitHub Theme Script: Found ${anchors.length} anchor placeholders to process.`);

        // Debug DOM structure if no anchors found
        if (anchors.length === 0) {
            console.log("GitHub Theme Script: DEBUG - Searching page source for gh-code-anchor-placeholder...");
            const htmlContent = document.documentElement.outerHTML;
            const hasAnchorInSource = htmlContent.includes('gh-code-anchor-placeholder');
            console.log(`GitHub Theme Script: DEBUG - Anchor placeholder found in page source: ${hasAnchorInSource}`);
            
            // Try alternate selector approach (might have class name mangling)
            const altAnchors = document.querySelectorAll('a[data-url]');
            console.log(`GitHub Theme Script: DEBUG - Found ${altAnchors.length} anchors with data-url attribute`);
            
            if (altAnchors.length > 0) {
                console.log("GitHub Theme Script: Using alternative anchors with data-url");
                processAnchors(altAnchors);
            }
        } else {
            processAnchors(anchors);
        }
    }
    
    // Helper function to process anchors
    function processAnchors(anchors) {
        anchors.forEach(anchor => {
            // Prevent reprocessing
            if (anchor.hasAttribute('data-github-processing')) return;
            anchor.setAttribute('data-github-processing', 'true');

            const url = anchor.getAttribute('data-url');
            const lines = anchor.getAttribute('data-lines');
            const theme = anchor.getAttribute('data-theme');
            
            console.log(`GitHub Theme Script: Processing anchor placeholder with ID ${anchor.id}`);
            console.log(`- URL: ${url}`);
            console.log(`- Lines: ${lines}`);
            console.log(`- Theme: ${theme}`);

            if (!url) {
                console.error(`GitHub Theme Script: Anchor ${anchor.id} is missing URL.`);
                return;
            }

            // Construct API URL (GET request to /html)
            const apiUrl = new URL(apiBaseUrl + "/html");
            apiUrl.searchParams.append('url', url);
            if (lines) {
                apiUrl.searchParams.append('lines', lines);
            }
            apiUrl.searchParams.append('theme', theme);

            console.log("GitHub Theme Script: Fetching", apiUrl.toString());

            fetch(apiUrl.toString())
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { 
                            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`); 
                        });
                    }
                    return response.text(); // Expecting raw HTML
                })
                .then(html => {
                    // Replace the anchor with the fetched HTML
                    const container = document.createElement('div');
                    // Mark container to prevent reprocessing inner content
                    container.setAttribute('data-github-fetched', 'true');
                    container.innerHTML = html;
                    
                    // Insert the container after the anchor
                    if (anchor.parentNode) {
                        anchor.parentNode.insertBefore(container, anchor.nextSibling);
                        // Keep the anchor but make it invisible
                        anchor.style.display = 'none';
                        anchor.style.visibility = 'hidden';
                    } else {
                        console.warn(`GitHub Theme Script: Anchor ${anchor.id} has no parent during replacement.`);
                    }
                })
                .catch(error => {
                    console.error(`GitHub Theme Script: Error fetching code for anchor ${anchor.id}:`, error);
                    // Add error indicator near the anchor
                    const errorNode = document.createElement('div');
                    errorNode.style.color = 'red';
                    errorNode.style.border = '1px solid red';
                    errorNode.style.padding = '5px';
                    errorNode.style.margin = '5px 0';
                    errorNode.style.backgroundColor = '#fee';
                    errorNode.textContent = `[GitHub Code Error: ${error.message}]`;
                    
                    if (anchor.parentNode) {
                        anchor.parentNode.insertBefore(errorNode, anchor.nextSibling);
                    }
                });
        });
    }

    function showError(spanElement, message) {
        spanElement.textContent = `[GitHub Code Error: ${message}]`;
        spanElement.style.color = 'red';
        spanElement.style.border = '1px solid red';
        spanElement.style.backgroundColor = '#fee';
        // Remove processing attribute so it might retry on mutation? No, keep it processed.
    }

    // --- Initialization ---

    // 1. Initial scan and wrapping of markers
    function initialScan() {
        console.log("GitHub Theme Script: Performing initial scan...");
        
        // Process text markers
        const contentArea = document.querySelector('.vp-article__content'); // <-- ADJUST SELECTOR if your theme uses a different class
        if (contentArea) {
            try {
                processNode(contentArea); // Scan only within the content area
                console.log("GitHub Theme Script: Scanned main content area successfully");
            } catch(e) {
                console.error("GitHub Theme Script: Error during initial scan within content area:", e);
            }
        } else {
            console.warn("GitHub Theme Script: Could not find main content area with selector '.vp-article__content'. Falling back to body scan.");
            // Fallback to scanning the whole body if specific container not found
            try {
                processNode(document.body);
            } catch(e) {
                console.error("GitHub Theme Script: Error during fallback body scan:", e);
            }
        }
         
        // Process text markers
        fetchAndReplaceMarkers();
        
        try {
            // Process anchor placeholders (new code)
            console.log("GitHub Theme Script: About to search for anchor placeholders...");
            fetchAndReplaceAnchorPlaceholders();
            console.log("GitHub Theme Script: Completed anchor placeholder search");
        } catch (e) {
            console.error("GitHub Theme Script: Error while processing anchor placeholders:", e);
        }
    }

    // A separate function to ensure anchor processing happens
    function ensureAnchorProcessing() {
        console.log("GitHub Theme Script: Running standalone anchor processing...");
        try {
            fetchAndReplaceAnchorPlaceholders();
        } catch (e) {
            console.error("GitHub Theme Script: Error in standalone anchor processing:", e);
        }
    }

    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log("GitHub Theme Script: DOMContentLoaded fired");
            initialScan();
            // Double check anchors after a slight delay
            setTimeout(ensureAnchorProcessing, 500);
        });
    } else {
        console.log("GitHub Theme Script: Document already loaded, running initialScan immediately");
        initialScan();
        // Double check anchors after a slight delay
        setTimeout(ensureAnchorProcessing, 500);
    }

    // Use MutationObserver to handle dynamically added content
    const observer = new MutationObserver((mutationsList) => {
        let needsTextProcessing = false;
        let anchorsAdded = false;
        
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(newNode => {
                    // Check for text nodes with markers
                    if (newNode.nodeType === Node.TEXT_NODE && newNode.nodeValue && newNode.nodeValue.includes(MARKER_PREFIX)) {
                        needsTextProcessing = true;
                        if (newNode.parentNode) {
                            processNode(newNode.parentNode);
                        }
                    } 
                    // Check for added anchor placeholders
                    else if (newNode.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's an anchor placeholder
                        if (newNode.tagName === 'A' && newNode.classList.contains('gh-code-anchor-placeholder')) {
                            anchorsAdded = true;
                            console.log("GitHub Theme Script: MutationObserver detected new anchor placeholder");
                        }
                        // Or if it contains text markers or anchor placeholders
                        else {
                            if (newNode.textContent && newNode.textContent.includes(MARKER_PREFIX)) {
                                needsTextProcessing = true;
                                processNode(newNode);
                            }
                            if (newNode.querySelector && newNode.querySelector('a.gh-code-anchor-placeholder')) {
                                anchorsAdded = true;
                                console.log("GitHub Theme Script: MutationObserver detected new child anchor placeholder");
                            }
                        }
                    }
                });
            }
        }
        
        if (needsTextProcessing) {
            console.log("GitHub Theme Script: Detected new text markers, processing...");
            fetchAndReplaceMarkers();
        }
        
        if (anchorsAdded) {
            console.log("GitHub Theme Script: Detected new anchor placeholders, processing...");
            fetchAndReplaceAnchorPlaceholders();
        }
    });

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    
    // Set up a periodic rescan as fallback (every 2 seconds)
    const rescanInterval = setInterval(() => {
        console.log("GitHub Theme Script: Performing periodic rescan...");
        fetchAndReplaceAnchorPlaceholders();
    }, 2000);
    
    // After 30 seconds, reduce scan frequency to save resources
    setTimeout(() => {
        console.log("GitHub Theme Script: Reducing scan frequency");
        clearInterval(rescanInterval);
        setInterval(fetchAndReplaceAnchorPlaceholders, 10000); // Every 10 seconds
    }, 30000);

    console.log("GitHub Theme Script: Initialization complete");
    // --- End Initialization ---
})(); 