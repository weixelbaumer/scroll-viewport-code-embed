/**
 * GitHub Code Renderer - Scroll Viewport Theme Script v2
 * Finds and replaces hidden anchor placeholders with GitHub code blocks
 */
(function() {
    // Determine the base URL for the API
    const scriptOrigin = document.currentScript ? document.currentScript.src : window.location.origin;
    let apiBaseUrl = new URL(scriptOrigin).origin;
    if (apiBaseUrl.startsWith("http://")) {
        apiBaseUrl = apiBaseUrl.replace("http://", "https://");
    }
    console.log("[GitHub Theme Script] Initializing with API URL:", apiBaseUrl);

    function showError(placeholder, message) {
        console.error("[GitHub Theme Script] Error:", message);
        placeholder.style.display = 'block';
        placeholder.style.visibility = 'visible';
        placeholder.style.color = 'red';
        placeholder.style.padding = '10px';
        placeholder.style.border = '1px solid red';
        placeholder.style.backgroundColor = '#fee';
        placeholder.textContent = `[GitHub Code Error: ${message}]`;
    }

    function fetchAndReplacePlaceholders() {
        console.log("[GitHub Theme Script] Searching for anchor placeholders...");
        const placeholders = document.querySelectorAll('a.gh-code-anchor-placeholder');
        console.log(`[GitHub Theme Script] Found ${placeholders.length} anchor placeholders to process`);

        placeholders.forEach(placeholder => {
            // Skip if already processing
            if (placeholder.hasAttribute('data-github-processing')) {
                console.log("[GitHub Theme Script] Skipping already processing placeholder");
                return;
            }
            placeholder.setAttribute('data-github-processing', 'true');

            // Read data attributes
            const url = placeholder.getAttribute('data-url');
            const lines = placeholder.getAttribute('data-lines');
            const theme = placeholder.getAttribute('data-theme');

            console.log("[GitHub Theme Script] Processing placeholder:", {
                url: url,
                lines: lines,
                theme: theme
            });

            if (!url) {
                showError(placeholder, "Missing data-url attribute");
                return;
            }

            // Construct API URL
            const apiUrl = new URL(apiBaseUrl + "/html");
            apiUrl.searchParams.append('url', url);
            if (lines) {
                apiUrl.searchParams.append('lines', lines);
            }
            apiUrl.searchParams.append('theme', theme || 'github-light');

            console.log("[GitHub Theme Script] Fetching from:", apiUrl.toString());

            // Fetch and replace
            fetch(apiUrl.toString())
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
                        });
                    }
                    return response.text();
                })
                .then(html => {
                    console.log("[GitHub Theme Script] Received HTML response");
                    
                    // Create container for the fetched HTML
                    const container = document.createElement('div');
                    container.setAttribute('data-github-rendered', 'true');
                    container.innerHTML = html;

                    // Replace the placeholder with the rendered content
                    if (container.firstChild && placeholder.parentNode) {
                        console.log("[GitHub Theme Script] Replacing placeholder with rendered content");
                        placeholder.parentNode.replaceChild(container.firstChild, placeholder);
                    } else {
                        showError(placeholder, "Invalid HTML response or placeholder lost parent");
                    }
                })
                .catch(error => {
                    console.error("[GitHub Theme Script] Error fetching code:", error);
                    showError(placeholder, error.message);
                });
        });
    }

    // Set up MutationObserver to watch for new placeholders
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                // Check added nodes for placeholders
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches('a.gh-code-anchor-placeholder') || 
                            node.querySelector('a.gh-code-anchor-placeholder')) {
                            shouldProcess = true;
                        }
                    }
                });
            }
        }

        if (shouldProcess) {
            console.log("[GitHub Theme Script] New placeholders detected, processing...");
            fetchAndReplacePlaceholders();
        }
    });

    // Start observing the entire document
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Initial scan
    console.log("[GitHub Theme Script] Performing initial scan...");
    fetchAndReplacePlaceholders();

    // Re-scan periodically in case observer misses something
    setInterval(fetchAndReplacePlaceholders, 2000);
})(); 