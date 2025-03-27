#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Configure command line arguments
const argv = yargs(hideBin(process.argv))
  .option('repo', {
    alias: 'r',
    description: 'GitHub repository in the format owner/repo',
    type: 'string',
    demandOption: true
  })
  .option('path', {
    alias: 'p',
    description: 'Path to the file within the repository',
    type: 'string',
    demandOption: true
  })
  .option('branch', {
    alias: 'b',
    description: 'Branch name',
    type: 'string',
    default: 'main'
  })
  .option('lines', {
    alias: 'l',
    description: 'Line range, e.g., "10-20"',
    type: 'string'
  })
  .option('output', {
    alias: 'o',
    description: 'Output file path (optional)',
    type: 'string'
  })
  .help()
  .alias('help', 'h')
  .argv;

// GitHub API token (optional but recommended)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// GitHub API base URL
const GITHUB_API_URL = 'https://api.github.com';

/**
 * Fetch code from GitHub
 * @param {string} repo - Repository in format owner/repo
 * @param {string} filePath - Path to file in repository
 * @param {string} branch - Branch name (default: main)
 * @returns {Promise<{content: string, language: string}>} - File content and language
 */
async function fetchGitHubCode(repo, filePath, branch = 'main') {
  try {
    const url = `${GITHUB_API_URL}/repos/${repo}/contents/${filePath}?ref=${branch}`;
    const headers = {
      'Accept': 'application/vnd.github.v3.raw',
      ...(GITHUB_TOKEN && { 'Authorization': `token ${GITHUB_TOKEN}` })
    };
    
    console.log(chalk.blue(`Fetching code from GitHub: ${url}`));
    const response = await axios.get(url, { headers });
    
    // Determine language from file extension
    const fileExtension = filePath.split('.').pop();
    let language = mapExtensionToLanguage(fileExtension);
    
    return {
      content: response.data,
      language
    };
  } catch (error) {
    console.error(chalk.red('Error fetching from GitHub:'), error.message);
    throw new Error(`Failed to fetch code from GitHub: ${error.message}`);
  }
}

/**
 * Map file extension to Markdown language identifier
 * @param {string} extension - File extension
 * @returns {string} - Markdown language identifier
 */
function mapExtensionToLanguage(extension) {
  const extensionMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'java': 'java',
    'rb': 'ruby',
    'php': 'php',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'sh': 'bash',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'swift': 'swift',
    'kt': 'kotlin'
  };
  
  return extensionMap[extension.toLowerCase()] || 'text';
}

/**
 * Extract specific lines from code
 * @param {string} code - Complete code
 * @param {string} lineRange - Range of lines (e.g., "10-20")
 * @returns {string} - Extracted code snippet
 */
function extractLines(code, lineRange) {
  if (!lineRange) return code;
  
  const lines = code.split('\n');
  const [start, end] = lineRange.split('-').map(num => parseInt(num.trim(), 10));
  
  // Validate line numbers
  const startLine = Math.max(1, isNaN(start) ? 1 : start);
  const endLine = Math.min(lines.length, isNaN(end) ? lines.length : end);
  
  return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Convert GitHub code to Markdown
 * @param {string} code - Code content
 * @param {string} language - Programming language
 * @param {Object} metadata - Additional metadata
 * @returns {string} - Formatted Markdown
 */
function generateMarkdown(code, language, metadata) {
  const { repo, filePath, branch, lines } = metadata;
  
  // Create GitHub URL
  const githubUrl = `https://github.com/${repo}/blob/${branch}/${filePath}`;
  
  // Format lines info
  const linesInfo = lines ? ` (lines ${lines})` : '';
  
  // Generate Markdown
  return `**File: ${filePath}${linesInfo} (${repo})**

\`\`\`${language}
${code}
\`\`\`

[View on GitHub](${githubUrl})`;
}

/**
 * Main function
 */
async function main() {
  try {
    const { repo, path: filePath, branch, lines, output } = argv;
    
    // Fetch code from GitHub
    const { content, language } = await fetchGitHubCode(repo, filePath, branch);
    
    // Extract specific lines if requested
    const codeSnippet = lines ? extractLines(content, lines) : content;
    
    // Generate Markdown
    const markdown = generateMarkdown(codeSnippet, language, { 
      repo, 
      filePath, 
      branch, 
      lines 
    });
    
    // Output markdown
    if (output) {
      // Ensure directory exists
      const dir = path.dirname(output);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write to file
      fs.writeFileSync(output, markdown);
      console.log(chalk.green(`Markdown saved to: ${output}`));
    } else {
      // Print to console
      console.log(chalk.yellow('\n--- Markdown Output ---\n'));
      console.log(markdown);
      console.log(chalk.yellow('\n----------------------\n'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run the program
main(); 