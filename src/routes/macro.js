const express = require('express');
const https = require('https');

// Helper function to escape HTML attribute values
function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&amp;/g, '&amp;amp;')
    .replace(/</g, '&amp;lt;')
    .replace(/>/g, '&amp;gt;')
    .replace(/"/g, '&amp;quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to escape HTML content
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Function to convert GitHub URL to raw URL
function getRawGitHubUrl(url) {
  if (!url) return null;
  if (url.includes('raw.githubusercontent.com')) {
    return url;
  }
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }
  return null;
}

// Function to detect language from URL
function detectLanguage(url) {
  if (!url) return 'plaintext';
  const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
  if (!filenameMatch) return 'plaintext';
  const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
    go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    html: 'html', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
    dockerfile: 'dockerfile', groovy: 'groovy', scala: 'scala',
    perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
  };
  return langMap[ext] || 'plaintext';
}

// Function to extract specific lines from code
function extractLines(code, lineRange) {
  if (!lineRange || lineRange.trim() === '') return code;
  
  const lines = code.split('\n');
  let selectedLines = [];
  
  try {
    const ranges = lineRange.split(',');
    for (const range of ranges) {
      const trimmedRange = range.trim();
      if (trimmedRange.includes('-')) {
        const [startStr, endStr] = trimmedRange.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= lines.length) {
          selectedLines = selectedLines.concat(lines.slice(start - 1, Math.min(end, lines.length)));
        }
      } else {
        const lineNum = parseInt(trimmedRange, 10);
        if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
          selectedLines.push(lines[lineNum - 1]);
        }
      }
    }
    return selectedLines.join('\n');
  } catch (error) {
    console.error(`Error parsing line range "${lineRange}":`, error.message);
    return code;
  }
}

// Function to fetch code from GitHub
function fetchGitHubCode(url) {
  return new Promise((resolve, reject) => {
    const rawUrl = getRawGitHubUrl(url);
    if (!rawUrl) {
      reject(new Error('Invalid GitHub URL format'));
      return;
    }

    https.get(rawUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`GitHub fetch failed: HTTP ${res.statusCode}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Function to generate syntax highlighted HTML using JDoodle-like approach
function generateHighlightedHTML(code, language, theme) {
  // For now, we'll use a simple approach with CSS classes
  // In production, you'd integrate with JDoodle API or use highlight.js server-side
  
  const escapedCode = escapeHtml(code);
  const lines = escapedCode.split('\n');
  
  let html = `<div class="github-code-block github-theme-${theme}" style="border: 1px solid #ddd; border-radius: 6px; margin: 16px 0; overflow: hidden; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 13px;">`;
  
  // Header
  html += `<div style="padding: 8px 16px; background: #f6f8fa; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">`;
  html += `<span style="font-weight: bold; color: #24292e;">${language}</span>`;
  html += `<span style="color: #586069; font-size: 12px;">${theme}</span>`;
  html += `</div>`;
  
  // Code content
  html += `<div style="background: #ffffff; padding: 16px; overflow-x: auto;">`;
  html += `<pre style="margin: 0; padding: 0; background: transparent;"><code class="language-${language}" style="display: block; padding: 0; font-family: inherit; font-size: inherit; line-height: 1.45; color: #24292e;">`;
  
  // Add line numbers and content
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const lineContent = lines[i] || ' ';
    
    html += `<div style="display: flex;">`;
    html += `<div style="color: #999; text-align: right; padding-right: 8px; user-select: none; width: 40px; border-right: 1px solid #eee; margin-right: 8px; font-size: 12px;">${lineNum}</div>`;
    html += `<div style="flex: 1; white-space: pre;">${lineContent}</div>`;
    html += `</div>`;
  }
  
  html += `</code></pre>`;
  html += `</div>`;
  
  // Footer
  html += `<div style="padding: 8px 16px; background: #f6f8fa; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; font-size: 12px;">`;
  html += `<a href="#" style="color: #0366d6; text-decoration: none;">View on GitHub</a>`;
  html += `<span style="color: #586069;">Powered by GitHub Code Renderer</span>`;
  html += `</div>`;
  
  html += `</div>`;
  
  return html;
}

module.exports = function(addon) {
  const router = express.Router();
  const DEFAULT_THEME = 'github-light';

  // Main macro endpoint - detects context and responds accordingly
  router.get('/render-github-macro', addon.authenticate(), async (req, res) => {
    console.log(`[GitHub Macro] Request received. Authenticated.`);

    if (!req.context || !req.context.extension || !req.context.extension.macro || !req.context.extension.macro.params) {
        console.error('[GitHub Macro] Error: Macro context or parameters not found in request.');
        return res.status(500).send('<!-- Macro context error -->');
    }

    const params = req.context.extension.macro.params;
    const githubUrl = params.url ? params.url.value : '';
    const lineRange = params.lines ? params.lines.value : '';
    const codeTheme = params.theme ? params.theme.value : DEFAULT_THEME;

    console.log(`[GitHub Macro] Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${codeTheme}'`);

    if (!githubUrl) {
        return res.status(400).send('<!-- Macro error: No URL provided -->');
    }

    try {
      // Fetch the code from GitHub
      const code = await fetchGitHubCode(githubUrl);
      const extractedCode = extractLines(code, lineRange);
      const language = detectLanguage(githubUrl);
      
      // Generate the highlighted HTML
      const highlightedHTML = generateHighlightedHTML(extractedCode, language, codeTheme);
      
      console.log('[GitHub Macro] Generated highlighted HTML successfully');
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(highlightedHTML);
      
    } catch (error) {
      console.error('[GitHub Macro] Error fetching/processing code:', error);
      
      // Fallback to text marker for Scroll Viewport
      const textMarker = `##GITHUB:${githubUrl}${lineRange ? '|' + lineRange : ''}${codeTheme !== DEFAULT_THEME ? '|' + codeTheme : ''}##`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(`<div style="color: #666; font-style: italic; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">${textMarker}</div>`);
    }
  });

  // Static rendering endpoint for Scroll Viewport compatibility
  router.get('/render-github-macro-static', (req, res) => {
    console.log(`[GitHub Macro Static] Request received for Scroll Viewport.`);
    
    const githubUrl = req.query.url || '';
    const lineRange = req.query.lines || '';
    const codeTheme = req.query.theme || DEFAULT_THEME;

    console.log(`[GitHub Macro Static] Params: URL='${githubUrl}', Lines='${lineRange}', Theme='${codeTheme}'`);

    if (!githubUrl) {
        return res.status(400).send('<!-- Macro error: No URL provided -->');
    }

    // For Scroll Viewport, always return text markers
    const textMarker = `##GITHUB:${githubUrl}${lineRange ? '|' + lineRange : ''}${codeTheme !== DEFAULT_THEME ? '|' + codeTheme : ''}##`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<div style="color: #666; font-style: italic; padding: 10px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">${textMarker}</div>`);
  });

  return router;
};