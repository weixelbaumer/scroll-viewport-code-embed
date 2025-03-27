#!/usr/bin/env node

/**
 * GitHub Code Renderer Installation Helper
 * This script helps users install the GitHub Code Renderer app in Confluence
 * by providing the correct installation URL and instructions.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// Helper function to print colored text
function colorize(text, color) {
  return `${color}${text}${colors.reset}`;
}

// Print the header
console.log('\n' + colorize('='.repeat(80), colors.cyan));
console.log(colorize('  GITHUB CODE RENDERER FOR CONFLUENCE - INSTALLATION HELPER', colors.cyan + colors.bright));
console.log(colorize('='.repeat(80), colors.cyan) + '\n');

// Check if ngrok is running
console.log(colorize('➤ Checking if ngrok is running...', colors.yellow));

// Function to get the ngrok URL from the ngrok API
function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4040/api/tunnels', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data).tunnels;
          const httpsTunnel = tunnels.find(tunnel => tunnel.proto === 'https');
          
          if (httpsTunnel) {
            resolve(httpsTunnel.public_url);
          } else {
            reject(new Error('No HTTPS tunnel found in ngrok'));
          }
        } catch (e) {
          reject(new Error(`Error parsing ngrok API response: ${e.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Error connecting to ngrok API: ${err.message}`));
    });
  });
}

// Function to check if the server is running
function checkServerRunning() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/health', (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Server returned status code: ${res.statusCode}`));
      }
    }).on('error', (err) => {
      reject(new Error(`Error connecting to server: ${err.message}`));
    });
  });
}

// Function to update the atlassian-connect.json file with the ngrok URL
function updateConnectDescriptor(ngrokUrl) {
  return new Promise((resolve, reject) => {
    const descriptorPath = path.join(__dirname, 'atlassian-connect', 'atlassian-connect.json');
    
    fs.readFile(descriptorPath, 'utf8', (err, data) => {
      if (err) {
        return reject(new Error(`Error reading atlassian-connect.json: ${err.message}`));
      }
      
      try {
        const descriptor = JSON.parse(data);
        
        // Update the baseUrl
        descriptor.baseUrl = ngrokUrl;
        
        // Write the updated descriptor back to the file
        fs.writeFile(descriptorPath, JSON.stringify(descriptor, null, 4), 'utf8', (err) => {
          if (err) {
            return reject(new Error(`Error writing updated atlassian-connect.json: ${err.message}`));
          }
          
          resolve();
        });
      } catch (e) {
        reject(new Error(`Error parsing atlassian-connect.json: ${e.message}`));
      }
    });
  });
}

// Function to attempt to open a URL in the default browser
function openUrl(url) {
  const command = process.platform === 'win32' ? 
    `start "${url}"` : 
    process.platform === 'darwin' ? 
      `open "${url}"` : 
      `xdg-open "${url}"`;
  
  exec(command, (error) => {
    if (error) {
      console.log(colorize(`✘ Could not open browser automatically. Please open this URL manually:`, colors.red));
    }
  });
}

// Main function
async function main() {
  try {
    // Check if ngrok is running
    const ngrokUrl = await getNgrokUrl();
    console.log(colorize(`✓ ngrok is running at: ${ngrokUrl}`, colors.green));
    
    // Check if the server is running
    try {
      await checkServerRunning();
      console.log(colorize('✓ Server is running', colors.green));
    } catch (err) {
      console.log(colorize('✘ Server is not running. Starting the server...', colors.red));
      
      // Start the server
      exec('node server.js', (error, stdout, stderr) => {
        if (error) {
          console.log(colorize(`✘ Error starting server: ${error.message}`, colors.red));
          return;
        }
        
        console.log(colorize('✓ Server started', colors.green));
      });
      
      // Wait for the server to start
      console.log(colorize('➤ Waiting for server to start...', colors.yellow));
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Update the atlassian-connect.json file
    await updateConnectDescriptor(ngrokUrl);
    console.log(colorize('✓ Updated atlassian-connect.json with ngrok URL', colors.green));
    
    // Generate the installation URL
    const installUrl = `${ngrokUrl}/atlassian-connect-bypass.json`;
    const skipNgrokUrl = `${ngrokUrl}/skip-ngrok.html`;
    
    console.log('\n' + colorize('='.repeat(80), colors.green));
    console.log(colorize('  INSTALLATION INSTRUCTIONS', colors.green + colors.bright));
    console.log(colorize('='.repeat(80), colors.green));
    
    console.log(`\n${colorize('1.', colors.yellow)} Use this URL to install the app in Confluence:`);
    console.log(colorize(`   ${installUrl}`, colors.cyan + colors.bright));
    
    console.log(`\n${colorize('2.', colors.yellow)} Or use this simple installation page (includes ngrok bypass):`);
    console.log(colorize(`   ${skipNgrokUrl}`, colors.cyan + colors.bright));
    
    console.log(`\n${colorize('3.', colors.yellow)} Installation steps:`);
    console.log(`   ${colorize('a.', colors.white)} Copy the URL from step 1 or open the page from step 2`);
    console.log(`   ${colorize('b.', colors.white)} Go to your Confluence instance`);
    console.log(`   ${colorize('c.', colors.white)} Navigate to Settings (⚙️) > Manage apps`);
    console.log(`   ${colorize('d.', colors.white)} Click "Upload app"`);
    console.log(`   ${colorize('e.', colors.white)} Paste the URL and click "Upload"`);
    
    console.log('\n' + colorize('Would you like to open the installation page in your browser? (y/n)', colors.yellow));
    
    // Simple readline implementation for user input
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
      const input = data.toString().trim().toLowerCase();
      
      if (input === 'y' || input === 'yes') {
        console.log(colorize('➤ Opening installation page...', colors.yellow));
        openUrl(skipNgrokUrl);
        console.log(colorize('✓ Browser opened with the installation page', colors.green));
      }
      
      console.log('\n' + colorize('Installation helper completed. You can now install the GitHub Code Renderer in Confluence.', colors.green));
      process.exit(0);
    });
    
  } catch (error) {
    console.log(colorize(`✘ Error: ${error.message}`, colors.red));
    
    if (error.message.includes('ECONNREFUSED') && error.message.includes('4040')) {
      console.log(colorize('\n➤ It seems ngrok is not running. Would you like to start it? (y/n)', colors.yellow));
      
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (data) => {
        const input = data.toString().trim().toLowerCase();
        
        if (input === 'y' || input === 'yes') {
          console.log(colorize('➤ Starting ngrok...', colors.yellow));
          
          // Run the ngrok script
          exec('./run-ngrok.sh', (error, stdout, stderr) => {
            if (error) {
              console.log(colorize(`✘ Error starting ngrok: ${error.message}`, colors.red));
              return;
            }
            
            console.log(colorize('✓ ngrok started. Please run this script again in a few seconds.', colors.green));
          });
        }
        
        process.exit(0);
      });
    } else {
      process.exit(1);
    }
  }
}

// Run the main function
main(); 