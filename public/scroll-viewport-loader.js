/**
 * GitHub Code Renderer Loader for Scroll Viewport
 * This script safely loads the renderer while bypassing ngrok warning screens
 */
(function() {
  console.log("GitHub Code Renderer Loader initializing...");
  
  // Get base URL from the script tag
  function getBaseUrl() {
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    const scriptSrc = currentScript.src || '';
    
    if (scriptSrc) {
      return scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1);
    }
    
    // Fallback to the current URL's origin
    return window.location.origin + '/';
  }
  
  const baseUrl = getBaseUrl();
  console.log("GitHub Code Renderer Loader base URL:", baseUrl);
  
  // Method 1: Use fetch with headers to bypass ngrok
  function loadViaFetch() {
    console.log("Attempting to load via fetch...");
    
    return fetch(baseUrl + 'scroll-viewport-theme.js', {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/javascript'
      },
      cache: 'no-store'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch: ' + response.status);
      }
      return response.text();
    })
    .then(code => {
      // Execute the code directly
      console.log("Script loaded via fetch, executing...");
      const script = document.createElement('script');
      script.textContent = code;
      document.head.appendChild(script);
      return true;
    });
  }
  
  // Method 2: Use iframe to load from page that bypasses ngrok
  function loadViaIframe() {
    console.log("Attempting to load via iframe proxy...");
    
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = baseUrl + 'viewport-proxy.html';
      
      // Listen for messages from the iframe
      window.addEventListener('message', function messageHandler(event) {
        if (event.data && event.data.type === 'github-code-renderer-loaded') {
          // Remove the iframe and message listener once we get a response
          window.removeEventListener('message', messageHandler);
          document.body.removeChild(iframe);
          
          if (event.data.success) {
            console.log("Script loaded via iframe proxy");
            resolve(true);
          } else {
            reject(new Error(event.data.error || 'Failed to load via iframe'));
          }
        }
      });
      
      // Add timeout
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        reject(new Error('Iframe loading timed out'));
      }, 10000);
      
      // Add iframe to page
      document.body.appendChild(iframe);
    });
  }
  
  // Method 3: Direct script tag with cache-busting
  function loadViaScriptTag() {
    console.log("Attempting to load via script tag...");
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = baseUrl + 'scroll-viewport-theme.js?' + new Date().getTime();
      
      script.onload = function() {
        console.log("Script loaded via script tag");
        resolve(true);
      };
      
      script.onerror = function(e) {
        reject(new Error('Script tag loading failed'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  // Try all methods in sequence
  function loadScript() {
    loadViaFetch()
      .catch(error => {
        console.error("Fetch method failed:", error);
        return loadViaIframe();
      })
      .catch(error => {
        console.error("Iframe method failed:", error);
        return loadViaScriptTag();
      })
      .catch(error => {
        console.error("All loading methods failed:", error);
      });
  }
  
  // Load when the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadScript);
  } else {
    loadScript();
  }
})(); 