/**
 * GitHub Code Renderer - Scroll Viewport Theme Script v2
 * Finds ##GITHUB:url:lines:theme## markers and replaces them with code blocks.
 */
(function() {
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
                // Find all markers ##GITHUB:url:lines:theme##
                const regex = /##GITHUB:([^:]+):([^:]*):([^#]+)##/g;

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

    function fetchAndReplaceMarkers() {
        console.log("GitHub Theme Script: Searching for marker spans...");
        const spans = document.querySelectorAll('span[data-github-marker="true"]');
        console.log(`GitHub Theme Script: Found ${spans.length} markers to process.`);

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
         try {
             processNode(document.body);
         } catch(e) {
             console.error("GitHub Theme Script: Error during initial scan:", e);
         }
         // 2. Fetch and replace the wrapped markers
         fetchAndReplaceMarkers();
     }


    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialScan);
    } else {
        initialScan();
    }

    // Optional: Use MutationObserver to handle dynamically added content
    // This adds complexity but makes it work if Confluence/Viewport loads content late
    /*
    const observer = new MutationObserver((mutationsList) => {
        let needsProcessing = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(newNode => {
                    if (newNode.nodeType === Node.TEXT_NODE && newNode.nodeValue.includes(MARKER_PREFIX)) {
                       needsProcessing = true;
                       processNode(newNode.parentNode); // Process parent if text node added directly
                    } else if (newNode.nodeType === Node.ELEMENT_NODE) {
                        // Check if the new node *contains* markers
                        if (newNode.textContent.includes(MARKER_PREFIX)) {
                            needsProcessing = true;
                            processNode(newNode);
                        }
                    }
                });
            } else if (mutation.type === 'characterData' && mutation.target.nodeValue.includes(MARKER_PREFIX)) {
                 needsProcessing = true;
                 processNode(mutation.target); // Process the changed text node
             }
        }
        if (needsProcessing) {
            console.log("GitHub Theme Script: Detected mutations, re-scanning for markers...");
            fetchAndReplaceMarkers();
        }
    });

    // Start observing the body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });
    */
    // --- End Initialization ---

})(); 