/**
 * Ngrok warning bypass script
 * This script attempts to automatically bypass the ngrok warning page
 */

(function() {
  // Try to bypass the ngrok warning page
  function bypassNgrokWarning() {
    console.log("Checking for ngrok warning page...");
    
    // Check if we're on the ngrok warning page
    if (document.body && 
        document.body.textContent && 
        document.body.textContent.includes("ngrok") &&
        document.body.textContent.includes("Visit Site")) {
      
      console.log("Detected ngrok warning page, attempting to bypass");
      
      // Try to find and click the "Visit Site" button
      const buttons = document.querySelectorAll('button, a.btn, a.button');
      for (let button of buttons) {
        if (button.textContent && button.textContent.trim() === 'Visit Site') {
          console.log("Found Visit Site button, clicking it");
          button.click();
          return true;
        }
      }
      
      // Try to find any link with "Visit Site" text
      const links = document.querySelectorAll('a');
      for (let link of links) {
        if (link.textContent && link.textContent.trim() === 'Visit Site') {
          console.log("Found Visit Site link, clicking it");
          link.click();
          return true;
        }
      }
    }
    
    return false;
  }
  
  // Try immediately and after a short delay
  bypassNgrokWarning();
  setTimeout(bypassNgrokWarning, 500);
  setTimeout(bypassNgrokWarning, 1000);
  
  // Also try when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bypassNgrokWarning);
  }
  
  // Add special headers to future requests
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function() {
    const result = originalOpen.apply(this, arguments);
    this.setRequestHeader('ngrok-skip-browser-warning', 'true');
    return result;
  };
})(); 