import { view, invoke } from '@forge/bridge';

// Import highlight.js and styles/languages (same as before)
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/github.css'; // Or your preferred theme

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);

// Helper to detect language from URL
function detectLanguage(url) {
    if (!url) return 'plaintext';
    const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
    if (!filenameMatch) return 'plaintext';
    const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    const langMap = { /* Same map */
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
        go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
        html: 'xml', xml: 'xml', css: 'css', scss: 'scss', less: 'less',
        md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
        dockerfile: 'dockerfile', groovy: 'groovy', scala: 'scala',
        perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
    };
    const language = langMap[ext] || 'plaintext';
    // Corrected: &&
    if (language !== 'plaintext' && !hljs.getLanguage(language)) {
        console.warn(`[Forge Plain JS] Detected language '${language}' not registered. Falling back.`);
        return 'plaintext';
    }
    return language;
}

// Main initialization function
async function initializeApp() {
    console.log('[Forge Plain JS] Initializing app...');
    const rootElement = document.getElementById('root');

    if (!rootElement) {
        console.error('[Forge Plain JS] Root element not found!');
        document.body.innerHTML = '<h1 style="color: red;">Error: Root element not found!</h1>';
        return;
    }

    // Show loading state
    rootElement.innerHTML = '<p>Loading context...</p>';

    try {
        // Get context from Forge bridge (includes macro parameters)
        console.log('[Forge Plain JS] Getting context...');
        const context = await view.getContext();
        console.log('[Forge Plain JS] Context received:', context);

        // Extract parameters (path might vary slightly, check context log)
        // Corrected: &&
        const params = context.extension && context.extension.macro && context.extension.macro.parameters;
        const githubUrl = params?.githubUrl; // Use optional chaining
        const lineRange = params?.lineRange;
        const theme = params?.theme || 'github'; // Default theme class

        if (!githubUrl) {
            console.log('[Forge Plain JS] GitHub URL not configured.');
            rootElement.innerHTML = '<p>Please configure the GitHub URL for this macro.</p>';
            return;
        }

        // Update loading state
        rootElement.innerHTML = `<p>Fetching code from ${githubUrl}...</p>`;

        // Invoke backend function
        console.log(`[Forge Plain JS] Invoking fetchGitHubCode with URL: ${githubUrl}, Lines: ${lineRange}`);
        const result = await invoke('fetchGitHubCode', { githubUrl, lineRange });
        console.log('[Forge Plain JS] Received result from backend:', result);

        if (result.error) {
            throw new Error(result.error); // Throw error to be caught below
        }

        // Corrected: &&
        if (result.code !== null && result.code !== undefined) {
            // Render the code
            console.log('[Forge Plain JS] Rendering code...');
            const language = detectLanguage(githubUrl);

            const container = document.createElement('div');
            container.className = `code-block-container ${theme}`; // Apply theme class

            const pre = document.createElement('pre');
            const codeElement = document.createElement('code');
            codeElement.className = `language-${language}`;
            codeElement.textContent = result.code; // Set text content BEFORE highlighting

            pre.appendChild(codeElement);
            container.appendChild(pre);

            // Clear root and append code block
            rootElement.innerHTML = ''; // Clear loading message
            rootElement.appendChild(container);

            // Apply highlighting
            try {
                console.log('[Forge Plain JS] Applying highlight.js...');
                hljs.highlightElement(codeElement);
                console.log('[Forge Plain JS] Highlighting applied.');
            } catch (e) {
                console.error('[Forge Plain JS] Error applying highlight.js:', e);
                // Code is still rendered, just not highlighted
            }
        } else {
             // Handle case where backend returns success but no code (shouldn't happen with current backend logic)
             throw new Error('Backend returned success but no code data.');
        }

    } catch (error) {
        console.error('[Forge Plain JS] Error during initialization or fetch:', error);
        rootElement.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px;">
                                   Error: ${error.message || 'An unknown error occurred.'}
                                 </div>`;
    }
}

// Export the function to be called by index.jsx
export default initializeApp;