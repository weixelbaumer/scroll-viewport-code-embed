import React, { useEffect, useState, useRef } from 'react';
import { invoke } from '@forge/bridge';
import { useConfig } from '@forge/react'; // To get macro parameters

// Import highlight.js and a default style
import hljs from 'highlight.js/lib/core';
// Import specific languages you want to support to keep bundle size down
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import xml from 'highlight.js/lib/languages/xml'; // For HTML/XML
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
// Add more languages as needed...

// Import a highlight.js stylesheet
// You can choose different styles from 'node_modules/highlight.js/styles/'
import 'highlight.js/styles/github.css'; // Example: GitHub style

// Register the imported languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('xml', xml); // Used for HTML as well
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('markdown', markdown);
// Register more languages...

// Helper to detect language from URL (client-side)
function detectLanguage(url) {
    if (!url) return 'plaintext';
    const filenameMatch = url.match(/[^/\\?#]+(?=[?#]|$)/);
    if (!filenameMatch) return 'plaintext';
    const extensionMatch = filenameMatch[0].match(/\.([^.]+)$/);
    const ext = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    const langMap = { /* Same map as backend */
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', rb: 'ruby', php: 'php', cs: 'csharp',
        go: 'go', rs: 'rust', cpp: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
        html: 'xml', xml: 'xml', css: 'css', scss: 'scss', less: 'less', // Map HTML to XML for hljs
        md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
        sh: 'bash', sql: 'sql', kt: 'kotlin', swift: 'swift',
        dockerfile: 'dockerfile', groovy: 'groovy', scala: 'scala',
        perl: 'perl', lua: 'lua', r: 'r', dart: 'dart'
    };
    const language = langMap[ext] || 'plaintext';
    // Check if hljs supports the detected language, otherwise fallback
    // Corrected: &&
    if (language !== 'plaintext' && !hljs.getLanguage(language)) {
        console.warn(`[Forge Frontend] Detected language '${language}' not registered with highlight.js. Falling back to plaintext.`);
        return 'plaintext';
    }
    return language;
}


function App() {
  const [fetchResult, setFetchResult] = useState({ loading: true, data: null, error: null });
  const config = useConfig(); // Get config saved by the macro editor
  const codeRef = useRef(null); // Ref for applying highlighting after render

  // Extract parameters from config (adjust keys if necessary based on config UI)
  const githubUrl = config?.githubUrl;
  const lineRange = config?.lineRange;
  const theme = config?.theme || 'github'; // Default theme class

  useEffect(() => {
    // Only fetch if githubUrl is provided in the config
    if (githubUrl) {
      console.log('[Forge Frontend] Config received:', config);
      console.log(`[Forge Frontend] Invoking fetchGitHubCode with URL: ${githubUrl}, Lines: ${lineRange}`);
      setFetchResult({ loading: true, data: null, error: null }); // Reset state on new fetch

      invoke('fetchGitHubCode', { githubUrl, lineRange })
        .then(result => {
          console.log('[Forge Frontend] Received result from backend:', result);
          if (result.error) {
            setFetchResult({ loading: false, data: null, error: result.error });
          } else {
            setFetchResult({ loading: false, data: result.code, error: null });
          }
        })
        .catch(error => {
          console.error('[Forge Frontend] Error invoking fetchGitHubCode:', error);
          setFetchResult({ loading: false, data: null, error: `Failed to invoke backend: ${error.message}` });
        });
    } else {
      // Handle case where URL is not configured
      console.log('[Forge Frontend] No githubUrl configured for this macro.');
      setFetchResult({ loading: false, data: null, error: 'GitHub URL not configured for this macro.' });
    }
  }, [githubUrl, lineRange]); // Re-run effect if URL or lines change

  // Apply highlighting after the code content is rendered
  useEffect(() => {
    // Corrected: &&
    if (codeRef.current && fetchResult.data && !fetchResult.loading && !fetchResult.error) {
      try {
        console.log('[Forge Frontend] Applying highlight.js');
        hljs.highlightElement(codeRef.current);
      } catch (e) {
        console.error('[Forge Frontend] Error applying highlight.js:', e);
      }
    }
  }, [fetchResult.data, fetchResult.loading, fetchResult.error]); // Run when data is ready

  // Render based on fetch state
  if (fetchResult.loading) {
    return <div>Loading code from {githubUrl}...</div>;
  }

  if (fetchResult.error) {
    return <div style={{ color: 'red', border: '1px solid red', padding: '10px' }}>
             Error: {fetchResult.error}
           </div>;
  }

  if (fetchResult.data !== null) {
    const language = detectLanguage(githubUrl);
    // Use pre and code tags for highlight.js compatibility
    // Add theme class for styling
    return (
      <div className={`code-block-container ${theme}`}>
        <pre>
          <code ref={codeRef} className={`language-${language}`}>
            {fetchResult.data}
          </code>
        </pre>
      </div>
    );
  }

  // Fallback if no URL was provided initially
  return <div>Please configure the GitHub URL for this macro.</div>;
}

export default App;
