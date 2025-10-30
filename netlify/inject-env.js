#!/usr/bin/env node

/**
 * Netlify Build Plugin to inject environment variables into client-side code
 * This runs during the Netlify build process to replace placeholders with actual API keys
 */

const fs = require('fs');
const path = require('path');

// Read the key.js file
const keyFilePath = path.join(__dirname, '..', 'key.js');
let content = fs.readFileSync(keyFilePath, 'utf8');

// Inject MAPS_API_KEY if available
if (process.env.MAPS_API_KEY) {
  console.log('Injecting MAPS_API_KEY into client code...');
  // Find the comment line and add the API key assignment after it
  // Using JSON.stringify to safely escape special characters
  content = content.replace(
    /(\/\/ window\.MAPS_API_KEY will be set during build process)/,
    `$1\nwindow.MAPS_API_KEY = ${JSON.stringify(process.env.MAPS_API_KEY)};`
  );
  fs.writeFileSync(keyFilePath, content);
  console.log('MAPS_API_KEY injected successfully');
} else {
  console.warn('MAPS_API_KEY environment variable not found - API key will not be available');
}
