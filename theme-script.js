const MAX_DEPTH = 10; // Limit recursion depth for safety

// REMOVED processNode and TreeWalker logic - no longer needed for text markers

function fetchAndReplacePlaceholders() { 
    console.log("GitHub Theme Script: Searching for hidden anchor placeholders...");
    // Find placeholder <a> elements
    const placeholders = document.querySelectorAll('a.gh-code-anchor-placeholder'); 
    console.log(`GitHub Theme Script: Found ${placeholders.length} anchor placeholders to process.`);

    placeholders.forEach(placeholder => {
        // Prevent reprocessing
        if (placeholder.hasAttribute('data-github-processing')) return;
        placeholder.setAttribute('data-github-processing', 'true');

        // Read data attributes from the anchor tag
        const url = placeholder.getAttribute('data-url');
        const lines = placeholder.getAttribute('data-lines');
        const theme = placeholder.getAttribute('data-theme');

        if (!url) {
            showError(placeholder, "Placeholder anchor is missing data-url attribute.");
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
                // Replace the placeholder <a> element with the fetched HTML
                const container = document.createElement('div'); // Use temp div to parse
                container.innerHTML = html; 
                // The fetched HTML should contain the final code block structure
                if (container.firstChild) {
                    if (placeholder.parentNode) { 
                         // Replace the placeholder <a> element entirely
                        placeholder.parentNode.replaceChild(container.firstChild, placeholder);
                    } else {
                        console.warn("GitHub Theme Script: Placeholder anchor has no parent during replacement:", placeholder);
                    }
                } else {
                     placeholder.textContent = "[Empty Response]"; // Should not happen if /html works
                }
            })
            .catch(error => {
                console.error("GitHub Theme Script: Error fetching code for", url, error);
                showError(placeholder, `Error: ${error.message}`);
            });
    });
}

function showError(placeholderElement, message) {
    // Display error message visibly, even though the placeholder was hidden
    const errorDiv = document.createElement('div');
    errorDiv.className = 'gh-code-error';
    errorDiv.innerHTML = `<div style="color: red; padding: 10px; border: 1px solid red; background-color: #fee;"><strong>GitHub Code Error:</strong> ${escapeHtml(message)}</div>`;
    
    // Replace the hidden anchor with the visible error message
    if (placeholderElement.parentNode) {
        placeholderElement.parentNode.replaceChild(errorDiv, placeholderElement);
    }
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