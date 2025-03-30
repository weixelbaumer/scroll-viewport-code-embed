# GitHub Code Renderer for Confluence & Scroll Viewport

A Confluence app that allows users to easily embed syntax-highlighted code from GitHub repositories into Confluence pages, with full compatibility for Scroll Viewport.

## Overview

This app provides two key components:

1. **GitHub Code Block Macro** - A Confluence macro that makes it easy to embed code snippets from GitHub.
2. **Scroll Viewport Integration** - Special handling to ensure code blocks render correctly in Scroll Viewport documentation.

## Features

- Embed code directly from GitHub repositories
- Syntax highlighting for various programming languages
- Multiple themes including light and dark modes
- Line range selection to display only relevant portions of code
- Special handling for Scroll Viewport compatibility
- Direct HTML output option for manual embedding

## Installation

### Prerequisites

- Node.js 14+ and npm
- Cloudflare Account and `cloudflared` CLI tool installed and logged in

### Development Setup

1. **Configure Cloudflare Tunnel**

   ```bash
   cloudflared tunnel create github-fetcher-dev
   ```

   Create Config File:
   ```yaml
   tunnel: github-fetcher-dev
   credentials-file: /PATH/TO/YOUR/.cloudflared/<TUNNEL_ID>.json
   ingress:
     - hostname: dev.tandav.com
       service: http://localhost:3000
     - service: http_status:404
   ```

   Route DNS:
   ```bash
   cloudflared tunnel route dns github-fetcher-dev dev.tandav.com
   ```

2. **Run the Application**

   ```bash
   npm install
   npm start
   
   # In a separate terminal
   cloudflared tunnel --config ~/.cloudflared/config.yml run github-fetcher-dev
   ```

## Installing the Confluence App

1. Log in to your Confluence instance as an administrator
2. Go to Settings > Manage apps
3. Click "Upload app"
4. Enter the URL to your hosted atlassian-connect.json descriptor:
   ```
   https://dev.tandav.com/atlassian-connect.json
   ```

## Configure Scroll Viewport Theme

To enable GitHub code blocks in Scroll Viewport, add custom JavaScript to your Scroll Viewport theme:

1. In your Scroll Viewport site, click **Edit Theme** from the site overview
2. Go to the **Templates** menu
3. In the **Additional** section, expand the JS editor
4. Copy and paste the following JavaScript code:

```javascript
// GitHub Code Renderer for Scroll Viewport
// Version 1.1.4

// Only run on live sites, not in previews
if (!vp.preview.isPagePreview() && !vp.preview.isSitePreview()) {
  // Load highlight.js for syntax highlighting
  vp.loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js')
    .then(() => {
      // Load the theme CSS (default to github-light)
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css';
      document.head.appendChild(linkEl);
      
      // Process GitHub code markers in the article content
      processGitHubCodeMarkers();
    });
}

function processGitHubCodeMarkers() {
  // Find all article content areas
  const contentAreas = document.querySelectorAll('.article-content, .confluence-content, .vp-article__content');
  
  contentAreas.forEach(content => {
    // Look for our markers using regex
    const markerRegex = /##GITHUB:([^|]+)\|([^|]*)\|([^#]*)##/g;
    const html = content.innerHTML;
    
    // Replace markers with actual code blocks
    content.innerHTML = html.replace(markerRegex, (match, url, lines, theme) => {
      // Create a placeholder while loading
      const id = 'gh-code-' + Math.random().toString(36).substring(2, 10);
      fetchGitHubCode(url, lines, theme, id);
      return `<div id="${id}" class="github-code-block">
                <div class="loading-indicator">Loading code from GitHub...</div>
              </div>`;
    });
  });
}

function fetchGitHubCode(url, lines, theme, containerId) {
  // Convert github.com URL to raw URL if needed
  let rawUrl = url;
  if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
    rawUrl = url.replace('github.com', 'raw.githubusercontent.com')
               .replace('/blob/', '/');
  }
  
  // Fetch the code
  fetch(rawUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      return response.text();
    })
    .then(code => {
      // Process line range if specified
      let processedCode = code;
      if (lines && lines.trim()) {
        const lineRange = lines.trim();
        const lineArray = code.split('\n');
        
        if (lineRange.includes('-')) {
          // Range of lines
          const [start, end] = lineRange.split('-').map(num => parseInt(num, 10));
          processedCode = lineArray.slice(start - 1, end).join('\n');
        } else {
          // Single line
          const lineNum = parseInt(lineRange, 10);
          processedCode = lineArray[lineNum - 1];
        }
      }
      
      // Render the code with highlight.js
      const container = document.getElementById(containerId);
      if (container) {
        // Determine language from file extension
        const fileExt = url.split('.').pop().toLowerCase();
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        
        // Apply appropriate language class if determinable
        if (fileExt) {
          code.className = `language-${fileExt}`;
        }
        
        code.textContent = processedCode;
        pre.appendChild(code);
        container.innerHTML = '';
        container.appendChild(pre);
        
        // Apply highlighting
        if (window.hljs) {
          window.hljs.highlightElement(code);
        }
      }
    })
    .catch(error => {
      // Show error in the container
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `<div class="error-message">Error loading code: ${error.message}</div>`;
      }
    });
}
```

## Usage

### Adding a GitHub Code Block to a Confluence Page

1. Edit your Confluence page
2. Click the '+' icon to add a macro
3. Search for and select "GitHub Code"
4. Enter the GitHub URL, optional line range, and select a theme
5. Click "Insert" to add the macro

### Supported GitHub URLs

- Regular GitHub file URLs: `https://github.com/owner/repo/blob/branch/path/to/file.js`
- Raw GitHub content URLs: `https://raw.githubusercontent.com/owner/repo/branch/path/to/file.js`

## License

Copyright © 2025 Apryse. All rights reserved.

## Support

For support, please contact your Confluence administrator or Apryse technical support. 