/**
 * Ngrok Warning Bypass Script
 * This script uses Puppeteer to automatically click through the ngrok warning page.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Get the URL from command line arguments or prompt the user
async function getUrl() {
  if (process.argv.length > 2) {
    return process.argv[2];
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question('Enter your ngrok URL: ', (url) => {
      rl.close();
      resolve(url);
    });
  });
}

// Get current ngrok URL from tunnels API
async function getCurrentNgrokUrl() {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    const tunnels = data.tunnels || [];
    const tunnel = tunnels.find(t => t.proto === 'https');
    return tunnel ? tunnel.public_url : null;
  } catch (error) {
    console.error('Error fetching ngrok URL:', error.message);
    return null;
  }
}

// Main function to bypass the ngrok warning
async function bypassNgrokWarning() {
  let url = await getUrl();
  
  if (!url) {
    url = await getCurrentNgrokUrl();
    if (!url) {
      console.error('No ngrok URL provided or found.');
      process.exit(1);
    }
  }
  
  console.log(`Using ngrok URL: ${url}`);
  
  // Ensure the URL has /atlassian-connect-bypass.json
  if (!url.endsWith('/atlassian-connect-bypass.json')) {
    url = `${url.replace(/\/$/, '')}/atlassian-connect-bypass.json`;
  }
  
  const descriptorPath = path.join(__dirname, 'ngrok-descriptor.json');
  
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,  // Set to true for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set headers to bypass warning
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
      'ngrok-skip-browser-warning': 'true'
    });
    
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Check if we're on the ngrok warning page
    const isWarningPage = await page.evaluate(() => {
      return document.body.textContent.includes('ngrok') && 
             document.body.textContent.includes('Visit Site');
    });
    
    if (isWarningPage) {
      console.log('Detected ngrok warning page, attempting to bypass...');
      
      // Try to click the "Visit Site" button
      const clickResult = await page.evaluate(() => {
        // Find any button or link with "Visit Site" text
        const visitSiteElement = Array.from(document.querySelectorAll('a, button')).find(
          el => el.textContent.trim() === 'Visit Site'
        );
        
        if (visitSiteElement) {
          visitSiteElement.click();
          return true;
        }
        
        // Try finding by class
        const buttons = document.querySelectorAll('.button, .btn');
        if (buttons.length > 0) {
          buttons[0].click();
          return true;
        }
        
        return false;
      });
      
      if (clickResult) {
        console.log('Clicked "Visit Site" button');
        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      } else {
        console.log('Could not find "Visit Site" button');
      }
    }
    
    // Get the page content
    const content = await page.content();
    
    // Check if we got JSON
    const isJson = await page.evaluate(() => {
      try {
        return !!document.body.textContent.trim().match(/^\s*\{[\s\S]*\}\s*$/);
      } catch (e) {
        return false;
      }
    });
    
    if (isJson) {
      console.log('Successfully retrieved the descriptor JSON');
      
      // Get the JSON content
      const descriptorJson = await page.evaluate(() => document.body.textContent.trim());
      
      // Save the descriptor
      fs.writeFileSync(descriptorPath, descriptorJson);
      console.log(`Descriptor saved to ${descriptorPath}`);
      
      // Parse the JSON to get the baseUrl
      try {
        const descriptor = JSON.parse(descriptorJson);
        console.log('\nInstallation URL:');
        console.log(`${descriptor.baseUrl}/atlassian-connect-bypass.json`);
        console.log('\nUse this URL in the "Upload app" dialog in Confluence.');
      } catch (e) {
        console.error('Error parsing JSON:', e.message);
      }
    } else {
      console.log('Failed to get JSON. Page content:');
      console.log(content.substring(0, 500) + '...');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'ngrok-bypass-screenshot.png' });
    console.log('Screenshot saved to ngrok-bypass-screenshot.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

bypassNgrokWarning().catch(console.error); 