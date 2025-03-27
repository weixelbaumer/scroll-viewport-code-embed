/**
 * Helper script to update the Atlassian Connect descriptor with the ngrok URL
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Start ngrok in the background
console.log('Starting ngrok on port 3000...');
const ngrokProcess = execSync('ngrok http 3000 --log=stdout > ngrok.log &');

// Wait for ngrok to start up
console.log('Waiting for ngrok to start...');
execSync('sleep 5'); // Wait 5 seconds for ngrok to initialize

// Get the ngrok URL from the API
console.log('Getting ngrok URL...');
let ngrokUrl;
try {
  const ngrokInfo = JSON.parse(execSync('curl -s http://localhost:4040/api/tunnels').toString());
  ngrokUrl = ngrokInfo.tunnels.find(t => t.proto === 'https')?.public_url;
  
  if (!ngrokUrl) {
    console.error('Could not find ngrok HTTPS URL. Check ngrok.log for details.');
    process.exit(1);
  }
  
  console.log(`ngrok URL: ${ngrokUrl}`);
} catch (error) {
  console.error('Error getting ngrok URL:', error.message);
  console.log('Is ngrok running? Try running "ngrok http 3000" manually.');
  process.exit(1);
}

// Update the Atlassian Connect descriptor
const descriptorPath = path.join(__dirname, 'atlassian-connect/atlassian-connect.json');
console.log(`Updating Atlassian Connect descriptor at ${descriptorPath}`);

try {
  let descriptor = fs.readFileSync(descriptorPath, 'utf8');
  descriptor = descriptor.replace(/"baseUrl":\s*"{{BASE_URL}}"/g, `"baseUrl": "${ngrokUrl}"`);
  fs.writeFileSync(descriptorPath, descriptor);
  console.log('Successfully updated Atlassian Connect descriptor!');
} catch (error) {
  console.error('Error updating Atlassian Connect descriptor:', error.message);
  process.exit(1);
}

console.log('==========================================================');
console.log('Atlassian Connect App is ready for testing!');
console.log(`1. Start the server: node server.js`);
console.log(`2. Install the app in Confluence: ${ngrokUrl}/atlassian-connect/`);
console.log('=========================================================='); 