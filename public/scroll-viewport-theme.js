/**
 * GitHub Code Renderer for Scroll Viewport
 * Ultra-minimal self-contained version
 */
(function() {
  // Create a namespace to avoid global conflicts
  var GitHubRenderer = {
    baseUrl: window.location.origin,
    processed: {},
    
    // Initialize after DOM is ready
    init: function() {
      console.log("[GitHub Renderer] Starting with base URL:", this.baseUrl);
      this.scanForMarkers();
      
      // Scan periodically
      var self = this;
      setInterval(function() {
        self.scanForMarkers();
      }, 2000);
    },
    
    // Find all text markers in the page
    scanForMarkers: function() {
      try {
        // Get all text nodes
        var textNodes = [];
        var walker = document.createTreeWalker(
          document.body, 
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        var node;
        while (node = walker.nextNode()) {
          if (node.nodeValue && node.nodeValue.includes("##GITHUB:")) {
            textNodes.push(node);
          }
        }
        
        // Process each text node
        for (var i = 0; i < textNodes.length; i++) {
          this.processNode(textNodes[i]);
        }
      } catch (e) {
        console.error("[GitHub Renderer] Error scanning:", e);
      }
    },
    
    // Process a single text node
    processNode: function(textNode) {
      try {
        var text = textNode.nodeValue;
        
        // Fixed regex to handle both github.com and raw.githubusercontent.com URLs
        var regex = /##GITHUB:(https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\/[^#]+)(?::([^:]+))?(?::([^#]+))?##/g;
        var matches = [];
        var match;
        
        // Collect all markers
        while ((match = regex.exec(text)) !== null) {
          var fullMatch = match[0];
          
          // Skip if already processed
          if (this.processed[fullMatch]) continue;
          
          var url = match[1];
          var lines = match[2] || "";
          var theme = match[3] || "github";
          
          console.log("[GitHub Renderer] Found marker:", url);
          
          this.processed[fullMatch] = true;
          matches.push({
            fullMatch: fullMatch,
            url: url,
            lines: lines,
            theme: theme
          });
        }
        
        // Skip if no new matches
        if (matches.length === 0) return;
        
        // Split the text and replace markers with code blocks
        var parts = text.split(/##GITHUB:[^#]+##/);
        var parent = textNode.parentNode;
        
        // Remove the original text node
        parent.removeChild(textNode);
        
        // Reconstruct with code blocks
        for (var i = 0; i < parts.length; i++) {
          // Add text part
          if (parts[i]) {
            parent.appendChild(document.createTextNode(parts[i]));
          }
          
          // Add code block
          if (i < matches.length) {
            this.addCodeBlock(parent, matches[i]);
          }
        }
      } catch (e) {
        console.error("[GitHub Renderer] Error processing node:", e);
      }
    },
    
    // Add a code block to the page
    addCodeBlock: function(parent, data) {
      try {
        // Create a container div
        var container = document.createElement("div");
        container.className = "github-code-block";
        container.style.border = "1px solid #ddd";
        container.style.borderRadius = "6px";
        container.style.margin = "16px 0";
        container.style.overflow = "hidden";
        container.style.fontFamily = "monospace";
        
        // Add header
        var header = document.createElement("div");
        header.style.padding = "8px 16px";
        header.style.background = "#f6f8fa";
        header.style.borderBottom = "1px solid #ddd";
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        
        // Add filename to header
        var filename = data.url.split('/').pop();
        var fileSpan = document.createElement("span");
        fileSpan.style.fontWeight = "bold";
        fileSpan.textContent = filename;
        header.appendChild(fileSpan);
        
        // Add theme to header
        var themeSpan = document.createElement("span");
        themeSpan.textContent = data.theme;
        header.appendChild(themeSpan);
        
        container.appendChild(header);
        
        // Add content area with loading indicator
        var content = document.createElement("div");
        content.style.padding = "16px";
        content.style.minHeight = "100px";
        content.style.position = "relative";
        content.style.background = "#fff";
        
        var loading = document.createElement("div");
        loading.style.textAlign = "center";
        loading.style.padding = "20px";
        loading.textContent = "Loading code from GitHub...";
        
        content.appendChild(loading);
        container.appendChild(content);
        
        // Add footer
        var footer = document.createElement("div");
        footer.style.padding = "8px 16px";
        footer.style.background = "#f6f8fa";
        footer.style.borderTop = "1px solid #ddd";
        footer.style.display = "flex";
        footer.style.justifyContent = "space-between";
        footer.style.fontSize = "12px";
        
        // Add link
        var link = document.createElement("a");
        link.href = data.url;
        link.target = "_blank";
        link.style.color = "#0366d6";
        link.textContent = "View on GitHub";
        footer.appendChild(link);
        
        // Add powered by text
        var powered = document.createElement("span");
        powered.textContent = "Powered by Scroll Viewport";
        footer.appendChild(powered);
        
        container.appendChild(footer);
        
        // Add to page
        parent.appendChild(container);
        
        // Fetch code
        this.fetchCode(data.url, data.lines, content);
      } catch (e) {
        console.error("[GitHub Renderer] Error adding code block:", e);
      }
    },
    
    // Fetch code using a simple XHR
    fetchCode: function(url, lines, container) {
      try {
        var xhr = new XMLHttpRequest();
        var self = this;
        
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              var code = xhr.responseText;
              self.renderCode(code, container);
            } else {
              container.innerHTML = '<div style="color:red;padding:10px;">Error fetching code: ' + xhr.status + '</div>';
            }
          }
        };
        
        // Create URL with parameters
        var requestUrl;
        
        // Check if it's already a raw URL or a GitHub URL
        if (url.includes('raw.githubusercontent.com')) {
          // Already a raw URL
          requestUrl = this.baseUrl + '/html?url=' + encodeURIComponent(url);
        } else {
          // Need to convert github.com URL to raw
          var rawUrl = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          requestUrl = this.baseUrl + '/html?url=' + encodeURIComponent(rawUrl);
        }
        
        // Add lines parameter if specified
        if (lines) {
          requestUrl += '&lines=' + encodeURIComponent(lines);
        }
        
        console.log("[GitHub Renderer] Fetching code from:", requestUrl);
        
        xhr.open('GET', requestUrl, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('Accept', 'text/html');
        xhr.send();
      } catch (e) {
        console.error("[GitHub Renderer] Error fetching code:", e);
        container.innerHTML = '<div style="color:red;padding:10px;">Error: ' + e.message + '</div>';
      }
    },
    
    // Render code in the container
    renderCode: function(code, container) {
      try {
        // Check if response is HTML (from /html endpoint)
        if (code.trim().startsWith('<div') || code.trim().startsWith('<link')) {
          // Direct HTML from server
          container.innerHTML = code;
        } else {
          // Original line-by-line renderer for plain text
          var pre = document.createElement('pre');
          pre.style.margin = '0';
          pre.style.padding = '0';
          pre.style.overflow = 'auto';
          
          var codeElem = document.createElement('code');
          codeElem.style.display = 'block';
          codeElem.style.padding = '0';
          codeElem.style.fontFamily = 'monospace';
          
          // Process line by line
          var lines = code.split('\n');
          var html = '';
          
          for (var i = 0; i < lines.length; i++) {
            var lineNum = i + 1;
            var lineContent = this.escapeHtml(lines[i]) || ' ';
            
            html += '<div style="display:flex;">' +
                    '<div style="color:#999;text-align:right;padding-right:8px;user-select:none;width:40px;border-right:1px solid #eee;margin-right:8px;">' + 
                    lineNum + 
                    '</div>' +
                    '<div style="flex:1;">' + 
                    lineContent + 
                    '</div>' +
                    '</div>';
          }
          
          codeElem.innerHTML = html;
          pre.appendChild(codeElem);
          
          // Replace container content
          container.innerHTML = '';
          container.appendChild(pre);
        }
      } catch (e) {
        console.error("[GitHub Renderer] Error rendering code:", e);
        container.innerHTML = '<div style="color:red;padding:10px;">Error rendering code: ' + e.message + '</div>';
      }
    },
    
    // Helper to escape HTML
    escapeHtml: function(text) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
  };
  
  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      GitHubRenderer.init();
    });
  } else {
    GitHubRenderer.init();
  }
})();
