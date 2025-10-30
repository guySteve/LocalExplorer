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
  content = content.replace(
    /window\.MAPS_API_KEY = window\.MAPS_API_KEY \|\| 'YOUR_GOOGLE_MAPS_API_KEY_HERE';/,
    `window.MAPS_API_KEY = '${process.env.MAPS_API_KEY}';`
  );
  fs.writeFileSync(keyFilePath, content);
  console.log('MAPS_API_KEY injected successfully');
} else {
  console.warn('MAPS_API_KEY environment variable not found - using placeholder');
}
