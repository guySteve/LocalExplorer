#!/usr/bin/env node

/**
 * Netlify Build Plugin to inject environment variables into client-side code
 * This runs during the Netlify build process to replace placeholders with actual API keys
 */

const fs = require('fs');
const path = require('path');

try {
  // Read the key.js file
  const keyFilePath = path.join(__dirname, '..', 'key.js');
  
  // Check if file exists before reading
  if (!fs.existsSync(keyFilePath)) {
    console.warn(`Warning: ${keyFilePath} not found. Skipping environment injection.`);
    process.exit(0);
  }
  
  let content = fs.readFileSync(keyFilePath, 'utf8');

  // Inject MAPS_API_KEY if available
  if (process.env.MAPS_API_KEY) {
    console.log('Injecting MAPS_API_KEY into client code...');
    // Find the comment line and add the API key assignment after it
    // Using JSON.stringify to safely escape special characters
    content = content.replace(
      /(\/\/ window\.MAPS_API_KEY will be set during build process)(?:\nwindow\.MAPS_API_KEY\s*=\s*.*?;)?/,
      `$1\nwindow.MAPS_API_KEY = ${JSON.stringify(process.env.MAPS_API_KEY)};`
    );
    fs.writeFileSync(keyFilePath, content);
    console.log('MAPS_API_KEY injected successfully');
  } else {
    console.warn('MAPS_API_KEY environment variable not found - API key will not be available');
  }
  
  // Exit successfully
  process.exit(0);
} catch (error) {
  // Log error but don't fail the build
  console.error('Error during environment injection:', error.message);
  console.warn('Continuing build without environment injection...');
  process.exit(0);
}
