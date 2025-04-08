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

// Export the handler function for Forge
export const handler = resolver.getDefinitions();
