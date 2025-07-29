import Resolver from '@forge/resolver';
import api, { route } from '@forge/api'; // Import the Forge API

const resolver = new Resolver();

// Helper function to transform GitHub page URL to raw content URL
// (Adapted from previous ACE code)
function getRawGitHubUrl(url) {
    if (!url) return null;
    try {
        // Handle existing raw URLs
        if (url.includes('raw.githubusercontent.com')) {
            return url;
        }
        // Handle standard GitHub blob URLs
        // Corrected: &&
        if (url.includes('github.com') && url.includes('/blob/')) {
            return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }
         // Handle URLs starting with github.com (less common)
         if (url.startsWith('github.com')) {
             const pathPart = url.substring(url.indexOf('/') + 1); // Get user/repo/blob/...
             return `https://raw.githubusercontent.com/${pathPart.replace('/blob/', '/')}`;
         }
        console.warn(`[Forge Backend] Could not convert URL to raw format: ${url}`);
        return null; // Indicate failure to convert
    } catch (e) {
        console.error(`[Forge Backend] Error converting URL ${url}: ${e.message}`);
        return null;
    }
}

// Helper function to extract specific lines from code
// (Adapted from previous ACE code)
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
                // Corrected: &&
                if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= lines.length) {
                    selectedLines = selectedLines.concat(lines.slice(start - 1, Math.min(end, lines.length)));
                } else {
                    console.warn(`[Forge Backend] Invalid range format: ${trimmedRange}`);
                }
            } else {
                const lineNum = parseInt(trimmedRange, 10);
                // Corrected: &&
                if (!isNaN(lineNum) && lineNum > 0 && lineNum <= lines.length) {
                    selectedLines.push(lines[lineNum - 1]);
                } else {
                    console.warn(`[Forge Backend] Invalid line number: ${trimmedRange}`);
                }
            }
        }
        return selectedLines.join('\n');
    } catch (error) {
        console.error(`[Forge Backend] Error parsing line range "${lineRange}":`, error.message);
        return code; // Return original code on error
    }
}


// Define the function that the frontend will call
resolver.define('fetchGitHubCode', async (req) => {
  console.log('[Forge Backend] fetchGitHubCode invoked. Payload:', req.payload);

  const { githubUrl, lineRange } = req.payload;

  if (!githubUrl) {
    console.error('[Forge Backend] Missing githubUrl in payload.');
    // It's better to throw an error or return a structured error object
    // throw new Error('Missing required GitHub URL.');
    return { error: 'Missing required GitHub URL.' };
  }

  const rawUrl = getRawGitHubUrl(githubUrl);
  if (!rawUrl) {
     console.error(`[Forge Backend] Invalid GitHub URL format: ${githubUrl}`);
     return { error: `Invalid or unsupported GitHub URL format: ${githubUrl}` };
  }

  console.log(`[Forge Backend] Attempting to fetch raw content from: ${rawUrl}`);

  try {
    const response = await api.fetch(rawUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Forge Backend] GitHub fetch failed (${response.status}) for ${rawUrl}: ${errorText}`);
      // Consider specific status codes (404, 403 for private/rate limit)
      if (response.status === 404) {
          return { error: `GitHub file not found (404): ${rawUrl}` };
      } else if (response.status === 403) {
           return { error: `Access denied (403) for ${rawUrl}. Check if the repository is private or if rate limits were exceeded.` };
      }
      return { error: `GitHub fetch failed with status ${response.status}` };
    }

    const rawCode = await response.text();
    console.log(`[Forge Backend] Fetched ${rawCode.length} characters.`);

    // Apply line filtering if requested
    const finalCode = extractLines(rawCode, lineRange);
    console.log(`[Forge Backend] Returning code content (lines: ${lineRange || 'all'}).`);

    // Return the code content successfully
    return { code: finalCode };

  } catch (error) {
    console.error(`[Forge Backend] Unexpected error fetching ${rawUrl}:`, error);
    return { error: `An unexpected error occurred: ${error.message}` };
  }
});

// Export function for Scroll Viewport compatibility
resolver.define('exportForScrollViewport', async (req) => {
  console.log('[Forge Export] exportForScrollViewport invoked. Payload:', req.payload);

  const { githubUrl, lineRange, theme } = req.payload?.config || {};

  if (!githubUrl) {
    return {
      html: '<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: GitHub URL not configured for this macro.</div>'
    };
  }

  const rawUrl = getRawGitHubUrl(githubUrl);
  if (!rawUrl) {
    return {
      html: `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: Invalid GitHub URL format: ${githubUrl}</div>`
    };
  }

  try {
    const response = await api.fetch(rawUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          html: `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: GitHub file not found (404): ${rawUrl}</div>`
        };
      } else if (response.status === 403) {
        return {
          html: `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: Access denied (403) for ${rawUrl}. Check if the repository is private or if rate limits were exceeded.</div>`
        };
      }
      return {
        html: `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: GitHub fetch failed with status ${response.status}</div>`
      };
    }

    const rawCode = await response.text();
    const finalCode = extractLines(rawCode, lineRange);
    
    // Detect language for syntax highlighting
    const language = detectLanguageFromUrl(githubUrl);
    
    // Return HTML with embedded Prism.js for syntax highlighting
    const html = `
      <div class="github-code-block-export ${theme || 'github-light'}" style="margin: 16px 0;">
        <div style="background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 6px; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;">
          <div style="padding: 8px 16px; border-bottom: 1px solid #e1e4e8; font-size: 12px; color: #586069;">
            <strong>📁 ${githubUrl.split('/').pop()}</strong> ${lineRange ? `(lines ${lineRange})` : ''}
          </div>
          <pre style="margin: 0; padding: 16px; overflow-x: auto; background: transparent;"><code class="language-${language}" style="font-size: 12px; line-height: 1.45;">${escapeHtml(finalCode)}</code></pre>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
      </div>
    `;

    return { html };

  } catch (error) {
    console.error(`[Forge Export] Unexpected error fetching ${rawUrl}:`, error);
    return {
      html: `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 4px;">Error: An unexpected error occurred: ${error.message}</div>`
    };
  }
});

// Helper function for HTML escaping
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Helper function to detect language from URL for export
function detectLanguageFromUrl(url) {
  if (!url) return 'plaintext';
  const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
  if (!filenameMatch) return 'plaintext';
  const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
  const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const langMap = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
    go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
    html: 'markup', xml: 'markup', css: 'css', scss: 'scss', less: 'less',
    md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
    dockerfile: 'docker', groovy: 'groovy', scala: 'scala',
    perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
  };
  return langMap[ext] || 'plaintext';
}

// Export the handler function for Forge
export const handler = resolver.getDefinitions();
