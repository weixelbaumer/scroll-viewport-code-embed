/**
 * Super minimal GitHub Code Renderer
 * Designed to work with strict CSP policies
 */
// Simple GitHub renderer
document.addEventListener('DOMContentLoaded', function() {
  function findMarkers() {
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    
    while (node = walk.nextNode()) {
      if (!node.textContent || !node.textContent.includes('##GITHUB:')) continue;
      
      var text = node.textContent;
      var start = text.indexOf('##GITHUB:');
      var end = text.indexOf('##', start + 9);
      
      if (start === -1 || end === -1) continue;
      
      var url = text.substring(start + 9, end).split('|')[0].trim();
      if (url.includes('github.com')) {
        url = url.replace('github.com', 'raw.githubusercontent.com')
                .replace('/blob/', '/');
      }
      
      var div = document.createElement('div');
      div.style.border = '1px solid #ddd';
      div.style.margin = '10px 0';
      div.style.fontFamily = 'monospace';
      div.textContent = 'Loading...';
      
      var parent = node.parentNode;
      parent.insertBefore(document.createTextNode(text.substring(0, start)), node);
      parent.insertBefore(div, node);
      parent.insertBefore(document.createTextNode(text.substring(end + 2)), node);
      parent.removeChild(node);
      
      fetch(url)
        .then(function(response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.text();
        })
        .then(function(code) {
          var pre = document.createElement('pre');
          pre.style.margin = '0';
          pre.style.padding = '16px';
          pre.style.overflow = 'auto';
          pre.textContent = code;
          div.textContent = '';
          div.appendChild(pre);
        })
        .catch(function(error) {
          div.textContent = 'Error: ' + error.message;
        });
    }
  }

  findMarkers();
  
  new MutationObserver(function() {
    findMarkers();
  }).observe(document.body, {
    childList: true,
    subtree: true
  });
}); 
