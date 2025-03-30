const MAX_DEPTH = 10; // Limit recursion depth for safety

// REMOVED processNode and TreeWalker logic - no longer needed for text markers

function fetchAndReplacePlaceholders() { // Renamed from fetchAndReplaceMarkers
    console.log("GitHub Theme Script: Searching for placeholder divs...");
    // Find placeholder divs instead of spans/text markers
    const placeholders = document.querySelectorAll('div.gh-code-placeholder-wrapper'); 
    console.log(`GitHub Theme Script: Found ${placeholders.length} placeholders to process.`);

    placeholders.forEach(placeholder => {
        // Prevent reprocessing
        if (placeholder.hasAttribute('data-github-processing')) return;
        placeholder.setAttribute('data-github-processing', 'true');

        // Read data attributes
        const url = placeholder.getAttribute('data-url');
        const lines = placeholder.getAttribute('data-lines');
        const theme = placeholder.getAttribute('data-theme');

        if (!url) {
            showError(placeholder, "Placeholder is missing data-url attribute.");
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
                // Replace the placeholder div with the fetched HTML
                const container = document.createElement('div');
                container.innerHTML = html;
                // Replace placeholder with the container's content or the container itself
                if (container.firstChild) {
                    if (placeholder.parentNode) { // Check parent exists
                         // Replace the placeholder div entirely
                        placeholder.parentNode.replaceChild(container.firstChild, placeholder);
                    } else {
                        console.warn("GitHub Theme Script: Placeholder has no parent during replacement:", placeholder);
                    }
                } else {
                    // Fallback if HTML is empty or just text
                     placeholder.textContent = "[Empty Response]";
                }
            })
            .catch(error => {
                console.error("GitHub Theme Script: Error fetching code for", url, error);
                showError(placeholder, `Error: ${error.message}`);
            });
    });
}

function showError(placeholderElement, message) {
    // Update placeholder content to show error
    placeholderElement.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red; background-color: #fee;"><strong>GitHub Code Error:</strong> ${escapeHtml(message)}</div>`; 
    // No need to remove processing attribute, keep it marked as processed (with error)
}

// Helper function for escaping HTML - needed for error message display
function escapeHtml(str) {
  return (str || '').toString()
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
}

// --- Initialization ---

// Directly call the function to find and replace placeholders
function initialScan() {
     console.log("GitHub Theme Script: Performing initial scan for placeholders...");
     // No need for DOM walking anymore, just query directly
     fetchAndReplacePlaceholders();
 }

// Run on DOMContentLoaded or immediately if already loaded 